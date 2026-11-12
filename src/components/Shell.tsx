import { useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import type { ThemePref } from '../lib/types';
import { logout, setTheme, useDB, useStorageError, useUser } from '../lib/db';
import { fullDateLabel, todayISO } from '../lib/format';
import { Avatar, Button, Segmented, Sheet, Stage, useToast } from './ui';
import { useQuickAdd } from './quickadd';
import {
  IconAlert,
  IconGrid,
  IconHome,
  IconLogout,
  IconMoon,
  IconQr,
  IconReceipt,
  IconSettings,
  IconSparkle,
  IconSun,
  IconTarget,
  IconWallet,
} from './icons';

const NAV = [
  { to: '/dashboard', label: 'Beranda', icon: IconHome },
  { to: '/transactions', label: 'Transaksi', icon: IconReceipt },
  { to: '/budgets', label: 'Anggaran', icon: IconTarget },
  { to: '/wallets', label: 'Dompet', icon: IconWallet },
  { to: '/categories', label: 'Kategori', icon: IconGrid },
  { to: '/scan', label: 'Scan struk', icon: IconQr },
];

function Rail() {
  const db = useDB();
  const user = useUser();
  const navigate = useNavigate();
  const toast = useToast();
  const theme = db.theme;

  const cycleTheme = () => {
    const next: ThemePref = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
    setTheme(next);
  };

  return (
    <aside className="rail" aria-label="Navigasi utama">
      <Link to="/dashboard" className="rail__brand">
        <span className="rail__mark" aria-hidden="true">
          d
        </span>
        <span className="rail__word">duitku</span>
      </Link>

      <nav className="rail__nav">
        {NAV.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink key={item.to} to={item.to} className="rail__link">
              <Icon size={20} />
              {item.label}
            </NavLink>
          );
        })}
        <NavLink to="/settings" className="rail__link">
          <IconSettings size={20} />
          Pengaturan
        </NavLink>
      </nav>

      <div className="rail__foot">
        <div className="rail__foot-card">
          <Avatar name={user?.name ?? 'D'} tone="ink" />
          <div className="grow" style={{ minWidth: 0 }}>
            <p className="rail__foot-name truncate">{user?.name}</p>
            <p className="rail__foot-mail truncate">{user?.email}</p>
          </div>
        </div>
        <div className="rail__tools">
          <button
            type="button"
            className="icon-btn icon-btn--plain"
            onClick={cycleTheme}
            aria-label={`Tema: ${theme === 'light' ? 'terang' : theme === 'dark' ? 'gelap' : 'mengikuti sistem'}. Ganti tema`}
          >
            {theme === 'dark' ? <IconMoon size={19} /> : <IconSun size={19} />}
          </button>
          <button
            type="button"
            className="icon-btn icon-btn--plain"
            aria-label="Keluar"
            onClick={() => {
              logout();
              toast({ message: 'Kamu sudah keluar.' });
              navigate('/login', { replace: true });
            }}
          >
            <IconLogout size={19} />
          </button>
        </div>
      </div>
    </aside>
  );
}

function TabBar({ onAdd }: { onAdd: () => void }) {
  const items = [
    NAV[0],
    NAV[1],
    null,
    NAV[2],
    NAV[3],
  ] as Array<(typeof NAV)[number] | null>;

  return (
    <nav className="tabbar" aria-label="Navigasi bawah">
      {items.map((item, index) =>
        item ? (
          <NavLink key={item.to} to={item.to} className="tabbar__link">
            <item.icon size={21} />
            <span>{item.label}</span>
          </NavLink>
        ) : (
          <button
            key={`fab-${index}`}
            type="button"
            className="tabbar__fab"
            onClick={onAdd}
            aria-label="Catat transaksi baru"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 5.4v13.2M5.4 12h13.2" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </button>
        ),
      )}
    </nav>
  );
}

function ProfileSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const db = useDB();
  const user = useUser();
  const navigate = useNavigate();
  const toast = useToast();
  if (!user) return null;

  const links = [
    { to: '/categories', label: 'Kategori', icon: IconGrid, hint: 'Kelola kategori pengeluaran dan pemasukan' },
    { to: '/scan', label: 'Scan QR struk', icon: IconQr, hint: 'Baca total dari struk belanja' },
    { to: '/settings', label: 'Pengaturan', icon: IconSettings, hint: 'Profil, tema, dan data' },
  ];

  return (
    <Sheet open={open} onClose={onClose} title="Akun kamu" eyebrow="Masuk sebagai">
      <div className="row" style={{ gap: 12 }}>
        <Avatar name={user.name} size="lg" tone="ink" />
        <div className="grow" style={{ minWidth: 0 }}>
          <p style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 20, letterSpacing: '-0.03em' }}>
            {user.name}
          </p>
          <p className="muted truncate" style={{ fontSize: 12.5, fontWeight: 600 }}>
            {user.email}
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 2 }}>
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <button
              key={link.to}
              type="button"
              className="tx-row"
              style={{ gridTemplateColumns: '40px minmax(0,1fr)', textAlign: 'left' }}
              onClick={() => {
                onClose();
                navigate(link.to);
              }}
            >
              <span className="tx-row__icon">
                <Icon size={19} />
              </span>
              <span className="tx-row__main">
                <span className="tx-row__title">{link.label}</span>
                <span className="tx-row__meta">{link.hint}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div>
        <p className="field__label" style={{ marginBottom: 6 }}>
          Tema
        </p>
        <Segmented
          label="Tema tampilan"
          block
          value={db.theme}
          onChange={(value) => setTheme(value)}
          options={[
            { value: 'light', label: 'Terang', icon: <IconSun size={15} /> },
            { value: 'dark', label: 'Gelap', icon: <IconMoon size={15} /> },
            { value: 'system', label: 'Sistem' },
          ]}
        />
      </div>

      <Button
        variant="quiet"
        block
        onClick={() => {
          logout();
          onClose();
          toast({ message: 'Kamu sudah keluar.' });
          navigate('/login', { replace: true });
        }}
      >
        <IconLogout size={17} />
        Keluar
      </Button>
    </Sheet>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const user = useUser();
  const db = useDB();
  const storageError = useStorageError();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const quick = useQuickAdd();

  if (!user) return null;

  const cycleTheme = () => {
    setTheme(db.theme === 'light' ? 'dark' : db.theme === 'dark' ? 'system' : 'light');
  };

  return (
    <>
      <Stage />
      <a className="skip-link" href="#main">
        Lewati ke konten
      </a>
      <div className="app">
        <Rail />
        <div className="app__main">
          <header className="topbar">
            <div className="topbar__hello">
              <p className="topbar__name">
                Hai, {user.name.split(' ')[0]}
                <IconSparkle size={15} style={{ color: 'var(--butter)' }} aria-hidden="true" />
              </p>
              <p className="topbar__date">{fullDateLabel(todayISO())}</p>
            </div>
            <div className="topbar__actions">
              <button
                type="button"
                className="icon-btn"
                onClick={cycleTheme}
                aria-label={`Tema: ${db.theme === 'light' ? 'terang' : db.theme === 'dark' ? 'gelap' : 'mengikuti sistem'}. Ganti tema`}
                style={{ display: 'grid' }}
              >
                {db.theme === 'dark' ? <IconMoon size={19} /> : <IconSun size={19} />}
              </button>
              <button
                type="button"
                onClick={() => setProfileOpen(true)}
                aria-label="Buka menu akun"
                style={{
                  width: 46,
                  height: 46,
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: '50%',
                  background: 'var(--surface)',
                  boxShadow: 'inset 0 0 0 1px var(--line)',
                }}
              >
                <Avatar name={user.name} />
              </button>
            </div>
          </header>

          {storageError ? (
            <div className="app__alert" role="alert">
              <div className="alert alert--butter">
                <IconAlert size={16} />
                Penyimpanan browser penuh atau diblokir. Perubahan tetap jalan di sesi ini, tetapi
                bisa hilang saat halaman ditutup. Unduh salinan JSON di Pengaturan.
              </div>
            </div>
          ) : null}

          <main id="main" key={location.pathname} className="page-enter">
            {children}
          </main>
          <footer className="app__foot">
            <span>duitku · data tersimpan di perangkat ini</span>
            <span>v0.1.0</span>
          </footer>
        </div>
        <TabBar onAdd={() => quick.open()} />
      </div>
      <ProfileSheet open={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  );
}
