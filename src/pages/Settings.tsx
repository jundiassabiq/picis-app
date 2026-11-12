import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ThemePref } from '../lib/types';
import {
  deleteAccount,
  logout,
  resetDemoData,
  updateProfile,
  useDB,
  useUser,
} from '../lib/db';
import { downloadAllData, downloadTransactionsCsv } from '../lib/csv';
import { dayLabel } from '../lib/format';
import { Avatar, Button, ConfirmSheet, Field, Segmented, useToast } from '../components/ui';
import { useTheme } from '../components/theme';
import {
  IconAlert,
  IconCheck,
  IconDownload,
  IconLogout,
  IconMoon,
  IconRestore,
  IconSun,
  IconTrash,
} from '../components/icons';

export default function Settings() {
  const db = useDB();
  const user = useUser();
  const toast = useToast();
  const navigate = useNavigate();
  const { pref, set } = useTheme();
  const [name, setName] = useState(user?.name ?? '');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  if (!user) return null;

  const txs = db.transactions.filter((t) => t.userId === user.id);
  const categories = db.categories.filter((c) => c.userId === user.id);
  const wallets = db.wallets.filter((w) => w.userId === user.id);

  const saveProfile = () => {
    const result = updateProfile(name);
    toast(result.ok ? { message: 'Profil diperbarui.' } : { message: result.error, tone: 'warn' });
  };

  const doLogout = () => {
    logout();
    toast({ message: 'Kamu sudah keluar.' });
    navigate('/login', { replace: true });
  };

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1>Pengaturan</h1>
          <p className="lede" style={{ marginTop: 6, fontSize: 13.5 }}>
            Profil, tema, dan data. Semuanya tersimpan di perangkat ini.
          </p>
        </div>
      </div>

      <div className="set-grid">
        <section className="set-card" aria-labelledby="set-profile">
          <header>
            <h2 id="set-profile">Profil</h2>
            <span className="tag tag--line">Akun lokal</span>
          </header>
          <div className="row" style={{ gap: 12 }}>
            <Avatar name={user.name} size="lg" tone="ink" />
            <div className="grow" style={{ minWidth: 0 }}>
              <p style={{ fontWeight: 800, fontSize: 15 }}>{user.name}</p>
              <p className="muted" style={{ fontSize: 12, fontWeight: 600 }}>
                Bergabung {dayLabel(user.createdAt.slice(0, 10))}
              </p>
            </div>
          </div>
          <Field label="Nama tampilan" htmlFor="set-name">
            <input
              id="set-name"
              className="input"
              value={name}
              maxLength={60}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <Field label="Email" htmlFor="set-email" hint="Email tidak bisa diubah di versi lokal ini.">
            <input id="set-email" className="input" value={user.email} readOnly disabled />
          </Field>
          <div className="set-actions">
            <Button variant="primary" onClick={saveProfile} disabled={!name.trim() || name === user.name}>
              <IconCheck size={16} />
              Simpan profil
            </Button>
          </div>
        </section>

        <section className="set-card" aria-labelledby="set-theme">
          <header>
            <h2 id="set-theme">Tampilan</h2>
            <span className="tag tag--line">Tersimpan di perangkat</span>
          </header>
          <Segmented
            label="Tema tampilan"
            block
            value={pref}
            onChange={(value: ThemePref) => {
              set(value);
              toast({
                message:
                  value === 'system'
                    ? 'Tema mengikuti setelan perangkat.'
                    : value === 'dark'
                      ? 'Tema gelap aktif.'
                      : 'Tema terang aktif.',
              });
            }}
            options={[
              { value: 'light', label: 'Terang', icon: <IconSun size={15} /> },
              { value: 'dark', label: 'Gelap', icon: <IconMoon size={15} /> },
              { value: 'system', label: 'Sistem' },
            ]}
          />
          <div className="set-row">
            <div>
              <p className="set-row__label">Ringkasan data</p>
              <p className="set-row__hint">
                {txs.length} transaksi, {categories.length} kategori, {wallets.length} dompet.
              </p>
            </div>
          </div>
          <div className="set-row">
            <div>
              <p className="set-row__label">Penyimpanan</p>
              <p className="set-row__hint">
                Data disimpan di localStorage browser ini. Hapus data situs berarti data ikut hilang.
              </p>
            </div>
          </div>
        </section>

        <section className="set-card" aria-labelledby="set-data">
          <header>
            <h2 id="set-data">Data</h2>
          </header>
          <div className="set-row">
            <div>
              <p className="set-row__label">Ekspor transaksi (CSV)</p>
              <p className="set-row__hint">
                Semua transaksi milikmu, siap dibuka di Excel atau Google Sheets.
              </p>
            </div>
            <Button
              variant="cream"
              size="sm"
              onClick={() => {
                downloadTransactionsCsv(txs, categories, wallets);
                toast({ message: 'CSV terunduh.' });
              }}
              disabled={txs.length === 0}
            >
              <IconDownload size={16} />
              CSV
            </Button>
          </div>
          <div className="set-row">
            <div>
              <p className="set-row__label">Ekspor semua data (JSON)</p>
              <p className="set-row__hint">Transaksi, kategori, dompet, dan anggaran dalam satu file.</p>
            </div>
            <Button
              variant="cream"
              size="sm"
              onClick={() => {
                downloadAllData(db, user.id);
                toast({ message: 'Salinan data terunduh.' });
              }}
            >
              <IconDownload size={16} />
              JSON
            </Button>
          </div>
          <div className="set-row">
            <div>
              <p className="set-row__label">Muat ulang data contoh</p>
              <p className="set-row__hint">
                Mengganti seluruh data di perangkat ini dengan akun demo dan transaksi contoh.
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setResetOpen(true)}>
              <IconRestore size={16} />
              Muat ulang
            </Button>
          </div>
        </section>

        <section className="set-card" aria-labelledby="set-account">
          <header>
            <h2 id="set-account">Akun</h2>
          </header>
          <div className="set-row">
            <div>
              <p className="set-row__label">Keluar</p>
              <p className="set-row__hint">Sesi ditutup. Data tetap ada sampai kamu masuk lagi.</p>
            </div>
            <Button variant="quiet" size="sm" onClick={doLogout}>
              <IconLogout size={16} />
              Keluar
            </Button>
          </div>
          <div className="set-row">
            <div>
              <p className="set-row__label">Hapus akun</p>
              <p className="set-row__hint">
                Semua transaksi, kategori, dompet, dan anggaran dihapus dari perangkat ini.
              </p>
            </div>
            <Button variant="danger" size="sm" onClick={() => setDeleteOpen(true)}>
              <IconTrash size={16} />
              Hapus
            </Button>
          </div>
        </section>

        <section className="set-card" aria-labelledby="set-about">
          <header>
            <h2 id="set-about">Tentang</h2>
          </header>
          <div className="set-row">
            <div>
              <p className="set-row__label">picis 0.1.0</p>
              <p className="set-row__hint">
                Pencatat keuangan lokal. Tanpa sambung bank, tanpa server, tanpa pelacak.
              </p>
            </div>
          </div>
          <div className="alert alert--butter">
            <IconAlert size={16} />
            Ini penyimpanan lokal, bukan aplikasi bank. Cadangkan lewat ekspor JSON sebelum menghapus
            data browser.
          </div>
        </section>
      </div>

      <ConfirmSheet
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => {
          deleteAccount();
          setDeleteOpen(false);
          toast({ message: 'Akun dan data di perangkat ini sudah dihapus.' });
          navigate('/login', { replace: true });
        }}
        title="Hapus akun?"
        body="Semua transaksi, kategori, dompet, dan anggaran milik akun ini dihapus permanen dari perangkat. Tindakan ini tidak bisa diurungkan."
        confirmLabel="Hapus akun"
        requireText="HAPUS"
      />

      <ConfirmSheet
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={() => {
          resetDemoData();
          setResetOpen(false);
          toast({ message: 'Data contoh dimuat. Masuk dengan akun demo.' });
          navigate('/login', { replace: true });
        }}
        title="Muat ulang data contoh?"
        body="Data sekarang di perangkat ini diganti dengan data demo. Unduh salinan JSON dulu kalau masih dibutuhkan."
        confirmLabel="Muat ulang"
        tone="primary"
      />
    </div>
  );
}
