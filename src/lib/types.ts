export type TxType = 'expense' | 'income' | 'transfer';
export type WalletKind = 'cash' | 'bank' | 'ewallet';
export type ThemePref = 'light' | 'dark' | 'system';
export type CategoryType = 'expense' | 'income';

export type IconKey =
  | 'food'
  | 'transport'
  | 'home'
  | 'shopping'
  | 'health'
  | 'fun'
  | 'bill'
  | 'education'
  | 'salary'
  | 'bonus'
  | 'gift'
  | 'other';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  createdAt: string;
}

export interface Wallet {
  id: string;
  userId: string;
  name: string;
  kind: WalletKind;
  initialBalance: number;
  archived: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  type: CategoryType;
  icon: IconKey;
  isDefault: boolean;
  hidden: boolean;
}

export interface Transaction {
  id: string;
  userId: string;
  type: TxType;
  amount: number;
  date: string;
  categoryId: string | null;
  walletId: string;
  toWalletId: string | null;
  note: string;
  createdAt: string;
  source?: 'manual' | 'scan';
}

export interface Budget {
  id: string;
  userId: string;
  categoryId: string;
  month: string;
  limit: number;
}

export interface DB {
  version: 1;
  users: User[];
  sessionUserId: string | null;
  wallets: Wallet[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  theme: ThemePref;
}

export type Result = { ok: true } | { ok: false; error: string; field?: string };

export interface TxInput {
  type: 'expense' | 'income';
  amount: number;
  categoryId: string;
  walletId: string;
  date: string;
  note: string;
  source?: 'manual' | 'scan';
}
