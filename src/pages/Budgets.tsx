import { useEffect, useMemo, useState } from 'react';
import type { Budget } from '../lib/types';
import {
  addBudget,
  copyBudgets,
  deleteBudget,
  updateBudget,
  useDB,
  useUser,
} from '../lib/db';
import { budgetRows, budgetTotals, monthProgress } from '../lib/derive';
import {
  currentMonth,
  groupDigits,
  monthLabel,
  parseAmount,
  rupiah,
  shiftMonth,
} from '../lib/format';
import { Gauge, Progress } from '../components/charts';
import {
  Button,
  ConfirmSheet,
  EmptyState,
  Field,
  MonthBar,
  Sheet,
  useToast,
} from '../components/ui';
import {
  CATEGORY_ICONS,
  IconAlert,
  IconCheck,
  IconPencil,
  IconPlus,
  IconTarget,
  IconTrash,
} from '../components/icons';

export default function Budgets() {
  const db = useDB();
  const user = useUser();
  const toast = useToast();
  const [month, setMonth] = useState(currentMonth());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [deleting, setDeleting] = useState<Budget | null>(null);
  const [copyOpen, setCopyOpen] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [limitText, setLimitText] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 220);
    return () => window.clearTimeout(timer);
  }, []);

  const rows = useMemo(
    () => (user ? budgetRows(db, user.id, month) : []),
    [db, month, user],
  );
  const totals = budgetTotals(rows);
  const previousMonth = shiftMonth(month, -1);
  const previousRows = useMemo(
    () => (user ? budgetRows(db, user.id, previousMonth) : []),
    [db, previousMonth, user],
  );
  const available = useMemo(() => {
    if (!user) return [];
    const used = new Set(rows.map((row) => row.budget.categoryId));
    return db.categories.filter(
      (c) => c.userId === user.id && c.type === 'expense' && !c.hidden && !used.has(c.id),
    );
  }, [db.categories, rows, user]);

  const copyPreview = useMemo(() => {
    const used = new Set(rows.map((row) => row.budget.categoryId));
    return previousRows.filter((row) => !used.has(row.budget.categoryId) && !row.category.hidden);
  }, [previousRows, rows]);

  if (!user) return null;

  const openAdd = () => {
    setEditing(null);
    setCategoryId(available[0]?.id ?? '');
    setLimitText('');
    setError('');
    setSheetOpen(true);
  };

  const openEdit = (budget: Budget) => {
    setEditing(budget);
    setCategoryId(budget.categoryId);
    setLimitText(groupDigits(budget.limit));
    setError('');
    setSheetOpen(true);
  };

  const save = () => {
    const limit = parseAmount(limitText);
    const result = editing
      ? updateBudget(editing.id, limit)
      : addBudget({ categoryId, month, limit });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSheetOpen(false);
    toast({ message: editing ? 'Anggaran diperbarui.' : 'Anggaran disimpan.' });
  };

  const confirmDelete = () => {
    if (!deleting) return;
    deleteBudget(deleting.id);
    setDeleting(null);
    toast({ message: 'Anggaran dihapus. Transaksi tidak berubah.' });
  };

  const doCopy = () => {
    const result = copyBudgets(previousMonth, month);
    setCopyOpen(false);
    if (!result.ok) {
      toast({ message: result.error, tone: 'warn' });
      return;
    }
    toast({
      message: `${result.created} anggaran disalin${result.skipped ? `, ${result.skipped} dilewati` : ''}.`,
    });
  };

  const overCount = rows.filter((row) => row.state === 'over').length;
  const warnCount = rows.filter((row) => row.state === 'warn').length;

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1>Anggaran</h1>
          <p className="lede" style={{ marginTop: 6, fontSize: 13.5 }}>
            Batas belanja per kategori. Status mengikuti realisasi dibagi batas.
          </p>
        </div>
        <Button variant="primary" onClick={openAdd} disabled={available.length === 0 && !editing}>
          <IconPlus size={17} />
          Tambah anggaran
        </Button>
      </div>

      <div className="row" style={{ gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <MonthBar
            month={month}
            maxMonth={shiftMonth(currentMonth(), 1)}
            onChange={setMonth}
          />
        </div>
        <Button variant="ghost" onClick={() => setCopyOpen(true)} disabled={previousRows.length === 0}>
          <IconTarget size={17} />
          Salin dari bulan lalu
        </Button>
      </div>

      {loading ? (
        <div className="card" aria-busy="true" aria-live="polite" style={{ minHeight: 180 }}>
          <span className="sr-only">Memuat anggaran</span>
          <div className="sk" style={{ height: 16, width: 120 }} />
          <div className="sk" style={{ height: 38, width: 190, marginTop: 14 }} />
          <div className="sk" style={{ height: 10, marginTop: 18 }} />
        </div>
      ) : (
        <>
          <section className="budget-summary" aria-labelledby="budget-total">
            <div className="budget-summary__row">
              <div>
                <p className="budget-summary__label">Total anggaran {monthLabel(month)}</p>
                <p className="budget-summary__big" id="budget-total">
                  {rupiah(totals.limit)}
                </p>
                <p className="budget-summary__label" style={{ marginTop: 8 }}>
                  {rows.length} kategori dianggarkan · {monthProgress(month)}% bulan berjalan
                </p>
              </div>
              <Gauge
                value={totals.progress}
                size={94}
                label="terpakai"
                progress="var(--butter)"
                track="rgba(255,255,255,0.16)"
              />            </div>
            <Progress value={totals.progress} state={totals.progress >= 100 ? 'over' : totals.progress >= 80 ? 'warn' : 'safe'} label="Total anggaran terpakai" />
            <div className="budget-summary__foot">
              <span>Terpakai {rupiah(totals.spent)}</span>
              <span>Sisa {rupiah(totals.remaining)}</span>
            </div>
          </section>

          {overCount > 0 || warnCount > 0 ? (
            <div className="alert alert--butter" style={{ marginTop: 14 }}>
              <IconAlert size={16} />
              {overCount > 0
                ? `${overCount} kategori melebihi batas${warnCount > 0 ? ` dan ${warnCount} mendekati batas` : ''}.`
                : `${warnCount} kategori sudah lewat 80% dari batas.`}
            </div>
          ) : null}

          {rows.length === 0 ? (
            <div style={{ marginTop: 16 }}>
              <EmptyState
                icon={<IconTarget size={24} />}
                title={`Belum ada anggaran ${monthLabel(month)}`}
                body="Pilih kategori pengeluaran, isi batas bulanan, lalu statusnya dihitung otomatis dari transaksi."
                action={
                  <div className="row" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
                    <Button variant="primary" onClick={openAdd}>
                      Tambah anggaran
                    </Button>
                    {previousRows.length > 0 ? (
                      <Button variant="ghost" onClick={() => setCopyOpen(true)}>
                        Salin dari {monthLabel(previousMonth)}
                      </Button>
                    ) : null}
                  </div>
                }
              />
            </div>
          ) : (
            <div className="budget-grid" style={{ marginTop: 16 }}>
              {rows.map((row) => {
                const Icon = CATEGORY_ICONS[row.category.icon];
                const stateLabel =
                  row.state === 'over' ? 'Melebihi' : row.state === 'warn' ? 'Hati-hati' : 'Aman';
                return (
                  <article className="budget-card" key={row.budget.id}>
                    <div className="budget-card__top">
                      <span className="tx-row__icon tx-row__icon--expense">
                        <Icon size={19} />
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <p className="budget-card__name truncate">{row.category.name}</p>
                        <p className="budget-card__sub">
                          {rupiah(row.spent)} dari {rupiah(row.budget.limit)}
                        </p>
                      </div>
                      <div className="row" style={{ gap: 0 }}>
                        <button
                          type="button"
                          className="icon-btn icon-btn--plain"
                          aria-label={`Ubah anggaran ${row.category.name}`}
                          onClick={() => openEdit(row.budget)}
                        >
                          <IconPencil size={17} />
                        </button>
                        <button
                          type="button"
                          className="icon-btn icon-btn--plain"
                          aria-label={`Hapus anggaran ${row.category.name}`}
                          onClick={() => setDeleting(row.budget)}
                        >
                          <IconTrash size={17} />
                        </button>
                      </div>
                    </div>
                    <Progress
                      value={row.progress}
                      state={row.state}
                      label={`Anggaran ${row.category.name} terpakai ${row.progress} persen`}
                    />
                    <div className="budget-card__nums">
                      <span>
                        {row.remaining < 0 ? 'Lebih' : 'Sisa'}{' '}
                        <b style={row.remaining < 0 ? { color: 'var(--expense)' } : undefined}>
                          {rupiah(Math.abs(row.remaining))}
                        </b>
                      </span>
                      <span className={`tag tag--${row.state === 'safe' ? 'safe' : row.state === 'warn' ? 'warn' : 'over'}`}>
                        {stateLabel} · {row.progress}%
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editing ? 'Ubah anggaran' : 'Tambah anggaran'}
        eyebrow={monthLabel(month)}
        footer={
          <>
            <Button variant="quiet" onClick={() => setSheetOpen(false)}>
              Batal
            </Button>
            <Button variant="primary" onClick={save}>
              <IconCheck size={16} />
              Simpan
            </Button>
          </>
        }
      >
        {error ? (
          <div className="alert" role="alert">
            <IconAlert size={16} />
            {error}
          </div>
        ) : null}

        <Field label="Kategori pengeluaran" htmlFor="budget-cat">
          <div className="select-wrap">
            <select
              id="budget-cat"
              className="input"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              disabled={Boolean(editing)}
              data-autofocus
            >
              {editing ? (
                <option value={editing.categoryId}>
                  {rows.find((row) => row.budget.id === editing.id)?.category.name}
                </option>
              ) : null}
              {available.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
              {available.length === 0 && !editing ? <option value="">Semua kategori sudah dianggarkan</option> : null}
            </select>
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
              <path d="m5.6 9.4 6.4 6.2 6.4-6.2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </Field>

        <Field
          label="Batas bulanan"
          htmlFor="budget-limit"
          hint="Transaksi di kategori ini yang menentukan status."
        >
          <input
            id="budget-limit"
            className="input input--num"
            inputMode="numeric"
            placeholder="Rp0"
            value={limitText ? `Rp${limitText}` : ''}
            onChange={(event) => {
              const digits = event.target.value.replace(/[^\d]/g, '').slice(0, 12);
              setLimitText(digits ? groupDigits(Number(digits)) : '');
              setError('');
            }}
          />
        </Field>

        {!editing && available.length === 0 ? (
          <div className="alert alert--teal">
            <IconCheck size={16} />
            Semua kategori pengeluaran sudah punya anggaran bulan ini.
          </div>
        ) : null}
      </Sheet>

      <Sheet
        open={copyOpen}
        onClose={() => setCopyOpen(false)}
        title="Salin anggaran"
        eyebrow={`${monthLabel(previousMonth)} ke ${monthLabel(month)}`}
        footer={
          <>
            <Button variant="quiet" onClick={() => setCopyOpen(false)}>
              Batal
            </Button>
            <Button variant="primary" onClick={doCopy} disabled={copyPreview.length === 0}>
              Salin {copyPreview.length} anggaran
            </Button>
          </>
        }
      >
        {copyPreview.length === 0 ? (
          <div className="alert alert--teal">
            <IconCheck size={16} />
            Tidak ada yang perlu disalin. Kategori bulan lalu sudah dianggarkan atau disembunyikan.
          </div>
        ) : (
          <>
            <p className="lede" style={{ fontSize: 13 }}>
              Anggaran berikut akan dibuat untuk {monthLabel(month)}. Kategori yang sudah punya
              anggaran dilewati, tidak ditimpa.
            </p>
            <div className="list">
              {copyPreview.map((row) => (
                <div className="tx-row" key={row.budget.id} style={{ gridTemplateColumns: '40px 1fr auto' }}>
                  <span className="tx-row__icon tx-row__icon--expense">
                    {(() => {
                      const Icon = CATEGORY_ICONS[row.category.icon];
                      return <Icon size={18} />;
                    })()}
                  </span>
                  <span className="tx-row__main">
                    <span className="tx-row__title">{row.category.name}</span>
                    <span className="tx-row__meta">Bulan lalu terpakai {row.progress}%</span>
                  </span>
                  <span className="tx-row__amount">{rupiah(row.budget.limit)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </Sheet>

      <ConfirmSheet
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="Hapus anggaran?"
        body="Transaksi tetap utuh. Hanya batas dan status kategori ini yang dihapus untuk bulan terpilih."
        confirmLabel="Hapus anggaran"
      />
    </div>
  );
}
