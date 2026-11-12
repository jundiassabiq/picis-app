import type { Category, IconKey, Transaction, Wallet, DB } from './types';
import { hashPassword } from './hash';
import { shiftMonth, todayISO } from './format';

export const DEMO_EMAIL = 'demo@duitku.id';
export const DEMO_PASSWORD = 'duitku123';

export const DEFAULT_EXPENSE: Array<{ name: string; icon: IconKey }> = [
  { name: 'Makan & Minum', icon: 'food' },
  { name: 'Transportasi', icon: 'transport' },
  { name: 'Belanja', icon: 'shopping' },
  { name: 'Tagihan', icon: 'bill' },
  { name: 'Hiburan', icon: 'fun' },
  { name: 'Kesehatan', icon: 'health' },
  { name: 'Pendidikan', icon: 'education' },
  { name: 'Rumah', icon: 'home' },
  { name: 'Lainnya', icon: 'other' },
];

export const DEFAULT_INCOME: Array<{ name: string; icon: IconKey }> = [
  { name: 'Gaji', icon: 'salary' },
  { name: 'Bonus', icon: 'bonus' },
  { name: 'Freelance', icon: 'gift' },
  { name: 'Lainnya', icon: 'other' },
];

export function makeCategories(userId: string): Category[] {
  return [
    ...DEFAULT_EXPENSE.map((c, i) => ({
      id: `${userId}-exp-${i}`,
      userId,
      name: c.name,
      type: 'expense' as const,
      icon: c.icon,
      isDefault: true,
      hidden: false,
    })),
    ...DEFAULT_INCOME.map((c, i) => ({
      id: `${userId}-inc-${i}`,
      userId,
      name: c.name,
      type: 'income' as const,
      icon: c.icon,
      isDefault: true,
      hidden: false,
    })),
  ];
}

export function makeDefaultWallet(userId: string): Wallet {
  return {
    id: `${userId}-w-cash`,
    userId,
    name: 'Tunai',
    kind: 'cash',
    initialBalance: 0,
    archived: false,
    createdAt: new Date().toISOString(),
  };
}

/* Deterministic pseudo random so the demo data is identical on every reset. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round = (n: number, step = 500) => Math.round(n / step) * step;

interface SpendTemplate {
  category: string;
  min: number;
  max: number;
  notes: string[];
  chance: number;
}

const DAILY: SpendTemplate[] = [
  {
    category: 'Makan & Minum',
    min: 15000,
    max: 58000,
    chance: 0.96,
    notes: ['Nasi padang', 'Kopi susu', 'Sarapan bubur', 'Makan siang kantor', 'Bakso malang', 'Ayam geprek', 'Martabak', 'Gofood malam'],
  },
  {
    category: 'Transportasi',
    min: 8000,
    max: 42000,
    chance: 0.62,
    notes: ['Gojek ke kantor', 'Ojek online', 'Bensin motor', 'KRL', 'Parkir', 'Grab pulang'],
  },
  {
    category: 'Belanja',
    min: 45000,
    max: 380000,
    chance: 0.16,
    notes: ['Belanja bulanan', 'Skincare', 'Kaos baru', 'Alat tulis', 'Sabun dan sampo'],
  },
  {
    category: 'Hiburan',
    min: 35000,
    max: 165000,
    chance: 0.1,
    notes: ['Nonton bioskop', 'Langganan streaming', 'Main futsal', 'Konser kecil'],
  },
  {
    category: 'Kesehatan',
    min: 40000,
    max: 210000,
    chance: 0.035,
    notes: ['Vitamin', 'Klinik gigi', 'Obat batuk'],
  },
];

const MONTHLY_BILLS: Array<{ day: number; category: string; amount: number; note: string }> = [
  { day: 3, category: 'Tagihan', amount: 245000, note: 'Listrik PLN' },
  { day: 5, category: 'Tagihan', amount: 350000, note: 'Internet rumah' },
  { day: 8, category: 'Tagihan', amount: 65000, note: 'Pulsa dan data' },
  { day: 9, category: 'Rumah', amount: 180000, note: 'Gas dan air' },
];

function buildMonth(
  userId: string,
  wallets: Wallet[],
  byName: Map<string, Category>,
  month: string,
  lastDay: number,
  seed: number,
): Transaction[] {
  const rand = mulberry32(seed);
  const out: Transaction[] = [];
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
  const cash = wallets[0];
  const bank = wallets[1];
  const ewallet = wallets[2];

  const push = (
    type: 'expense' | 'income',
    day: number,
    amount: number,
    categoryName: string,
    note: string,
    walletId: string,
  ) => {
    const category = byName.get(categoryName);
    if (!category) return;
    out.push({
      id: `${userId}-${month}-${out.length}`,
      userId,
      type,
      amount: round(amount, 500),
      date: `${month}-${String(day).padStart(2, '0')}`,
      categoryId: category.id,
      walletId,
      toWalletId: null,
      note,
      createdAt: new Date().toISOString(),
      source: 'manual',
    });
  };

  const pushTransfer = (day: number, amount: number, from: string, to: string, note: string) => {
    out.push({
      id: `${userId}-${month}-${out.length}`,
      userId,
      type: 'transfer',
      amount: round(amount, 500),
      date: `${month}-${String(day).padStart(2, '0')}`,
      categoryId: null,
      walletId: from,
      toWalletId: to,
      note,
      createdAt: new Date().toISOString(),
    });
  };

  push('income', 1, 6500000, 'Gaji', 'Gaji bulanan', bank.id);
  if (lastDay > 9) push('income', 9, 1250000, 'Freelance', 'Desain feed kafe', bank.id);
  if (lastDay > 18) push('income', 18, 300000, 'Lainnya', 'Bagi hasil patungan', ewallet.id);

  for (const bill of MONTHLY_BILLS) {
    if (bill.day <= lastDay) push('expense', bill.day, bill.amount, bill.category, bill.note, bank.id);
  }

  /* Weekly cash and e-wallet top ups, so balances stay believable. */
  for (const day of [3, 10, 17, 24]) {
    if (day <= lastDay) pushTransfer(day, 250000, bank.id, cash.id, 'Tarik tunai ATM');
  }
  for (const day of [5, 12, 19, 26]) {
    if (day <= lastDay) pushTransfer(day, 350000, bank.id, ewallet.id, 'Isi saldo GoPay');
  }

  for (let day = 1; day <= lastDay; day += 1) {
    const weekday = new Date(`${month}-${String(day).padStart(2, '0')}T12:00:00+07:00`).getDay();
    const isWeekend = weekday === 0 || weekday === 6;

    for (const t of DAILY) {
      const chance = t.category === 'Hiburan' && isWeekend ? 0.22 : t.chance;
      if (rand() > chance) continue;
      const amount = round(t.min + rand() * (t.max - t.min));
      const wallet =
        amount >= 120000
          ? rand() > 0.35
            ? bank.id
            : ewallet.id
          : rand() > 0.45
            ? ewallet.id
            : cash.id;
      push('expense', day, amount, t.category, pick(t.notes), wallet);
    }
  }

  return out;
}

export function createSeed(): DB {
  const userId = 'u-demo';
  const wallets: Wallet[] = [
    {
      id: 'u-demo-w-cash',
      userId,
      name: 'Tunai',
      kind: 'cash',
      initialBalance: 250000,
      archived: false,
      createdAt: '2026-03-20T03:00:00.000Z',
    },
    {
      id: 'u-demo-w-bca',
      userId,
      name: 'BCA',
      kind: 'bank',
      initialBalance: 4500000,
      archived: false,
      createdAt: '2026-03-20T03:00:00.000Z',
    },
    {
      id: 'u-demo-w-gopay',
      userId,
      name: 'GoPay',
      kind: 'ewallet',
      initialBalance: 150000,
      archived: false,
      createdAt: '2026-03-20T03:00:00.000Z',
    },
  ];

  const categories = makeCategories(userId);
  const byName = new Map(categories.map((c) => [c.name, c]));

  const thisMonth = todayISO().slice(0, 7);
  const lastMonth = shiftMonth(thisMonth, -1);
  const dayOfMonth = Number(todayISO().slice(8, 10));

  const months: Array<{ month: string; lastDay: number }> = [];
  for (let back = 5; back >= 0; back -= 1) {
    const month = shiftMonth(thisMonth, -back);
    const [y, m] = month.split('-').map(Number);
    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
    months.push({ month, lastDay: back === 0 ? Math.max(dayOfMonth, 1) : daysInMonth });
  }

  const transactions: Transaction[] = months.flatMap((entry, index) =>
    buildMonth(userId, wallets, byName, entry.month, entry.lastDay, 20260501 + index * 7919),
  );

  /* Budget limits are derived from actual spend so the demo shows all three
     states (aman, hati-hati, melebihi) without inventing numbers. */
  const budgetPlan: Array<{ name: string; ratio: number }> = [
    { name: 'Makan & Minum', ratio: 0.87 },
    { name: 'Transportasi', ratio: 0.66 },
    { name: 'Belanja', ratio: 0.95 },
    { name: 'Tagihan', ratio: 0.98 },
    { name: 'Hiburan', ratio: 1.14 },
  ];

  const budgets = [thisMonth, lastMonth].flatMap((month, mi) =>
    budgetPlan.map((plan, pi) => {
      const category = byName.get(plan.name)!;
      const spent = transactions
        .filter((t) => t.type === 'expense' && t.categoryId === category.id && t.date.startsWith(month))
        .reduce((sum, t) => sum + t.amount, 0);
      const ratio = mi === 1 ? Math.min(plan.ratio + 0.06, 1.22) : plan.ratio;
      const limit = Math.max(100000, Math.round(spent / ratio / 50000) * 50000);
      return {
        id: `${userId}-bgt-${month}-${pi}`,
        userId,
        categoryId: category.id,
        month,
        limit,
      };
    }),
  );

  return {
    version: 1,
    users: [
      {
        id: userId,
        name: 'Rani Prameswari',
        email: DEMO_EMAIL,
        password: hashPassword(DEMO_PASSWORD),
        createdAt: '2026-03-20T03:00:00.000Z',
      },
    ],
    sessionUserId: null,
    wallets,
    categories,
    transactions,
    budgets,
    theme: 'system',
  };
}
