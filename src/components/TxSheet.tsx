import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { Category, Transaction } from '../lib/types';
import { addTransaction, getDB, updateTransaction, useDB, useUser } from '../lib/db';
import { budgetRows } from '../lib/derive';
import { groupDigits, todayISO } from '../lib/format';import { Button, Field, Segmented, Sheet, useToast } from './ui';
import { CATEGORY_ICONS, IconAlert, IconQr } from './icons';
import type { QuickAddPrefill } from './quickadd';

type FieldError = Partial<Record<'amount' | 'categoryId' | 'walletId' | 'date' | 'note', string>>;

function levelOf(progress: number): number {
  if (progress >= 100) return 2;
  if (progress >= 80) return 1;
  return 0;
}

export function TxSheet({
  open,
  onClose,
  editing = null,
  prefill,
}: {
  open: boolean;
  onClose: () => void;
  editing?: Transaction | null;
  prefill?: QuickAddPrefill | null;
}) {
  const db = useDB();
  const user = useUser();
  const toast = useToast();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const uidStart = useId();
  const amountRef = useRef<HTMLInputElement>(null);

  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState<number>(0);
  const [amountText, setAmountText] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [walletId, setWalletId] = useState('');
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<FieldError>({});
  const [saving, setSaving] = useState(false);

  const wallets = useMemo(
    () => db.wallets.filter((w) => w.userId === user?.id && !w.archived),
    [db.wallets, user?.id],
  );
  const categories = useMemo(
    () =>
      db.categories.filter(
        (c) => c.userId === user?.id && c.type === type && !c.hidden,
      ) as Category[],
    [db.categories, type, user?.id],
  );

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setSaving(false);
    if (editing) {
      setType(editing.type === 'income' ? 'income' : 'expense');
      setAmount(editing.amount);
      setAmountText(groupDigits(editing.amount));
      setCategoryId(editing.categoryId ?? '');
      setWalletId(editing.walletId);
      setDate(editing.date);
      setNote(editing.note);
      return;
    }
    const last = (() => {
      try {
        return window.localStorage.getItem('picis.lastWallet');
      } catch {
        return null;
      }
    })();
    const fallback = wallets[0]?.id ?? '';
    setType('expense');
    setAmount(prefill?.amount ?? 0);
    setAmountText(prefill?.amount ? groupDigits(prefill.amount) : '');
    setDate(todayISO());
    setNote(prefill?.note ?? '');
    setWalletId(wallets.some((w) => w.id === last) ? (last as string) : fallback);
    setCategoryId('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id]);

  const maxDate = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
  }, []);

  const submit = (keepOpen: boolean) => {
    if (!user) return;
    const nextErrors: FieldError = {};
    if (!amount || amount <= 0) nextErrors.amount = 'Jumlah harus lebih dari 0.';
    if (!categoryId) nextErrors.categoryId = 'Pilih kategori.';
    if (!walletId) nextErrors.walletId = 'Pilih dompet.';
    if (!date) nextErrors.date = 'Tanggal wajib diisi.';
    if (note.length > 200) nextErrors.note = 'Catatan maksimal 200 karakter.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      if (nextErrors.amount) amountRef.current?.focus();
      return;
    }

    const month = date.slice(0, 7);
    const beforeRow = budgetRows(getDB(), user.id, month).find((row) => row.budget.categoryId === categoryId);
    const beforeLevel = beforeRow ? levelOf(beforeRow.progress) : -1;

    setSaving(true);
    const payload = { type, amount, categoryId, walletId, date, note, source: prefill?.source };
    const result = editing ? updateTransaction(editing.id, payload) : addTransaction(payload);
    setSaving(false);

    if (!result.ok) {
      const field = (result.field ?? 'amount') as keyof FieldError;
      setErrors({ [field]: result.error });
      if (field === 'amount') amountRef.current?.focus();
      return;
    }

    if (type === 'expense') {
      const afterRow = budgetRows(getDB(), user.id, month).find((row) => row.budget.categoryId === categoryId);
      if (afterRow) {
        const afterLevel = levelOf(afterRow.progress);
        if (afterLevel > beforeLevel && afterLevel > 0) {
          toast({
            message: `Anggaran ${afterRow.category.name} sudah ${afterRow.progress}%.`,
            tone: 'warn',
            duration: 6000,
          });
        }
      }
    }

    toast({ message: editing ? 'Transaksi diperbarui.' : 'Transaksi disimpan.' });
    try {
      window.localStorage.setItem('picis.lastWallet', walletId);
    } catch {
      // Remembering the last wallet is a convenience, never a reason to fail a save.
    }

    if (keepOpen) {
      setAmount(0);
      setAmountText('');
      setNote('');
      setErrors({});
      amountRef.current?.focus();
      return;
    }
    onClose();
  };

  const title = editing ? 'Ubah transaksi' : 'Catat transaksi';
  const amountId = `${uidStart}-amount`;
  const noteId = `${uidStart}-note`;
  const dateId = `${uidStart}-date`;
  const walletFieldId = `${uidStart}-wallet`;

  const goScan = () => {
    onClose();
    if (pathname !== '/scan') navigate('/scan');
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      eyebrow={editing ? 'Koreksi catatan' : 'Catatan baru'}
      title={title}
      footer={
        <>
          {!editing ? (
            <Button variant="quiet" onClick={() => submit(true)} disabled={saving}>
              Simpan & tambah lagi
            </Button>
          ) : null}
          <Button variant="primary" onClick={() => submit(false)} disabled={saving}>
            {saving ? 'Menyimpan' : editing ? 'Simpan perubahan' : 'Simpan'}
          </Button>
        </>
      }
    >
      <Segmented
        label="Tipe transaksi"
        block
        value={type}
        onChange={(next) => {
          setType(next);
          setCategoryId('');
        }}
        options={[
          { value: 'expense', label: 'Pengeluaran' },
          { value: 'income', label: 'Pemasukan' },
        ]}
      />

      <div className="field">
        <div className="field__label">
          <label htmlFor={amountId}>Jumlah</label>
          <button type="button" className="link-btn" onClick={goScan}>
            <IconQr size={14} />
            Scan QR struk
          </button>
        </div>
        <input
          id={amountId}
          ref={amountRef}
          className="input input--num"
          inputMode="numeric"
          autoComplete="off"
          placeholder="Rp0"
          value={amountText ? `Rp${amountText}` : ''}
          onChange={(event) => {
            const digits = event.target.value.replace(/[^\d]/g, '').slice(0, 13);
            const value = Number(digits || 0);
            setAmount(value);
            setAmountText(digits ? groupDigits(value) : '');
            if (errors.amount) setErrors((prev) => ({ ...prev, amount: undefined }));
          }}
          aria-invalid={Boolean(errors.amount)}
          aria-describedby={errors.amount ? `${amountId}-error` : undefined}
          data-autofocus
        />
        {errors.amount ? (
          <p className="error-text" id={`${amountId}-error`}>
            <IconAlert size={14} />
            {errors.amount}
          </p>
        ) : null}
      </div>

      <div className="field">
        <span className="field__label" id={`${uidStart}-cat-label`}>
          Kategori
        </span>
        <div
          role="group"
          aria-labelledby={`${uidStart}-cat-label`}
          style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}
        >
          {categories.map((category) => {
            const Icon = CATEGORY_ICONS[category.icon];
            const active = category.id === categoryId;
            return (
              <button
                key={category.id}
                type="button"
                className={`chip${active ? ' is-active' : ''}`}
                aria-pressed={active}
                onClick={() => {
                  setCategoryId(category.id);
                  setErrors((prev) => ({ ...prev, categoryId: undefined }));
                }}
              >
                <Icon size={15} />
                {category.name}
              </button>
            );
          })}
          {categories.length === 0 ? (
            <p className="muted" style={{ fontSize: 12.5, fontWeight: 600 }}>
              Belum ada kategori untuk tipe ini. Tambah di halaman Kategori.
            </p>
          ) : null}
        </div>
        {errors.categoryId ? <p className="error-text">{errors.categoryId}</p> : null}
      </div>

      <div className="field-row">
        <Field label="Dompet" htmlFor={walletFieldId} error={errors.walletId}>
          <div className="select-wrap">
            <select
              id={walletFieldId}
              className="input"
              value={walletId}
              onChange={(event) => setWalletId(event.target.value)}
            >
              {wallets.map((wallet) => (
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
        <Field label="Tanggal" htmlFor={dateId} error={errors.date}>
          <input
            id={dateId}
            className="input"
            type="date"
            value={date}
            max={maxDate}
            min="2000-01-01"
            onChange={(event) => setDate(event.target.value)}
          />
        </Field>
      </div>

      <Field
        label="Catatan"
        htmlFor={noteId}
        error={errors.note}
        counter={`${note.length}/200`}
      >
        <textarea
          id={noteId}
          className="input"
          value={note}
          maxLength={200}
          rows={2}
          placeholder="Misal: makan siang bareng tim"
          onChange={(event) => setNote(event.target.value)}
        />
      </Field>

      {prefill?.source === 'scan' ? (
        <div className="alert alert--butter">
          <IconQr size={16} />
          Jumlah dari struk perlu dicek. Perbaiki kalau salah baca sebelum simpan.
        </div>
      ) : null}
    </Sheet>
  );
}
