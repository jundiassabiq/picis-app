import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useDB, useUser } from '../lib/db';
import {
  budgetRows,
  budgetTotals,
  categorySpend,
  insightsFor,
  monthTransactions,
  monthProgress,
  totalsFor,
  trendSeries,
} from '../lib/derive';
import {
  currentMonth,
  monthLabel,
  monthsEnding,
  rupiah,
  rupiahCompact,
  shiftMonth,
} from '../lib/format';
import { Gauge, Progress, TrendBars } from '../components/charts';
import { TxRow } from '../components/TxRow';
import { useCountUp } from '../lib/useCountUp';
import { Button, EmptyState } from '../components/ui';
import { useQuickAdd } from '../components/quickadd';
import {
  CATEGORY_ICONS,
  IconAlert,
  IconArrowRight,
  IconInfo,
  IconPlus,
  IconQr,
  IconReceipt,
  IconSparkle,
  IconTarget,
} from '../components/icons';

export default function Dashboard() {
  const db = useDB();
  const user = useUser();
  const quick = useQuickAdd();
  const [params, setParams] = useSearchParams();
  const month = params.get('month') ?? currentMonth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 240);
    return () => window.clearTimeout(timer);
  }, []);

  const model = useMemo(() => {
    if (!user) return null;
    const txs = db.transactions.filter((t) => t.userId === user.id);
    const categories = db.categories.filter((c) => c.userId === user.id);
    const wallets = db.wallets.filter((w) => w.userId === user.id);
    const monthTxs = monthTransactions(txs, month).sort((a, b) =>
      b.date === a.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date),
    );
    const totals = totalsFor(monthTxs);
    const previous = totalsFor(monthTransactions(txs, shiftMonth(month, -1)));
    const budgets = budgetRows(db, user.id, month);
    const top = categorySpend(txs, categories, month, 'expense').slice(0, 3);
    const trend = trendSeries(txs, monthsEnding(month, 6));
    const insights = insightsFor(db, user.id, month);

    return {
      categories,
      wallets,
      totals,
      budgets,
      budgetSum: budgetTotals(budgets),
      top,
      trend,
      insight: insights[0] ?? null,
      recent: monthTxs.slice(0, 5),
      allCount: txs.length,
      delta:
        previous.expense > 0
          ? Math.round(((totals.expense - previous.expense) / previous.expense) * 100)
          : null,
    };
  }, [db, month, user]);

  const animatedNet = useCountUp(loading ? 0 : (model?.totals.net ?? 0));

  const setMonth = (next: string) => {
    const copy = new URLSearchParams(params);
    copy.set('month', next);
    setParams(copy, { replace: true });
  };

  if (!user || !model) return null;

  if (loading) {
    return (
      <div className="page">
        <div style={{ height: 40, marginBottom: 18 }} />
        <div className="card" aria-busy="true" aria-live="polite" style={{ minHeight: 260 }}>
          <span className="sr-only">Memuat ringkasan bulan ini</span>
          <div className="sk" style={{ height: 14, width: 90 }} />
          <div className="sk" style={{ height: 46, width: '62%', marginTop: 18 }} />
          <div className="sk" style={{ height: 12, width: '40%', marginTop: 18 }} />
          <div className="sk" style={{ height: 44, width: '100%', marginTop: 26 }} />
        </div>
        <div className="dash" style={{ marginTop: 16 }}>
          {[0, 1].map((i) => (
            <div className="card" key={i} aria-hidden="true">
              <div className="sk" style={{ height: 16, width: 110 }} />
              <div className="sk" style={{ height: 96, marginTop: 16 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (model.allCount === 0) {
    return (
      <div className="page">
        <div className="page__head">
          <div>
            <p className="eyebrow">Selamat datang, {user.name.split(' ')[0]}</p>
            <h1>Mulai dari satu catatan</h1>
            <p className="lede" style={{ marginTop: 8 }}>
              Belum ada transaksi. Catat pengeluaran pertama, lalu grafik dan anggaran ikut hidup.
            </p>
          </div>
        </div>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <EmptyState
            icon={<IconReceipt size={24} />}
            title="Belum ada transaksi"
            body="Cukup 10 detik. Isi jumlah, pilih kategori, lalu simpan."
            action={
              <div className="row" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
                <Button variant="primary" onClick={() => quick.open()}>
                  <IconPlus size={17} />
                  Catat pengeluaran pertama
                </Button>
                <Link className="btn btn--ghost" to="/scan">
                  <IconQr size={17} />
                  Scan QR struk
                </Link>
              </div>
            }
          />
        </div>
      </div>
    );
  }

  const budgetsUsed = model.budgetSum.progress;
  const progressMonth = monthProgress(month);
  const previousMonth = shiftMonth(month, -1);

  return (
    <div className="page">
      <div className="dash__greet">
        <div>
          <p className="eyebrow">{monthLabel(month)}</p>
          <h1>Uangmu bulan ini</h1>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <button
            type="button"
            className="chip"
            onClick={() => setMonth(previousMonth)}
            aria-label={`Lihat ${monthLabel(previousMonth)}`}
          >
            {monthLabel(previousMonth).slice(0, 3)}
          </button>
          <span className="chip is-active">{monthLabel(month).slice(0, 3)}</span>
          {month < currentMonth() ? (
            <button
              type="button"
              className="chip"
              onClick={() => setMonth(shiftMonth(month, 1))}
              aria-label={`Lihat ${monthLabel(shiftMonth(month, 1))}`}
            >
              {monthLabel(shiftMonth(month, 1)).slice(0, 3)}
            </button>
          ) : null}
        </div>
      </div>

      <div className="dash">
        <section className="hero dash__hero" aria-labelledby="saldo-title">
          <span className="hero__deco" aria-hidden="true" />
          <div className="hero__top">
            <div style={{ minWidth: 0 }}>
              <span className="hero__eyebrow">
                <IconSparkle size={11} aria-hidden="true" />
                {progressMonth < 100 ? `${100 - progressMonth}% bulan tersisa` : 'Bulan sudah lewat'}
              </span>
              <p className="hero__label" id="saldo-title">
                Sisa uang bulan ini
              </p>
              <p className="hero__amount num">
                {rupiah(animatedNet)}
                <small>masuk dikurangi keluar</small>
              </p>
            </div>
            {model.budgets.length > 0 ? (
              <span className="hero__gauge">
                <Gauge
                  value={budgetsUsed}
                  size={96}
                  label="anggaran"
                  progress="#ffffff"
                  track="rgba(255,255,255,0.26)"
                />
              </span>
            ) : null}
          </div>

          <div className="hero__meta">
            <span className="hero__pill">
              Masuk <b>{rupiahCompact(model.totals.income)}</b>
            </span>
            <span className="hero__pill">
              Keluar <b>{rupiahCompact(model.totals.expense)}</b>
            </span>
            <span className="hero__pill">
              <b>{model.totals.count}</b> catatan
            </span>
          </div>

          <div className="hero__actions">
            <Button variant="ink" onClick={() => quick.open()}>
              <IconPlus size={17} />
              Catat transaksi
            </Button>
            <Link className="btn hero__ghost" to="/scan">
              <IconQr size={17} />
              Scan struk
            </Link>
          </div>
        </section>

        <div className="dash__stats" role="list" aria-label="Ringkasan bulan ini">
          <div className="stat" role="listitem">
            <div className="stat__top">
              <span className="stat__label">Pemasukan</span>
              <span className="stat__ring stat__ring--teal" aria-hidden="true">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M12 19V5M6.6 10.4 12 5l5.4 5.4" />
                </svg>
              </span>
            </div>
            <p className="stat__value">{rupiah(model.totals.income)}</p>
            <p className="stat__foot">{model.totals.incomeCount} catatan masuk</p>
          </div>
          <div className="stat" role="listitem">
            <div className="stat__top">
              <span className="stat__label">Pengeluaran</span>
              <span className="stat__ring stat__ring--pink" aria-hidden="true">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M12 5v14M6.6 13.6 12 19l5.4-5.4" />
                </svg>
              </span>
            </div>
            <p className="stat__value">{rupiah(model.totals.expense)}</p>
            <p className="stat__foot">
              {model.delta === null
                ? 'Belum ada pembanding'
                : `${model.delta > 0 ? 'Naik' : 'Turun'} ${Math.abs(model.delta)}% dari bulan lalu`}
            </p>
          </div>
          <div className="stat" role="listitem">
            <div className="stat__top">
              <span className="stat__label">Anggaran terpakai</span>
              <span className="stat__ring stat__ring--butter" aria-hidden="true">
                <IconTarget size={15} />
              </span>
            </div>
            <p className="stat__value">
              {model.budgets.length > 0 ? `${budgetsUsed}%` : 'Belum diatur'}
            </p>
            <p className="stat__foot">
              {model.budgets.length > 0
                ? `${rupiah(model.budgetSum.spent)} dari ${rupiah(model.budgetSum.limit)}`
                : 'Atur batas per kategori'}
            </p>
          </div>
        </div>

        <section className="card dash__trend" aria-labelledby="trend-title">
          <div className="card__head">
            <h2 id="trend-title">Enam bulan terakhir</h2>
            {model.delta !== null ? (
              <span className={`trend__delta${model.delta <= 0 ? ' trend__delta--down' : ''}`}>
                {model.delta > 0 ? '+' : ''}
                {model.delta}%
              </span>
            ) : null}
          </div>
          <TrendBars points={model.trend} activeMonth={month} onPick={setMonth} />
        </section>

        <section className="card dash__top" aria-labelledby="top-title">
          <div className="card__head">
            <h2 id="top-title">Paling banyak keluar</h2>
            <Link to={`/transactions?month=${month}`} className="card__link">
              Semua
            </Link>
          </div>
          {model.top.length > 0 ? (
            <div className="lb">
              {model.top.map((item, index) => {
                const Icon = CATEGORY_ICONS[item.category.icon];
                return (
                  <Link
                    key={item.category.id}
                    to={`/transactions?month=${month}&cat=${item.category.id}`}
                    className={`lb__row lb__row--${index + 1}`}
                  >
                    <span className="lb__rank">#{index + 1}</span>
                    <span
                      className="avatar avatar--sm"
                      style={
                        index === 0
                          ? { background: 'rgba(255,255,255,0.92)', color: 'var(--pink)' }
                          : undefined
                      }
                      aria-hidden="true"
                    >
                      <Icon size={17} />
                    </span>
                    <span className="lb__cat">
                      <span className="lb__name">{item.category.name}</span>
                      <span className="lb__sub">{rupiah(item.total)}</span>
                    </span>
                    <span className="lb__pct">{item.share}%</span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="muted" style={{ fontSize: 13 }}>
              Belum ada pengeluaran di bulan ini.
            </p>
          )}
        </section>

        <section className="card dash__budget" aria-labelledby="budget-title">
          <div className="card__head">
            <h2 id="budget-title">Anggaran</h2>
            <Link to="/budgets" className="card__link">
              Atur
            </Link>
          </div>
          {model.budgets.length > 0 ? (
            <>
              {model.budgets.slice(0, 3).map((row) => (
                <Link className="budget-mini" to="/budgets" key={row.budget.id}>
                  <span className="budget-mini__name">
                    {row.category.name}
                    {row.state !== 'safe' ? (
                      <span className={`tag tag--${row.state === 'over' ? 'over' : 'warn'}`}>
                        {row.state === 'over' ? 'Melebihi' : 'Hati-hati'}
                      </span>
                    ) : null}
                  </span>
                  <span className="budget-mini__pct">{row.progress}%</span>
                  <span className="budget-mini__amount">
                    {rupiah(row.spent)} dari {rupiah(row.budget.limit)}
                  </span>
                  <Progress
                    value={row.progress}
                    state={row.state}
                    label={`Anggaran ${row.category.name} terpakai ${row.progress} persen`}
                  />
                </Link>
              ))}
              <Link to="/budgets" className="card__link" style={{ marginTop: 10, display: 'inline-flex' }}>
                Lihat semua anggaran
                <IconArrowRight size={14} />
              </Link>
            </>
          ) : (
            <EmptyState
              icon={<IconTarget size={22} />}
              title="Belum ada anggaran"
              body="Beri batas per kategori. Status aman, hati-hati, dan melebihi muncul otomatis."
              action={
                <Link to="/budgets" className="btn btn--cream btn--sm">
                  Atur anggaran
                </Link>
              }
            />
          )}
        </section>

        {model.insight ? (
          <section className="insight dash__insight" aria-labelledby="insight-title">
            <div className="insight__row">
              <span className="insight__icon" aria-hidden="true">
                {model.insight.tone === 'warn' ? <IconAlert size={17} /> : <IconInfo size={17} />}
              </span>
              <div>
                <h3 id="insight-title">{model.insight.title}</h3>
                <p style={{ marginTop: 3 }}>{model.insight.body}</p>
              </div>
            </div>
            <Link
              to={model.insight.tone === 'warn' ? '/budgets' : '/transactions'}
              className="card__link"
            >
              {model.insight.tone === 'warn' ? 'Buka anggaran' : 'Lihat transaksi'}
              <IconArrowRight size={13} />
            </Link>
          </section>
        ) : null}

        <section className="card dash__recent" aria-labelledby="recent-title">
          <div className="card__head">
            <h2 id="recent-title">Transaksi terbaru</h2>
            <Link to={`/transactions?month=${month}`} className="card__link">
              Lihat semua
            </Link>
          </div>
          {model.recent.length > 0 ? (
            <div className="list">
              {model.recent.map((tx) => (
                <TxRow
                  key={tx.id}
                  tx={tx}
                  categories={model.categories}
                  wallets={model.wallets}
                  compact
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<IconReceipt size={22} />}
              title="Bulan ini masih kosong"
              body={`Belum ada catatan di ${monthLabel(month)}.`}
              action={
                <Button variant="primary" size="sm" onClick={() => quick.open()}>
                  Catat sekarang
                </Button>
              }
            />
          )}
        </section>
      </div>
    </div>
  );
}
