import { useEffect, useMemo, useState } from 'react';
import type { Category, CategoryType, IconKey } from '../lib/types';
import {
  addCategory,
  deleteCategory,
  setCategoryHidden,
  updateCategory,
  useDB,
  useUser,
} from '../lib/db';
import { rupiah } from '../lib/format';
import {
  Button,
  ConfirmSheet,
  EmptyState,
  Field,
  Segmented,
  Sheet,
  useToast,
} from '../components/ui';
import {
  CATEGORY_ICONS,
  ICON_KEYS,
  IconAlert,
  IconCheck,
  IconGrid,
  IconMore,
  IconPencil,
  IconPlus,
  IconTrash,
} from '../components/icons';

const ICON_LABEL: Record<IconKey, string> = {
  food: 'Makanan',
  transport: 'Transportasi',
  home: 'Rumah',
  shopping: 'Belanja',
  health: 'Kesehatan',
  fun: 'Hiburan',
  bill: 'Tagihan',
  education: 'Pendidikan',
  salary: 'Gaji',
  bonus: 'Bonus',
  gift: 'Hadiah',
  other: 'Lainnya',
};

export default function Categories() {
  const db = useDB();
  const user = useUser();
  const toast = useToast();
  const [tab, setTab] = useState<CategoryType>('expense');
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<IconKey>('other');
  const [formError, setFormError] = useState('');
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [moving, setMoving] = useState<Category | null>(null);
  const [moveTo, setMoveTo] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 200);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!menuFor) return;
    const close = () => setMenuFor(null);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuFor]);

  const categories = useMemo(
    () => (user ? db.categories.filter((c) => c.userId === user.id && c.type === tab) : []),
    [db.categories, tab, user],
  );

  const spend = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of db.transactions) {
      if (!tx.categoryId) continue;
      map.set(tx.categoryId, (map.get(tx.categoryId) ?? 0) + tx.amount);
    }
    return map;
  }, [db.transactions]);

  if (!user) return null;

  const usageOf = (id: string) => db.transactions.filter((tx) => tx.categoryId === id).length;

  const openAdd = () => {
    setEditing(null);
    setName('');
    setIcon('other');
    setFormError('');
    setSheetOpen(true);
  };

  const openEdit = (category: Category) => {
    if (category.isDefault) {
      toast({ message: 'Kategori bawaan hanya bisa disembunyikan, tidak diubah namanya.', tone: 'warn' });
      return;
    }
    setEditing(category);
    setName(category.name);
    setIcon(category.icon);
    setFormError('');
    setSheetOpen(true);
  };

  const save = () => {
    const result = editing
      ? updateCategory(editing.id, { name, icon })
      : addCategory({ name, type: tab, icon });
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    setSheetOpen(false);
    toast({ message: editing ? 'Kategori diperbarui.' : 'Kategori ditambahkan.' });
  };

  const attemptDelete = () => {
    if (!deleting) return;
    const result = deleteCategory(deleting.id, null);
    if (!result.ok) {
      if (result.field === 'moveToId') {
        const target = categories.find((c) => c.id !== deleting.id);
        setMoveTo(target?.id ?? '');
        setMoving(deleting);
        setDeleting(null);
        return;
      }
      toast({ message: result.error, tone: 'warn' });
      setDeleting(null);
      return;
    }
    setDeleting(null);
    toast({ message: 'Kategori dihapus.' });
  };

  const confirmMove = () => {
    if (!moving) return;
    const result = deleteCategory(moving.id, moveTo);
    if (!result.ok) {
      toast({ message: result.error, tone: 'warn' });
      return;
    }
    setMoving(null);
    toast({ message: 'Transaksi dan anggaran dipindahkan, kategori dihapus.' });
  };

  const hiddenCount = categories.filter((c) => c.hidden).length;

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1>Kategori</h1>
          <p className="lede" style={{ marginTop: 6, fontSize: 13.5 }}>
            Kategori menentukan laporan, anggaran, dan warna di grafik. Kategori bawaan tidak bisa
            dihapus, hanya disembunyikan.
          </p>
        </div>
        <Button variant="primary" onClick={openAdd}>
          <IconPlus size={17} />
          Tambah kategori
        </Button>
      </div>

      <div className="row" style={{ marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <Segmented
          label="Tipe kategori"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'expense', label: 'Pengeluaran' },
            { value: 'income', label: 'Pemasukan' },
          ]}
        />
        <span className="muted" style={{ fontSize: 12, fontWeight: 600 }}>
          {categories.length} kategori
          {hiddenCount > 0 ? `, ${hiddenCount} disembunyikan` : ''}
        </span>
      </div>

      {loading ? (
        <div className="card" aria-busy="true" aria-live="polite" style={{ display: 'grid', gap: 12 }}>
          <span className="sr-only">Memuat kategori</span>
          {[0, 1, 2].map((i) => (
            <div key={i} className="row" style={{ gap: 12 }}>
              <div className="sk" style={{ width: 42, height: 42, borderRadius: 14 }} />
              <div className="sk" style={{ height: 14, width: '40%' }} />
            </div>
          ))}
        </div>
      ) : categories.length === 0 ? (
        <EmptyState
          icon={<IconGrid size={24} />}
          title="Belum ada kategori"
          body={`Buat kategori ${tab === 'expense' ? 'pengeluaran' : 'pemasukan'} pertama.`}
          action={
            <Button variant="primary" onClick={openAdd}>
              Tambah kategori
            </Button>
          }
        />
      ) : (
        <div className="card" style={{ padding: 8 }}>
          {categories.map((category) => {
            const Icon = CATEGORY_ICONS[category.icon];
            const used = usageOf(category.id);
            return (
              <div className="cat-row" key={category.id}>
                <span className={`tx-row__icon tx-row__icon--${category.type === 'expense' ? 'expense' : 'income'}`}>
                  <Icon size={19} />
                </span>
                <div className="cat-row__main">
                  <p className="cat-row__name">
                    <span>{category.name}</span>
                    {category.isDefault ? <span className="tag tag--line">Bawaan</span> : null}
                    {category.hidden ? <span className="tag">Disembunyikan</span> : null}
                  </p>
                  <p className="cat-row__meta">
                    {used} transaksi · {rupiah(spend.get(category.id) ?? 0)}
                  </p>
                </div>
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    className="menu-btn"
                    aria-label={`Aksi untuk ${category.name}`}
                    aria-haspopup="menu"
                    aria-expanded={menuFor === category.id}
                    onClick={(event) => {
                      event.stopPropagation();
                      setMenuFor(menuFor === category.id ? null : category.id);
                    }}
                  >
                    <IconMore size={18} />
                  </button>
                  {menuFor === category.id ? (
                    <div
                      className="menu"
                      role="menu"
                      onPointerDown={(event) => event.stopPropagation()}
                      style={{ minWidth: 200 }}
                    >
                      {!category.isDefault ? (
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setMenuFor(null);
                            openEdit(category);
                          }}
                        >
                          <IconPencil size={16} />
                          Ubah nama dan ikon
                        </button>
                      ) : null}
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setMenuFor(null);
                          setCategoryHidden(category.id, !category.hidden);
                          toast({
                            message: category.hidden
                              ? 'Kategori ditampilkan lagi.'
                              : 'Kategori disembunyikan dari pilihan baru.',
                          });
                        }}
                      >
                        <IconGrid size={16} />
                        {category.hidden ? 'Tampilkan lagi' : 'Sembunyikan'}
                      </button>
                      {!category.isDefault ? (
                        <button
                          type="button"
                          role="menuitem"
                          className="is-danger"
                          onClick={() => {
                            setMenuFor(null);
                            setDeleting(category);
                          }}
                        >
                          <IconTrash size={16} />
                          Hapus kategori
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editing ? 'Ubah kategori' : 'Tambah kategori'}
        eyebrow={tab === 'expense' ? 'Pengeluaran' : 'Pemasukan'}
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
        {formError ? (
          <div className="alert" role="alert">
            <IconAlert size={16} />
            {formError}
          </div>
        ) : null}

        <Field label="Nama kategori" htmlFor="cat-name" hint="Maksimal 30 karakter.">
          <input
            id="cat-name"
            className="input"
            value={name}
            maxLength={30}
            placeholder="Misal: Kopi pagi"
            onChange={(event) => {
              setName(event.target.value);
              setFormError('');
            }}
            data-autofocus
          />
        </Field>

        <div className="field">
          <span className="field__label">Ikon</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
            {ICON_KEYS.map((key) => {
              const Icon = CATEGORY_ICONS[key];
              const selected = icon === key;
              return (
                <button
                  key={key}
                  type="button"
                  aria-label={ICON_LABEL[key]}
                  aria-pressed={selected}
                  onClick={() => setIcon(key)}
                  style={{
                    height: 52,
                    borderRadius: 14,
                    display: 'grid',
                    placeItems: 'center',
                    background: selected ? 'var(--ink)' : 'var(--surface-2)',
                    color: selected ? 'var(--on-ink)' : 'var(--ink-soft)',
                    boxShadow: selected ? 'none' : 'inset 0 0 0 1px var(--line)',
                  }}
                >
                  <Icon size={21} />
                </button>
              );
            })}
          </div>
        </div>
      </Sheet>

      <Sheet
        open={Boolean(moving)}
        onClose={() => setMoving(null)}
        title="Pindahkan transaksi"
        eyebrow={`${moving ? usageOf(moving.id) : 0} transaksi`}
        footer={
          <>
            <Button variant="quiet" onClick={() => setMoving(null)}>
              Batal
            </Button>
            <Button variant="primary" onClick={confirmMove} disabled={!moveTo}>
              Pindahkan lalu hapus
            </Button>
          </>
        }
      >
        <p className="lede" style={{ fontSize: 13 }}>
          Kategori <strong>{moving?.name}</strong> dipakai beberapa transaksi dan anggaran. Pilih
          kategori tujuan dengan tipe yang sama supaya riwayat tetap rapi.
        </p>
        <Field label="Kategori tujuan" htmlFor="cat-move">
          <div className="select-wrap">
            <select
              id="cat-move"
              className="input"
              value={moveTo}
              onChange={(event) => setMoveTo(event.target.value)}
            >
              {categories
                .filter((c) => c.id !== moving?.id)
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
      </Sheet>

      <ConfirmSheet
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={attemptDelete}
        title="Hapus kategori?"
        body={
          deleting && usageOf(deleting.id) > 0 ? (
            <>
              <strong>{deleting.name}</strong> dipakai {usageOf(deleting.id)} transaksi. Setelah
              konfirmasi, kamu akan memilih kategori tujuan.
            </>
          ) : (
            <>
              <strong>{deleting?.name}</strong> belum dipakai transaksi, jadi aman dihapus.
            </>
          )
        }
        confirmLabel="Lanjut hapus"
      />
    </div>
  );
}
