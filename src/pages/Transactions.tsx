import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Transaction } from '../lib/types';
import { deleteTransaction, restoreTransaction, useDB, useUser } from '../lib/db';
import { downloadTransactionsCsv } from '../lib/csv';
import { currentMonth, dayLabel, monthLabel, rupiah } from '../lib/format';
import { TxRow } from '../components/TxRow';
import { TxSheet } from '../components/TxSheet';
import {
  Button,
  ConfirmSheet,
  EmptyState,
  Field,
  MonthBar,
  Sheet,
  useToast,
} from '../components/ui';
import { useQuickAdd } from '../components/quickadd';
import {
  CATEGORY_ICONS,
  IconCalendar,
  IconDownload,
  IconFilter,
  IconPlus,
  IconReceipt,
  IconSearch,
} from '../components/icons';

const PAGE_SIZE = 20;

export default function Transactions() {
  const db = useDB();
  const user = useUser();
  const quick = useQuickAdd();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);

  const month = params.get('month') ?? currentMonth();
  const q = params.get('q') ?? '';
  const type = params.get('type') ?? 'all';
  const cat = params.get('cat') ?? '';
  const wallet = params.get('wallet') ?? '';
  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';
  const page = Math.max(1, Number(params.get('page') ?? 1));

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 220);
    return () => window.clearTimeout(timer);
  }, []);

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!('page' in patch)) next.delete('page');
    setParams(next, { replace: true });
  };

  const model = useMemo(() => {
    if (!user) return null;
    const all = db.transactions.filter((t) => t.userId === user.id);
    const categories = db.categories.filter((c) => c.userId === user.id);
    const wallets = db.wallets.filter((w) => w.userId === user.id);
    const term = q.trim().toLowerCase();

    const scoped = all.filter((tx) => {
      if (!tx.date.startsWith(month)) return false;
      if (from && tx.date < from) return false;
      if (to && tx.date > to) return false;
      if (type !== 'all' && tx.type !== type) return false;
      if (cat && tx.categoryId !== cat) return false;
      if (wallet && tx.walletId !== wallet && tx.toWalletId !== wallet) return false;
      if (term) {
        const categoryName = categories.find((c) => c.id === tx.categoryId)?.name ?? '';
        const walletName = wallets.find((w) => w.id === tx.walletId)?.name ?? '';
        if (!`${tx.note} ${categoryName} ${walletName}`.toLowerCase().includes(term)) return false;
      }
      return true;
    });

    scoped.sort((a, b) =>
      b.date === a.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date),
    );

    const expense = scoped.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const income = scoped.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const pages = Math.max(1, Math.ceil(scoped.length / PAGE_SIZE));
    const current = Math.min(page, pages);

    return {
      categories,
      wallets,
      scoped,
      expense,
      income,
      pages,
      page: current,
      total: all.length,
      slice: scoped.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE),
      activeFilters:
        (type !== 'all' ? 1 : 0) + (cat ? 1 : 0) + (wallet ? 1 : 0) + (from ? 1 : 0) + (to ? 1 : 0),
    };
  }, [cat, db, from, month, page, q, to, type, user, wallet]);

  if (!user || !model) return null;

  /* Paginated rows regrouped so each page keeps its date headers. */
  const pageGroups: Array<{ date: string; items: Transaction[]; total: number }> = [];
  for (const tx of model.slice) {
    const last = pageGroups[pageGroups.length - 1];
    const signed = tx.type === 'expense' ? -tx.amount : tx.type === 'income' ? tx.amount : 0;
    if (last && last.date === tx.date) {
      last.items.push(tx);
      last.total += signed;
    } else {
      pageGroups.push({ date: tx.date, items: [tx], total: signed });
    }
  }

  const resetFilters = () => {
    const next = new URLSearchParams();
    next.set('month', month);
    setParams(next, { replace: true });
  };

  const exportCsv = () => {
    if (model.slice.length === 0) return;
    downloadTransactionsCsv(model.scoped, model.categories, model.wallets);
    toast({ message: 'CSV transaksi terunduh.' });
  };

  const confirmDelete = () => {
    if (!deleting) return;
    const removed = deleteTransaction(deleting.id);
    setDeleting(null);
    if (!removed) {
      toast({ message: 'Transaksi tidak ditemukan.', tone: 'warn' });
      return;
    }
    toast({
      message: 'Transaksi dihapus.',
      actionLabel: 'Urungkan',
      duration: 8000,
      onAction: () => {
        restoreTransaction(removed);
        toast({ message: 'Transaksi dikembalikan.' });
      },
    });
  };

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1>Transaksi</h1>
          <p className="lede" style={{ marginTop: 6, fontSize: 13.5 }}>
            {model.scoped.length} catatan di {monthLabel(month)}.
          </p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Button
            variant="cream"
            className="btn--compact-mobile"
            onClick={exportCsv}
            disabled={model.scoped.length === 0}
            aria-label="Ekspor CSV"
          >
            <IconDownload size={17} />
            <span className="btn__label">Ekspor CSV</span>
          </Button>
          <Button variant="primary" onClick={() => quick.open()}>
            <IconPlus size={17} />
            Catat
          </Button>
        </div>
      </div>

      <div className="tx-toolbar">
        <label className="search">
          <span className="sr-only">Cari transaksi berdasarkan catatan, kategori, atau dompet</span>
          <IconSearch size={18} />
          <input
            className="input"
            type="search"
            placeholder="Cari catatan"
            value={q}
            onChange={(event) => update({ q: event.target.value || null })}
          />
        </label>
        <Button variant="cream" onClick={() => setFilterOpen(true)}>
          <IconFilter size={17} />
          Filter
          {model.activeFilters > 0 ? (
            <span className="tag tag--over" style={{ marginLeft: 2 }}>
              {model.activeFilters}
            </span>
          ) : null}
        </Button>

        <div className="chip-row" role="group" aria-label="Filter tipe transaksi">
          {[
            { value: 'all', label: 'Semua' },
            { value: 'expense', label: 'Pengeluaran' },
            { value: 'income', label: 'Pemasukan' },
            { value: 'transfer', label: 'Transfer' },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              className="chip"
              aria-pressed={type === item.value}
              onClick={() => update({ type: item.value === 'all' ? null : item.value })}
            >
              {item.label}
            </button>
          ))}
          {model.activeFilters > 0 || q ? (
            <button type="button" className="chip chip--pink" onClick={resetFilters}>
              Reset filter
            </button>
          ) : null}
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <MonthBar
          month={month}
          maxMonth={currentMonth()}
          onChange={(next) => update({ month: next })}
        />
      </div>

      <div className="tx-total">
        <span>
          Pengeluaran <b>{rupiah(model.expense)}</b>
        </span>
        <span>
          Pemasukan <b>{rupiah(model.income)}</b>
        </span>
      </div>

      {loading ? (
        <div className="card" aria-busy="true" aria-live="polite" style={{ display: 'grid', gap: 12 }}>
          <span className="sr-only">Memuat daftar transaksi</span>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="row" style={{ gap: 12 }}>
              <div className="sk" style={{ width: 42, height: 42, borderRadius: 14 }} />
              <div className="grow" style={{ display: 'grid', gap: 6 }}>
                <div className="sk" style={{ height: 12, width: '48%' }} />
                <div className="sk" style={{ height: 10, width: '30%' }} />
              </div>
              <div className="sk" style={{ height: 12, width: 70 }} />
            </div>
          ))}
        </div>
      ) : model.total === 0 ? (
        <EmptyState
          icon={<IconReceipt size={24} />}
          title="Belum ada transaksi"
          body="Catat pengeluaran pertama, nanti daftar ini terisi sendiri."
          action={
            <Button variant="primary" onClick={() => quick.open()}>
              Catat transaksi pertama
            </Button>
          }
        />
      ) : model.scoped.length === 0 ? (
        <EmptyState
          icon={<IconSearch size={24} />}
          title="Tidak ada transaksi yang cocok"
          body="Coba kata kunci lain, atau longgarkan filter bulan dan tipe."
          action={
            <Button variant="cream" onClick={resetFilters}>
              Reset filter
            </Button>
          }
        />
      ) : (
        <>
          <div>
            {pageGroups.map((group) => (
              <section className="day-group" key={group.date} aria-label={dayLabel(group.date)}>
                <div className="day-group__label">
                  <span>{dayLabel(group.date)}</span>
                  <span className="day-group__total">
                    {group.total < 0 ? '-' : group.total > 0 ? '+' : ''}
                    {rupiah(Math.abs(group.total))}
                  </span>
                </div>
                <div className="list">
                  {group.items.map((tx) => (
                    <TxRow
                      key={tx.id}
                      tx={tx}
                      categories={model.categories}
                      wallets={model.wallets}
                      onEdit={setEditing}
                      onDelete={setDeleting}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>

          {model.pages > 1 ? (
            <div className="pager">
              <Button
                variant="quiet"
                size="sm"
                onClick={() => update({ page: String(model.page - 1) })}
                disabled={model.page <= 1}
              >
                Sebelumnya
              </Button>
              <span className="pager__info">
                {(model.page - 1) * PAGE_SIZE + 1}-{Math.min(model.page * PAGE_SIZE, model.scoped.length)} dari{' '}
                {model.scoped.length}
              </span>
              <Button
                variant="quiet"
                size="sm"
                onClick={() => update({ page: String(model.page + 1) })}
                disabled={model.page >= model.pages}
              >
                Berikutnya
              </Button>
            </div>
          ) : null}
        </>
      )}

      <Sheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        title="Filter transaksi"
        eyebrow="Persempit daftar"
        footer={
          <>
            <Button variant="quiet" onClick={resetFilters}>
              Reset
            </Button>
            <Button variant="primary" onClick={() => setFilterOpen(false)}>
              Tampilkan {model.scoped.length} catatan
            </Button>
          </>
        }
      >
        <Field label="Kategori" htmlFor="filter-cat">
          <div className="select-wrap">
            <select
              id="filter-cat"
              className="input"
              value={cat}
              onChange={(event) => update({ cat: event.target.value || null })}
            >
              <option value="">Semua kategori</option>
              {model.categories
                .filter((c) => !c.hidden)
                .map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
            </select>
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
              <path d="m5.6 9.4 6.4 6.2 6.4-6.2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </Field>

        <Field label="Dompet" htmlFor="filter-wallet">
          <div className="select-wrap">
            <select
              id="filter-wallet"
              className="input"
              value={wallet}
              onChange={(event) => update({ wallet: event.target.value || null })}
            >
              <option value="">Semua dompet</option>
              {model.wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                  {w.archived ? ' (arsip)' : ''}
                </option>
              ))}
            </select>
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
              <path d="m5.6 9.4 6.4 6.2 6.4-6.2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </Field>

        <div className="field-row">
          <Field label="Dari tanggal" htmlFor="filter-from" hint="Opsional, dalam bulan terpilih">
            <input
              id="filter-from"
              className="input"
              type="date"
              value={from}
              onChange={(event) => update({ from: event.target.value || null })}
            />
          </Field>
          <Field label="Sampai tanggal" htmlFor="filter-to" hint="Opsional">
            <input
              id="filter-to"
              className="input"
              type="date"
              value={to}
              onChange={(event) => update({ to: event.target.value || null })}
            />
          </Field>
        </div>

        <div className="alert alert--teal">
          <IconCalendar size={16} />
          Bulan aktif: {monthLabel(month)}. Filter ikut tersimpan di URL, jadi aman di-refresh.
        </div>

        {cat ? (
          <div className="row" style={{ gap: 8 }}>
            <span className="tag tag--line">
              {CATEGORY_ICONS[
                model.categories.find((c) => c.id === cat)?.icon ?? 'other'
              ]({ size: 13 })}
              {model.categories.find((c) => c.id === cat)?.name}
            </span>
          </div>
        ) : null}
      </Sheet>

      <TxSheet
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        editing={editing}
      />

      <ConfirmSheet
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="Hapus transaksi ini?"
        body={
          deleting ? (
            <>
              <strong>{rupiah(deleting.amount)}</strong> pada {dayLabel(deleting.date)}. Setelah
              dihapus, saldo dompet, dashboard, dan anggaran ikut menyesuaikan.
            </>
          ) : (
            ''
          )
        }
        confirmLabel="Hapus"
      />
    </div>
  );
}
