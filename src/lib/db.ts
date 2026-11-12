import { useSyncExternalStore } from 'react';
import type {
  Budget,
  Category,
  CategoryType,
  DB,
  IconKey,
  Result,
  ThemePref,
  Transaction,
  TxInput,
  User,
  Wallet,
  WalletKind,
} from './types';
import { createSeed, makeCategories, makeDefaultWallet } from './seed';
import { hashPassword } from './hash';
import { monthOf, todayISO } from './format';

const KEY = 'picis.v1';

function load(): DB {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return createSeed();
    const parsed = JSON.parse(raw) as DB;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.users)) return createSeed();
    return parsed;
  } catch {
    return createSeed();
  }
}

let db: DB = load();
let storageError = false;
const listeners = new Set<() => void>();

function commit(next: DB) {
  db = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
    storageError = false;
  } catch {
    // Full or blocked storage: the session keeps working in memory and the UI says so.
    storageError = true;
  }
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useStorageError(): boolean {
  return useSyncExternalStore(subscribe, () => storageError, () => storageError);
}

export function useDB(): DB {
  return useSyncExternalStore(subscribe, () => db, () => db);
}

export function getDB(): DB {
  return db;
}

export function currentUser(state: DB = db): User | null {
  return state.users.find((u) => u.id === state.sessionUserId) ?? null;
}

export function useUser(): User | null {
  const state = useDB();
  return currentUser(state);
}

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}

const MAX_AMOUNT = 1_000_000_000_000;

function validAmount(amount: number): Result {
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: 'Jumlah harus lebih dari 0.', field: 'amount' };
  }
  if (amount > MAX_AMOUNT) {
    return { ok: false, error: 'Jumlah terlalu besar.', field: 'amount' };
  }
  return { ok: true };
}

function validateTx(state: DB, userId: string, input: TxInput): Result {
  const amount = validAmount(input.amount);
  if (!amount.ok) return amount;

  const category = state.categories.find((c) => c.id === input.categoryId && c.userId === userId);
  if (!category) return { ok: false, error: 'Pilih kategori.', field: 'categoryId' };
  if (category.type !== input.type) {
    return { ok: false, error: 'Kategori tidak sesuai dengan tipe transaksi.', field: 'categoryId' };
  }
  const wallet = state.wallets.find((w) => w.id === input.walletId && w.userId === userId);
  if (!wallet || wallet.archived) {
    return { ok: false, error: 'Pilih dompet yang aktif.', field: 'walletId' };
  }
  const limit = new Date(Date.now() + 366 * 864e5).toISOString().slice(0, 10);
  if (input.date > limit) {
    return { ok: false, error: 'Tanggal terlalu jauh ke depan.', field: 'date' };
  }
  if (input.note.length > 200) {
    return { ok: false, error: 'Catatan maksimal 200 karakter.', field: 'note' };
  }
  return { ok: true };
}

/* Auth ------------------------------------------------------------------- */

let attempts: { count: number; until: number } = { count: 0, until: 0 };

export function login(email: string, password: string): Result {
  const now = Date.now();
  if (attempts.until > now) {
    return { ok: false, error: 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.' };
  }
  const clean = email.trim().toLowerCase();
  const user = db.users.find((u) => u.email.toLowerCase() === clean);
  if (!user || user.password !== hashPassword(password)) {
    attempts.count += 1;
    if (attempts.count >= 5) {
      attempts = { count: 0, until: now + 60_000 };
      return { ok: false, error: 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.' };
    }
    return { ok: false, error: 'Email atau password salah.' };
  }
  attempts = { count: 0, until: 0 };
  commit({ ...db, sessionUserId: user.id });
  return { ok: true };
}

export function register(name: string, email: string, password: string, confirm: string): Result {
  if (!name.trim()) return { ok: false, error: 'Nama wajib diisi.', field: 'name' };
  const mail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)) {
    return { ok: false, error: 'Format email tidak valid.', field: 'email' };
  }
  if (db.users.some((u) => u.email.toLowerCase() === mail)) {
    return { ok: false, error: 'Email sudah terdaftar.', field: 'email' };
  }
  if (password.length < 8) {
    return { ok: false, error: 'Password minimal 8 karakter.', field: 'password' };
  }
  if (password !== confirm) {
    return { ok: false, error: 'Konfirmasi password tidak cocok.', field: 'confirm' };
  }
  const id = uid('u');
  const user: User = {
    id,
    name: name.trim(),
    email: mail,
    password: hashPassword(password),
    createdAt: new Date().toISOString(),
  };
  commit({
    ...db,
    users: [...db.users, user],
    categories: [...db.categories, ...makeCategories(id)],
    wallets: [...db.wallets, makeDefaultWallet(id)],
    sessionUserId: id,
  });
  return { ok: true };
}

export function logout() {
  commit({ ...db, sessionUserId: null });
}

/* Transactions ----------------------------------------------------------- */

export function addTransaction(input: TxInput): Result {
  const user = currentUser();
  if (!user) return { ok: false, error: 'Sesimu sudah berakhir. Silakan masuk lagi.' };
  const check = validateTx(db, user.id, input);
  if (!check.ok) return check;
  const tx: Transaction = {
    id: uid('tx'),
    userId: user.id,
    type: input.type,
    amount: Math.round(input.amount),
    date: input.date,
    categoryId: input.categoryId,
    walletId: input.walletId,
    toWalletId: null,
    note: input.note.trim(),
    createdAt: new Date().toISOString(),
    source: input.source ?? 'manual',
  };
  commit({ ...db, transactions: [tx, ...db.transactions] });
  return { ok: true };
}

export function updateTransaction(id: string, input: TxInput): Result {
  const user = currentUser();
  if (!user) return { ok: false, error: 'Sesimu sudah berakhir. Silakan masuk lagi.' };
  const existing = db.transactions.find((t) => t.id === id && t.userId === user.id);
  if (!existing || existing.type === 'transfer') {
    return { ok: false, error: 'Transaksi tidak ditemukan.' };
  }
  const check = validateTx(db, user.id, input);
  if (!check.ok) return check;
  commit({
    ...db,
    transactions: db.transactions.map((t) =>
      t.id === id
        ? {
            ...t,
            type: input.type,
            amount: Math.round(input.amount),
            date: input.date,
            categoryId: input.categoryId,
            walletId: input.walletId,
            note: input.note.trim(),
            source: input.source ?? t.source,
          }
        : t,
    ),
  });
  return { ok: true };
}

export function deleteTransaction(id: string): Transaction | null {
  const user = currentUser();
  if (!user) return null;
  const found = db.transactions.find((t) => t.id === id && t.userId === user.id);
  if (!found) return null;
  commit({ ...db, transactions: db.transactions.filter((t) => t.id !== id) });
  return found;
}

export function restoreTransaction(tx: Transaction) {
  if (db.transactions.some((t) => t.id === tx.id)) return;
  commit({ ...db, transactions: [tx, ...db.transactions] });
}

/* Theme ------------------------------------------------------------------ */

export function setTheme(theme: ThemePref) {
  commit({ ...db, theme });
}

/* Wallets ---------------------------------------------------------------- */

export function addWallet(input: { name: string; kind: WalletKind; initialBalance: number }): Result {
  const user = currentUser();
  if (!user) return { ok: false, error: 'Sesimu sudah berakhir. Silakan masuk lagi.' };
  const name = input.name.trim();
  if (!name) return { ok: false, error: 'Nama dompet wajib diisi.', field: 'name' };
  if (db.wallets.some((w) => w.userId === user.id && w.name.toLowerCase() === name.toLowerCase())) {
    return { ok: false, error: 'Nama dompet sudah dipakai.', field: 'name' };
  }
  const amount = validAmount(input.initialBalance || 0);
  if (!amount.ok && input.initialBalance < 0) {
    return { ok: false, error: 'Saldo awal tidak boleh minus.', field: 'initialBalance' };
  }
  const wallet: Wallet = {
    id: uid('w'),
    userId: user.id,
    name,
    kind: input.kind,
    initialBalance: Math.round(input.initialBalance || 0),
    archived: false,
    createdAt: new Date().toISOString(),
  };
  commit({ ...db, wallets: [...db.wallets, wallet] });
  return { ok: true };
}

export function updateWallet(id: string, input: { name: string; kind: WalletKind; initialBalance: number }): Result {
  const user = currentUser();
  if (!user) return { ok: false, error: 'Sesimu sudah berakhir. Silakan masuk lagi.' };
  const wallet = db.wallets.find((w) => w.id === id && w.userId === user.id);
  if (!wallet) return { ok: false, error: 'Data tidak ditemukan.' };
  const name = input.name.trim();
  if (!name) return { ok: false, error: 'Nama dompet wajib diisi.', field: 'name' };
  if (
    db.wallets.some(
      (w) => w.userId === user.id && w.id !== id && w.name.toLowerCase() === name.toLowerCase(),
    )
  ) {
    return { ok: false, error: 'Nama dompet sudah dipakai.', field: 'name' };
  }
  commit({
    ...db,
    wallets: db.wallets.map((w) =>
      w.id === id
        ? { ...w, name, kind: input.kind, initialBalance: Math.round(input.initialBalance || 0) }
        : w,
    ),
  });
  return { ok: true };
}

export function setWalletArchived(id: string, archived: boolean): Result {
  const user = currentUser();
  if (!user) return { ok: false, error: 'Sesimu sudah berakhir. Silakan masuk lagi.' };
  const active = db.wallets.filter((w) => w.userId === user.id && !w.archived);
  if (archived && active.length <= 1) {
    return { ok: false, error: 'Minimal harus ada satu dompet aktif.' };
  }
  commit({
    ...db,
    wallets: db.wallets.map((w) => (w.id === id && w.userId === user.id ? { ...w, archived } : w)),
  });
  return { ok: true };
}

export function deleteWallet(id: string): Result {
  const user = currentUser();
  if (!user) return { ok: false, error: 'Sesimu sudah berakhir. Silakan masuk lagi.' };
  const used = db.transactions.some(
    (t) => t.userId === user.id && (t.walletId === id || t.toWalletId === id),
  );
  if (used) return { ok: false, error: 'Dompet yang punya transaksi hanya bisa diarsipkan.' };
  commit({ ...db, wallets: db.wallets.filter((w) => !(w.id === id && w.userId === user.id)) });
  return { ok: true };
}

export function transfer(input: {
  fromId: string;
  toId: string;
  amount: number;
  date: string;
  note: string;
}): Result {
  const user = currentUser();
  if (!user) return { ok: false, error: 'Sesimu sudah berakhir. Silakan masuk lagi.' };
  if (input.fromId === input.toId) {
    return { ok: false, error: 'Dompet asal dan tujuan harus berbeda.', field: 'toId' };
  }
  const amount = validAmount(input.amount);
  if (!amount.ok) return amount;
  const from = db.wallets.find((w) => w.id === input.fromId && w.userId === user.id);
  const to = db.wallets.find((w) => w.id === input.toId && w.userId === user.id);
  if (!from || !to || from.archived || to.archived) {
    return { ok: false, error: 'Pilih dompet yang aktif.', field: 'fromId' };
  }
  if (walletBalance(db, from) < input.amount) {
    return { ok: false, error: 'Saldo dompet asal tidak cukup.', field: 'amount' };
  }
  const tx: Transaction = {
    id: uid('tr'),
    userId: user.id,
    type: 'transfer',
    amount: Math.round(input.amount),
    date: input.date,
    categoryId: null,
    walletId: input.fromId,
    toWalletId: input.toId,
    note: input.note.trim(),
    createdAt: new Date().toISOString(),
  };
  commit({ ...db, transactions: [tx, ...db.transactions] });
  return { ok: true };
}

export function walletBalance(state: DB, wallet: Wallet): number {
  let total = wallet.initialBalance;
  for (const t of state.transactions) {
    if (t.userId !== wallet.userId) continue;
    if (t.type === 'income' && t.walletId === wallet.id) total += t.amount;
    if (t.type === 'expense' && t.walletId === wallet.id) total -= t.amount;
    if (t.type === 'transfer') {
      if (t.walletId === wallet.id) total -= t.amount;
      if (t.toWalletId === wallet.id) total += t.amount;
    }
  }
  return total;
}

/* Categories ------------------------------------------------------------- */

export function addCategory(input: { name: string; type: CategoryType; icon: IconKey }): Result {
  const user = currentUser();
  if (!user) return { ok: false, error: 'Sesimu sudah berakhir. Silakan masuk lagi.' };
  const name = input.name.trim();
  if (!name) return { ok: false, error: 'Nama kategori wajib diisi.', field: 'name' };
  if (name.length > 30) return { ok: false, error: 'Nama kategori maksimal 30 karakter.', field: 'name' };
  if (
    db.categories.some(
      (c) => c.userId === user.id && c.type === input.type && c.name.toLowerCase() === name.toLowerCase(),
    )
  ) {
    return { ok: false, error: 'Nama kategori sudah dipakai.', field: 'name' };
  }
  const category: Category = {
    id: uid('cat'),
    userId: user.id,
    name,
    type: input.type,
    icon: input.icon,
    isDefault: false,
    hidden: false,
  };
  commit({ ...db, categories: [...db.categories, category] });
  return { ok: true };
}

export function updateCategory(id: string, input: { name: string; icon: IconKey }): Result {
  const user = currentUser();
  if (!user) return { ok: false, error: 'Sesimu sudah berakhir. Silakan masuk lagi.' };
  const category = db.categories.find((c) => c.id === id && c.userId === user.id);
  if (!category) return { ok: false, error: 'Data tidak ditemukan.' };
  const name = input.name.trim();
  if (!name) return { ok: false, error: 'Nama kategori wajib diisi.', field: 'name' };
  if (category.isDefault) {
    return { ok: false, error: 'Kategori bawaan hanya bisa disembunyikan.' };
  }
  if (
    db.categories.some(
      (c) =>
        c.userId === user.id &&
        c.id !== id &&
        c.type === category.type &&
        c.name.toLowerCase() === name.toLowerCase(),
    )
  ) {
    return { ok: false, error: 'Nama kategori sudah dipakai.', field: 'name' };
  }
  commit({
    ...db,
    categories: db.categories.map((c) => (c.id === id ? { ...c, name, icon: input.icon } : c)),
  });
  return { ok: true };
}

export function setCategoryHidden(id: string, hidden: boolean) {
  commit({
    ...db,
    categories: db.categories.map((c) => (c.id === id ? { ...c, hidden } : c)),
  });
}

export function categoryUsage(id: string): number {
  return db.transactions.filter((t) => t.categoryId === id).length;
}

export function deleteCategory(id: string, moveToId: string | null): Result {
  const user = currentUser();
  if (!user) return { ok: false, error: 'Sesimu sudah berakhir. Silakan masuk lagi.' };
  const category = db.categories.find((c) => c.id === id && c.userId === user.id);
  if (!category) return { ok: false, error: 'Data tidak ditemukan.' };
  if (category.isDefault) {
    return { ok: false, error: 'Kategori bawaan hanya bisa disembunyikan.' };
  }
  const used = db.transactions.filter((t) => t.userId === user.id && t.categoryId === id);
  if (used.length > 0 && !moveToId) {
    return {
      ok: false,
      error: `Kategori ini dipakai ${used.length} transaksi. Pindahkan ke kategori lain.`,
      field: 'moveToId',
    };
  }
  if (moveToId) {
    const target = db.categories.find((c) => c.id === moveToId && c.userId === user.id);
    if (!target || target.type !== category.type) {
      return { ok: false, error: 'Kategori tujuan tidak sesuai.', field: 'moveToId' };
    }
  }
  commit({
    ...db,
    categories: db.categories.filter((c) => c.id !== id),
    transactions: db.transactions.map((t) =>
      t.categoryId === id ? { ...t, categoryId: moveToId } : t,
    ),
    budgets: db.budgets.filter((b) => b.categoryId !== id),
  });
  return { ok: true };
}

/* Budgets ---------------------------------------------------------------- */

export function addBudget(input: { categoryId: string; month: string; limit: number }): Result {
  const user = currentUser();
  if (!user) return { ok: false, error: 'Sesimu sudah berakhir. Silakan masuk lagi.' };
  const amount = validAmount(input.limit);
  if (!amount.ok) return { ok: false, error: 'Batas harus lebih dari 0.', field: 'limit' };
  const category = db.categories.find((c) => c.id === input.categoryId && c.userId === user.id);
  if (!category || category.type !== 'expense') {
    return { ok: false, error: 'Pilih kategori pengeluaran.', field: 'categoryId' };
  }
  if (
    db.budgets.some(
      (b) => b.userId === user.id && b.month === input.month && b.categoryId === input.categoryId,
    )
  ) {
    return { ok: false, error: 'Kategori ini sudah punya anggaran bulan ini.', field: 'categoryId' };
  }
  const budget: Budget = {
    id: uid('bgt'),
    userId: user.id,
    categoryId: input.categoryId,
    month: input.month,
    limit: Math.round(input.limit),
  };
  commit({ ...db, budgets: [...db.budgets, budget] });
  return { ok: true };
}

export function updateBudget(id: string, limit: number): Result {
  const user = currentUser();
  if (!user) return { ok: false, error: 'Sesimu sudah berakhir. Silakan masuk lagi.' };
  const amount = validAmount(limit);
  if (!amount.ok) return { ok: false, error: 'Batas harus lebih dari 0.', field: 'limit' };
  commit({
    ...db,
    budgets: db.budgets.map((b) => (b.id === id && b.userId === user.id ? { ...b, limit: Math.round(limit) } : b)),
  });
  return { ok: true };
}

export function deleteBudget(id: string) {
  commit({ ...db, budgets: db.budgets.filter((b) => b.id !== id) });
}

export function copyBudgets(fromMonth: string, toMonth: string): Result & { created?: number; skipped?: number } {
  const user = currentUser();
  if (!user) return { ok: false, error: 'Sesimu sudah berakhir. Silakan masuk lagi.' };
  const source = db.budgets.filter((b) => b.userId === user.id && b.month === fromMonth);
  if (source.length === 0) return { ok: false, error: `Bulan sebelumnya belum ada anggaran.` };
  const existing = new Set(
    db.budgets.filter((b) => b.userId === user.id && b.month === toMonth).map((b) => b.categoryId),
  );
  const usable = source.filter((b) => {
    const cat = db.categories.find((c) => c.id === b.categoryId);
    return cat && !cat.hidden && !existing.has(b.categoryId);
  });
  if (usable.length === 0) {
    return { ok: false, error: 'Semua kategori sudah punya anggaran bulan ini.' };
  }
  const created = usable.map<Budget>((b) => ({
    id: uid('bgt'),
    userId: user.id,
    categoryId: b.categoryId,
    month: toMonth,
    limit: b.limit,
  }));
  commit({ ...db, budgets: [...db.budgets, ...created] });
  return { ok: true, created: created.length, skipped: source.length - created.length };
}

/* Profile ---------------------------------------------------------------- */

export function updateProfile(name: string): Result {
  const user = currentUser();
  if (!user) return { ok: false, error: 'Sesimu sudah berakhir. Silakan masuk lagi.' };
  if (!name.trim()) return { ok: false, error: 'Nama wajib diisi.', field: 'name' };
  commit({
    ...db,
    users: db.users.map((u) => (u.id === user.id ? { ...u, name: name.trim() } : u)),
  });
  return { ok: true };
}

export function deleteAccount() {
  const user = currentUser();
  if (!user) return;
  commit({
    ...db,
    users: db.users.filter((u) => u.id !== user.id),
    wallets: db.wallets.filter((w) => w.userId !== user.id),
    categories: db.categories.filter((c) => c.userId !== user.id),
    transactions: db.transactions.filter((t) => t.userId !== user.id),
    budgets: db.budgets.filter((b) => b.userId !== user.id),
    sessionUserId: null,
  });
}

export function resetDemoData() {
  commit(createSeed());
}

export function monthTransactions(userId: string, month: string): Transaction[] {
  return db.transactions.filter((t) => t.userId === userId && monthOf(t.date) === month);
}

export function todayIs(): string {
  return todayISO();
}
