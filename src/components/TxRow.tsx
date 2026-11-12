import { useEffect, useId, useRef, useState } from 'react';
import type { Category, Transaction, Wallet } from '../lib/types';
import { rupiah } from '../lib/format';
import { CATEGORY_ICONS, IconMore, IconPencil, IconTrash } from './icons';

export function txLabel(tx: Transaction, categories: Category[], wallets: Wallet[]): string {
  if (tx.type === 'transfer') {
    const target = wallets.find((w) => w.id === tx.toWalletId);
    return target ? `Transfer ke ${target.name}` : 'Transfer';
  }
  const category = categories.find((c) => c.id === tx.categoryId);
  return category?.name ?? 'Tanpa kategori';
}

export function TxRow({
  tx,
  categories,
  wallets,
  onEdit,
  onDelete,
  compact = false,
}: {
  tx: Transaction;
  categories: Category[];
  wallets: Wallet[];
  onEdit?: (tx: Transaction) => void;
  onDelete?: (tx: Transaction) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const category = categories.find((c) => c.id === tx.categoryId);
  const wallet = wallets.find((w) => w.id === tx.walletId);
  const Icon = CATEGORY_ICONS[category?.icon ?? 'other'];
  const title = txLabel(tx, categories, wallets);
  const meta = [tx.note, wallet?.name].filter(Boolean).join(' · ');

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const menuEnabled = Boolean(onEdit || onDelete) && tx.type !== 'transfer';

  return (
    <div className="tx-row" ref={wrapRef}>
      <span className={`tx-row__icon tx-row__icon--${tx.type === 'transfer' ? 'transfer' : tx.type}`}>
        <Icon size={19} />
      </span>
      <div className="tx-row__main">
        <span className="tx-row__title">{title}</span>
        {!compact || meta ? (
          <span className="tx-row__meta">{meta || 'Tanpa catatan'}</span>
        ) : null}
      </div>
      <span className={`tx-row__amount tx-row__amount--${tx.type}`}>
        {tx.type === 'expense' ? '-' : tx.type === 'income' ? '+' : ''}
        {rupiah(tx.amount)}
      </span>
      {menuEnabled ? (
        <button
          type="button"
          className="menu-btn"
          aria-label={`Aksi untuk ${title}`}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
          onClick={() => setOpen((value) => !value)}
        >
          <IconMore size={18} />
        </button>
      ) : (
        <span aria-hidden="true" style={{ width: 8 }} />
      )}

      {open ? (
        <div className="menu" role="menu" id={menuId}>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onEdit?.(tx);
            }}
          >
            <IconPencil size={16} />
            Ubah
          </button>
          <button
            type="button"
            role="menuitem"
            className="is-danger"
            onClick={() => {
              setOpen(false);
              onDelete?.(tx);
            }}
          >
            <IconTrash size={16} />
            Hapus
          </button>
        </div>
      ) : null}
    </div>
  );
}
