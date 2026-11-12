import type { Budget, Category, DB, Transaction } from './types';
import { monthOf, percent, shiftMonth, todayISO } from './format';

export interface MonthTotals {
  income: number;
  expense: number;
  net: number;
  count: number;
  incomeCount: number;
  expenseCount: number;
}

export function totalsFor(txs: Transaction[]): MonthTotals {
  let income = 0;
  let expense = 0;
  let incomeCount = 0;
  let expenseCount = 0;
  for (const t of txs) {
    if (t.type === 'income') {
      income += t.amount;
      incomeCount += 1;
    } else if (t.type === 'expense') {
      expense += t.amount;
      expenseCount += 1;
    }
  }
  return {
    income,
    expense,
    net: income - expense,
    count: incomeCount + expenseCount,
    incomeCount,
    expenseCount,
  };
}

export function monthTransactions(txs: Transaction[], month: string): Transaction[] {
  return txs.filter((t) => monthOf(t.date) === month);
}

export interface CategorySpend {
  category: Category;
  total: number;
  share: number;
}

export function categorySpend(
  txs: Transaction[],
  categories: Category[],
  month: string,
  type: 'expense' | 'income',
): CategorySpend[] {
  const scoped = monthTransactions(txs, month).filter((t) => t.type === type);
  const total = scoped.reduce((sum, t) => sum + t.amount, 0);
  const map = new Map<string, number>();
  for (const t of scoped) {
    if (!t.categoryId) continue;
    map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + t.amount);
  }
  return [...map.entries()]
    .map(([id, value]) => {
      const category = categories.find((c) => c.id === id);
      if (!category) return null;
      return { category, total: value, share: percent(value, total) };
    })
    .filter((v): v is CategorySpend => Boolean(v))
    .sort((a, b) => b.total - a.total);
}

export interface TrendPoint {
  month: string;
  income: number;
  expense: number;
}

export function trendSeries(txs: Transaction[], months: string[]): TrendPoint[] {
  return months.map((month) => {
    const totals = totalsFor(monthTransactions(txs, month));
    return { month, income: totals.income, expense: totals.expense };
  });
}

export type BudgetState = 'safe' | 'warn' | 'over';

export interface BudgetRow {
  budget: Budget;
  category: Category;
  spent: number;
  remaining: number;
  progress: number;
  state: BudgetState;
}

export function budgetStateFor(progress: number): BudgetState {
  if (progress >= 100) return 'over';
  if (progress >= 80) return 'warn';
  return 'safe';
}

export function budgetRows(db: DB, userId: string, month: string): BudgetRow[] {
  const txs = db.transactions.filter((t) => t.userId === userId && t.type === 'expense');
  const rows: BudgetRow[] = [];
  for (const budget of db.budgets) {
    if (budget.userId !== userId || budget.month !== month) continue;
    const category = db.categories.find((c) => c.id === budget.categoryId);
    if (!category) continue;
    const spent = txs
      .filter((t) => t.categoryId === budget.categoryId && monthOf(t.date) === month)
      .reduce((sum, t) => sum + t.amount, 0);
    const progress = budget.limit > 0 ? Math.round((spent / budget.limit) * 100) : 0;
    rows.push({
      budget,
      category,
      spent,
      remaining: budget.limit - spent,
      progress,
      state: budgetStateFor(progress),
    });
  }
  return rows.sort((a, b) => b.progress - a.progress);
}

export function budgetTotals(rows: BudgetRow[]) {
  const limit = rows.reduce((sum, r) => sum + r.budget.limit, 0);
  const spent = rows.reduce((sum, r) => sum + r.spent, 0);
  return {
    limit,
    spent,
    remaining: limit - spent,
    progress: limit > 0 ? Math.round((spent / limit) * 100) : 0,
  };
}

export function monthProgress(month: string): number {
  const today = todayISO();
  if (monthOf(today) !== month) return month < monthOf(today) ? 100 : 0;
  const [y, m] = month.split('-').map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Math.round((Number(today.slice(8, 10)) / days) * 100);
}

export function monthDayOf(date: string): number {
  return Number(date.slice(8, 10));
}

export function daysLeft(month: string): number {
  const today = todayISO();
  if (month !== today.slice(0, 7)) return 0;
  const [y, m] = month.split('-').map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Math.max(0, days - Number(today.slice(8, 10)));
}

export interface Insight {
  id: string;
  tone: 'warn' | 'info';
  title: string;
  body: string;
}

export function insightsFor(db: DB, userId: string, month: string): Insight[] {
  const rows = budgetRows(db, userId, month);
  const txs = db.transactions.filter((t) => t.userId === userId);
  const current = totalsFor(monthTransactions(txs, month));
  const previous = totalsFor(monthTransactions(txs, shiftMonth(month, -1)));
  const out: Insight[] = [];

  const hot = rows.find((r) => r.state !== 'safe');
  if (hot) {
    const left = daysLeft(month);
    out.push({
      id: `budget-${hot.budget.id}`,
      tone: hot.state === 'over' ? 'warn' : 'info',
      title:
        hot.state === 'over'
          ? `Anggaran ${hot.category.name} terlampaui ${hot.progress - 100}%`
          : `Anggaran ${hot.category.name} sudah ${hot.progress}%`,
      body:
        hot.state === 'over'
          ? `Kelebihan Rp${Math.abs(hot.remaining).toLocaleString('id-ID')} dari batas. Sisa bulan ini bisa dipangkas dari kategori lain.`
          : `Sisa Rp${hot.remaining.toLocaleString('id-ID')}${left > 0 ? ` untuk ${left} hari lagi` : ''}.`,
    });
  }

  if (previous.expense > 0 && current.expense > 0) {
    const delta = Math.round(((current.expense - previous.expense) / previous.expense) * 100);
    if (delta >= 20 && out.length < 2) {
      out.push({
        id: 'rise',
        tone: 'info',
        title: `Pengeluaran naik ${delta}% dari bulan lalu`,
        body: `Bulan ini Rp${current.expense.toLocaleString('id-ID')}, bulan lalu Rp${previous.expense.toLocaleString('id-ID')}.`,
      });
    }
  }

  if (txs.length === 0 && out.length < 2) {
    out.push({
      id: 'empty',
      tone: 'info',
      title: 'Belum ada transaksi',
      body: 'Catat satu pengeluaran untuk mulai melihat ke mana uangmu pergi.',
    });
  }

  if (out.length === 0) {
    const top = categorySpend(txs, db.categories.filter((c) => c.userId === userId), month, 'expense')[0];
    if (top) {
      out.push({
        id: 'top',
        tone: 'info',
        title: `${top.category.name} jadi pengeluaran terbesar`,
        body: `Rp${top.total.toLocaleString('id-ID')}, sekitar ${top.share}% dari pengeluaran bulan ini.`,
      });
    }
  }

  return out.slice(0, 2);
}

export function walletTotal(db: DB, userId: string): number {
  let total = 0;
  for (const wallet of db.wallets) {
    if (wallet.userId !== userId) continue;
    total += walletBalanceOf(db, wallet.id);
  }
  return total;
}

export function walletBalanceOf(db: DB, walletId: string): number {
  const wallet = db.wallets.find((w) => w.id === walletId);
  if (!wallet) return 0;
  let total = wallet.initialBalance;
  for (const t of db.transactions) {
    if (t.walletId === wallet.id) {
      if (t.type === 'expense') total -= t.amount;
      if (t.type === 'income') total += t.amount;
      if (t.type === 'transfer') total -= t.amount;
    }
    if (t.toWalletId === wallet.id) total += t.amount;
  }
  return total;
}
