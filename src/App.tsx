import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BrowserRouter,
  Link,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import { useUser } from './lib/db';
import { Shell } from './components/Shell';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider } from './components/theme';
import { TxSheet } from './components/TxSheet';
import { ToastProvider } from './components/ui';
import { QuickAddContext, type QuickAddPrefill } from './components/quickadd';
import { Login, Register } from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Budgets from './pages/Budgets';
import Wallets from './pages/Wallets';
import Categories from './pages/Categories';
import Scan from './pages/Scan';
import Settings from './pages/Settings';
import { IconArrowRight } from './components/icons';

const TITLES: Record<string, string> = {
  '/dashboard': 'Beranda',
  '/transactions': 'Transaksi',
  '/budgets': 'Anggaran',
  '/wallets': 'Dompet',
  '/categories': 'Kategori',
  '/scan': 'Scan QR struk',
  '/settings': 'Pengaturan',
  '/login': 'Masuk',
  '/register': 'Buat akun',
};

function RouteEffects() {
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = `${TITLES[pathname] ?? 'Halaman tidak ditemukan'} · Picis`;
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname]);
  return null;
}

function GuestOnly({ children }: { children: React.ReactNode }) {
  const user = useUser();
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function Protected() {
  const user = useUser();
  const location = useLocation();
  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }
  return (
    <Shell>
      <ErrorBoundary resetKey={`${location.pathname}${location.search}`}>
        <Outlet />
      </ErrorBoundary>
    </Shell>
  );
}

function NotFound() {
  return (
    <div className="page" style={{ paddingTop: 60 }}>
      <p className="eyebrow">Halaman tidak ada</p>
      <h1 style={{ marginBottom: 10 }}>Alamat ini tidak ketemu</h1>
      <p className="lede">
        Mungkin tautannya salah ketik, atau halaman ini memang belum dibuat.
      </p>
      <div className="row" style={{ marginTop: 20 }}>
        <Link className="btn btn--ink" to="/dashboard">
          Kembali ke beranda
          <IconArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}

function Root() {
  const user = useUser();

  const [addOpen, setAddOpen] = useState(false);
  const [prefill, setPrefill] = useState<QuickAddPrefill | null>(null);

  const open = useCallback((next?: QuickAddPrefill) => {
    setPrefill(next ?? null);
    setAddOpen(true);
  }, []);

  const api = useMemo(() => ({ open }), [open]);

  return (
    <QuickAddContext.Provider value={api}>
      <RouteEffects />
      <Routes>
        <Route
          path="/login"
          element={
            <GuestOnly>
              <Login />
            </GuestOnly>
          }
        />
        <Route
          path="/register"
          element={
            <GuestOnly>
              <Register />
            </GuestOnly>
          }
        />
        <Route element={<Protected />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/budgets" element={<Budgets />} />
          <Route path="/wallets" element={<Wallets />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/scan" element={<Scan />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      {user ? (
        <TxSheet open={addOpen} onClose={() => setAddOpen(false)} prefill={prefill} />
      ) : null}
    </QuickAddContext.Provider>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <ThemeProvider>
          <Root />
        </ThemeProvider>
      </BrowserRouter>
    </ToastProvider>
  );
}
