import { useEffect, useMemo, useState } from 'react';
import type { Wallet, WalletKind } from '../lib/types';
import {
  addWallet,
  deleteWallet,
  setWalletArchived,
  transfer,
  updateWallet,
  useDB,
  useUser,
} from '../lib/db';
import { walletBalanceOf, walletTotal } from '../lib/derive';
import { groupDigits, parseAmount, rupiah, todayISO } from '../lib/format';
import {
  Button,
  ConfirmSheet,
  EmptyState,
  Field,
  Sheet,
  useToast,
} from '../components/ui';
import {
  IconAlert,
  IconArchive,
  IconCheck,
  IconPencil,
  IconPlus,
  IconRestore,
  IconTransfer,
  IconWallet,
} from '../components/icons';

const KIND_LABEL: Record<WalletKind, string> = {
  cash: 'Tunai',
  bank: 'Bank',
  ewallet: 'E-wallet',
};

export default function Wallets() {
  const db = useDB();
  const user = useUser();
  const toast = useToast();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [editing, setEditing] = useState<Wallet | null>(null);
  const [deleting, setDeleting] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [kind, setKind] = useState<WalletKind>('cash');
  const [balanceText, setBalanceText] = useState('');
  const [formError, setFormError] = useState('');

  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [amountText, setAmountText] = useState('');
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');
  const [transferError, setTransferError] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 200);
    return () => window.clearTimeout(timer);
  }, []);

  const wallets = useMemo(
    () => (user ? db.wallets.filter((w) => w.userId === user.id) : []),
    [db.wallets, user],
  );
  const active = wallets.filter((w) => !w.archived);
  const total = user ? walletTotal(db, user.id) : 0;

  if (!user) return null;

  const openAdd = () => {
    setEditing(null);
    setName('');
    setKind('cash');
    setBalanceText('');
    setFormError('');
    setSheetOpen(true);
  };

  const openEdit = (wallet: Wallet) => {
    setEditing(wallet);
    setName(wallet.name);
    setKind(wallet.kind);
    setBalanceText(groupDigits(wallet.initialBalance));
    setFormError('');
    setSheetOpen(true);
  };

  const openTransfer = (wallet?: Wallet) => {
    const first = wallet?.id ?? active[0]?.id ?? '';
    setFromId(first);
    setToId(active.find((w) => w.id !== first)?.id ?? '');
    setAmountText('');
    setDate(todayISO());
    setNote('');
    setTransferError('');
    setTransferOpen(true);
  };

  const saveWallet = () => {
    const initialBalance = parseAmount(balanceText);
    const result = editing
      ? updateWallet(editing.id, { name, kind, initialBalance })
      : addWallet({ name, kind, initialBalance });
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    setSheetOpen(false);
    toast({ message: editing ? 'Dompet diperbarui.' : 'Dompet ditambahkan.' });
  };

  const toggleArchive = (wallet: Wallet) => {
    const result = setWalletArchived(wallet.id, !wallet.archived);
    if (!result.ok) {
      toast({ message: result.error, tone: 'warn' });
      return;
    }
    toast({ message: wallet.archived ? 'Dompet dipulihkan.' : 'Dompet diarsipkan.' });
  };

  const doTransfer = () => {
    const result = transfer({
      fromId,
      toId,
      amount: parseAmount(amountText),
      date,
      note,
    });
    if (!result.ok) {
      setTransferError(result.error);
      return;
    }
    setTransferOpen(false);
    toast({ message: 'Transfer berhasil. Saldo dua dompet diperbarui.' });
  };

  const removeWallet = () => {
    if (!deleting) return;
    const result = deleteWallet(deleting.id);
    setDeleting(null);
    if (!result.ok) {
      toast({ message: result.error, tone: 'warn' });
      return;
    }
    toast({ message: 'Dompet dihapus.' });
  };

  const transferTarget = db.wallets.find((w) => w.id === toId);

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1>Dompet</h1>
          <p className="lede" style={{ marginTop: 6, fontSize: 13.5 }}>
            Saldo dihitung dari saldo awal ditambah pemasukan, dikurangi pengeluaran, plus transfer.
          </p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Button variant="cream" onClick={() => openTransfer()} disabled={active.length < 2}>
            <IconTransfer size={17} />
            Transfer
          </Button>
          <Button variant="primary" onClick={openAdd}>
            <IconPlus size={17} />
            Tambah dompet
          </Button>
        </div>
      </div>

      <section className="wallet-total" aria-labelledby="wallet-total-title">
        <p style={{ fontSize: 12, fontWeight: 700, opacity: 0.82 }} id="wallet-total-title">
          Total saldo semua dompet
        </p>
        <p className="wallet-total__big">{rupiah(total)}</p>
        <div className="wallet-total__foot">
          <span>
            <IconWallet size={15} /> {active.length} dompet aktif
          </span>
          <span>
            {wallets.length - active.length > 0
              ? `${wallets.length - active.length} diarsipkan`
              : 'Semua dompet aktif'}
          </span>
        </div>
      </section>

      {loading ? (
        <div className="wallet-grid" style={{ marginTop: 16 }}>
          {[0, 1].map((i) => (
            <div className="card" key={i} aria-hidden="true" style={{ minHeight: 140 }}>
              <div className="sk" style={{ height: 14, width: 90 }} />
              <div className="sk" style={{ height: 30, width: 160, marginTop: 14 }} />
            </div>
          ))}
        </div>
      ) : wallets.length === 0 ? (
        <div style={{ marginTop: 16 }}>
          <EmptyState
            icon={<IconWallet size={24} />}
            title="Belum ada dompet"
            body="Buat dompet untuk tunai, rekening bank, atau e-wallet. Minimal satu dompet dibutuhkan untuk mencatat."
            action={
              <Button variant="primary" onClick={openAdd}>
                Tambah dompet
              </Button>
            }
          />
        </div>
      ) : (
        <div className="wallet-grid" style={{ marginTop: 16 }}>
          {wallets.map((wallet) => {
            const balance = walletBalanceOf(db, wallet.id);
            const count = db.transactions.filter(
              (t) => t.walletId === wallet.id || t.toWalletId === wallet.id,
            ).length;
            return (
              <article
                className={`wallet-card${wallet.archived ? ' wallet-card--archived' : ''}`}
                key={wallet.id}
              >
                <div className="wallet-card__top">
                  <span className={`tx-row__icon tx-row__icon--${wallet.kind === 'bank' ? 'income' : wallet.kind === 'ewallet' ? 'expense' : 'transfer'}`}>
                    <IconWallet size={19} />
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <p className="wallet-card__name truncate">{wallet.name}</p>
                    <p className="wallet-card__kind">{KIND_LABEL[wallet.kind]}</p>
                  </div>
                  <div className="row" style={{ gap: 0 }}>
                    <button
                      type="button"
                      className="icon-btn icon-btn--plain"
                      aria-label={`Ubah dompet ${wallet.name}`}
                      onClick={() => openEdit(wallet)}
                    >
                      <IconPencil size={17} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn icon-btn--plain"
                      aria-label={wallet.archived ? `Pulihkan dompet ${wallet.name}` : `Arsipkan dompet ${wallet.name}`}
                      onClick={() => toggleArchive(wallet)}
                    >
                      {wallet.archived ? <IconRestore size={17} /> : <IconArchive size={17} />}
                    </button>
                  </div>
                </div>

                <p className="wallet-card__balance" style={balance < 0 ? { color: 'var(--expense)' } : undefined}>
                  {rupiah(balance)}
                </p>

                <div className="wallet-card__meta">
                  <span>Saldo awal {rupiah(wallet.initialBalance)}</span>
                  <span aria-hidden="true">·</span>
                  <span>{count} transaksi</span>
                  {balance < 0 ? <span className="tag tag--over">Saldo minus</span> : null}
                  {wallet.archived ? <span className="tag tag--line">Diarsipkan</span> : null}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editing ? 'Ubah dompet' : 'Tambah dompet'}
        eyebrow={editing ? 'Perubahan memengaruhi saldo' : 'Sumber uang'}
        footer={
          <>
            <Button variant="quiet" onClick={() => setSheetOpen(false)}>
              Batal
            </Button>
            <Button variant="primary" onClick={saveWallet}>
              <IconCheck size={16} />
              Simpan
            </Button>
          </>
        }
      >
        {formError ? (
          <div className="alert" role="alert">
            <IconAlert size={16} />
            {formError}
          </div>
        ) : null}

        <Field label="Nama dompet" htmlFor="wallet-name">
          <input
            id="wallet-name"
            className="input"
            value={name}
            placeholder="Misal: BCA, GoPay, Dompet tunai"
            onChange={(event) => {
              setName(event.target.value);
              setFormError('');
            }}
            data-autofocus
          />
        </Field>

        <Field label="Jenis" htmlFor="wallet-kind">
          <div className="segmented segmented--block" role="group" aria-label="Jenis dompet">
            {(['cash', 'bank', 'ewallet'] as WalletKind[]).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={kind === value}
                onClick={() => setKind(value)}
              >
                {KIND_LABEL[value]}
              </button>
            ))}
          </div>
        </Field>

        <Field
          label="Saldo awal"
          htmlFor="wallet-balance"
          hint="Angka saat kamu mulai mencatat. Boleh 0."
        >
          <input
            id="wallet-balance"
            className="input input--num"
            inputMode="numeric"
            value={balanceText ? `Rp${balanceText}` : ''}
            placeholder="Rp0"
            onChange={(event) => {
              const digits = event.target.value.replace(/[^\d]/g, '').slice(0, 12);
              setBalanceText(digits ? groupDigits(Number(digits)) : '');
            }}
          />
        </Field>

        {editing ? (
          <div className="set-actions">
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                setSheetOpen(false);
                setDeleting(editing);
              }}
            >
              Hapus dompet ini
            </Button>
          </div>
        ) : null}
        {editing ? (
          <p className="field__count">
            Mengubah saldo awal ikut menggeser saldo saat ini dan tidak mengubah riwayat transaksi.
          </p>
        ) : null}
      </Sheet>

      <Sheet
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        title="Transfer antar dompet"
        eyebrow="Satu transaksi, dua saldo"
        footer={
          <>
            <Button variant="quiet" onClick={() => setTransferOpen(false)}>
              Batal
            </Button>
            <Button variant="primary" onClick={doTransfer}>
              <IconTransfer size={16} />
              Transfer
            </Button>
          </>
        }
      >
        {transferError ? (
          <div className="alert" role="alert">
            <IconAlert size={16} />
            {transferError}
          </div>
        ) : null}

        <div className="field-row">
          <Field label="Dari" htmlFor="transfer-from">
            <div className="select-wrap">
              <select
                id="transfer-from"
                className="input"
                value={fromId}
                onChange={(event) => setFromId(event.target.value)}
              >
                {active.map((wallet) => (
                  <option key={wallet.id} value={wallet.id}>
                    {wallet.name} · {rupiah(walletBalanceOf(db, wallet.id))}
                  </option>
                ))}
              </select>
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                <path d="m5.6 9.4 6.4 6.2 6.4-6.2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </Field>
          <Field label="Ke" htmlFor="transfer-to">
            <div className="select-wrap">
              <select
                id="transfer-to"
                className="input"
                value={toId}
                onChange={(event) => setToId(event.target.value)}
              >
                {active
                  .filter((wallet) => wallet.id !== fromId)
                  .map((wallet) => (
                    <option key={wallet.id} value={wallet.id}>
                      {wallet.name}
                    </option>
                  ))}
              </select>
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                <path d="m5.6 9.4 6.4 6.2 6.4-6.2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </Field>
        </div>

        <Field label="Jumlah" htmlFor="transfer-amount">
          <input
            id="transfer-amount"
            className="input input--num"
            inputMode="numeric"
            placeholder="Rp0"
            value={amountText ? `Rp${amountText}` : ''}
            onChange={(event) => {
              const digits = event.target.value.replace(/[^\d]/g, '').slice(0, 12);
              setAmountText(digits ? groupDigits(Number(digits)) : '');
              setTransferError('');
            }}
            data-autofocus
          />
        </Field>

        <Field label="Tanggal" htmlFor="transfer-date">
          <input
            id="transfer-date"
            className="input"
            type="date"
            value={date}
            max={todayISO()}
            onChange={(event) => setDate(event.target.value)}
          />
        </Field>

        <Field label="Catatan" htmlFor="transfer-note" hint="Opsional. Muncul di riwayat kedua dompet.">
          <input
            id="transfer-note"
            className="input"
            value={note}
            maxLength={200}
            placeholder="Misal: tarik tunai ATM"
            onChange={(event) => setNote(event.target.value)}
          />
        </Field>

        {transferTarget ? (
          <p className="field__count">
            Transfer tidak dihitung sebagai pemasukan atau pengeluaran, jadi laporan bulanan tetap bersih.
          </p>
        ) : null}
      </Sheet>

      <ConfirmSheet
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={removeWallet}
        title="Hapus dompet?"
        body={
          <>
            <strong>{deleting?.name}</strong> hanya bisa dihapus kalau belum punya transaksi. Kalau
            sudah dipakai, pakai arsipkan agar riwayatnya tetap utuh.
          </>
        }
        confirmLabel="Hapus dompet"
      />
    </div>
  );
}
