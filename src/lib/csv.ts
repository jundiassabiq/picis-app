import type { Category, DB, Transaction, Wallet } from './types';
import { todayISO } from './format';

const TYPE_LABEL: Record<string, string> = {
  expense: 'Pengeluaran',
  income: 'Pemasukan',
  transfer: 'Transfer',
};

function cell(value: string | number): string {
  const raw = String(value);
  // Neutralise spreadsheet formulas before Excel opens the file.
  const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function buildTransactionsCsv(
  txs: Transaction[],
  categories: Category[],
  wallets: Wallet[],
): string {
  const header = ['Tanggal', 'Tipe', 'Kategori', 'Dompet', 'Jumlah', 'Catatan'];
  const rows = txs.map((t) => {
    const category = categories.find((c) => c.id === t.categoryId);
    const wallet = wallets.find((w) => w.id === t.walletId);
    const target = wallets.find((w) => w.id === t.toWalletId);
    const walletLabel = t.type === 'transfer' && target ? `${wallet?.name ?? '?'} ke ${target.name}` : wallet?.name ?? '';
    return [
      t.date,
      TYPE_LABEL[t.type] ?? t.type,
      category?.name ?? 'Tanpa kategori',
      walletLabel,
      t.amount,
      t.note,
    ].map(cell).join(',');
  });
  return `\uFEFF${[header.map(cell).join(','), ...rows].join('\r\n')}`;
}

export function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function downloadTransactionsCsv(
  txs: Transaction[],
  categories: Category[],
  wallets: Wallet[],
) {
  download(
    `picis-transaksi-${todayISO()}.csv`,
    buildTransactionsCsv(txs, categories, wallets),
    'text/csv;charset=utf-8',
  );
}

export function downloadAllData(db: DB, userId: string) {
  const payload = {
    format: 'picis/data-v1',
    exportedAt: new Date().toISOString(),
    user: db.users.find((u) => u.id === userId) ?? null,
    wallets: db.wallets.filter((w) => w.userId === userId),
    categories: db.categories.filter((c) => c.userId === userId),
    transactions: db.transactions.filter((t) => t.userId === userId),
    budgets: db.budgets.filter((b) => b.userId === userId),
  };
  download(
    `picis-data-${todayISO()}.json`,
    JSON.stringify(payload, null, 2),
    'application/json;charset=utf-8',
  );
}
