import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { login, register } from '../lib/db';
import { DEMO_EMAIL, DEMO_PASSWORD } from '../lib/seed';
import { Button, Field } from '../components/ui';
import { IconAlert, IconArrowRight, IconLock, IconQr, IconSparkle } from '../components/icons';

function Stage() {
  return (
    <aside className="auth__stage" aria-hidden="true">
      <div className="auth__brand">
        <img src="/logo-mark.png" alt="" width={44} height={44} />
        picis
      </div>
      <div className="auth__pitch">
        <div className="auth__receipt">
          <div className="auth__receipt-head">
            <span>CONTOH STRUK</span>
            <span>QR</span>
          </div>
          <div className="auth__receipt-lines">
            <span>
              <span>Nasi padang</span>
              <span>32.000</span>
            </span>
            <span>
              <span>Es teh manis</span>
              <span>8.000</span>
            </span>
            <span>
              <span>Kerupuk</span>
              <span>5.000</span>
            </span>
          </div>
          <div className="auth__receipt-total">
            <span>Total</span>
            <span>Rp45.000</span>
          </div>
        </div>
        <p className="auth__claim">Uang keluar masuk, akhirnya kelihatan.</p>
        <p>
          Catat pengeluaran, scan QR di struk, lalu atur anggaran per kategori. Semua tersimpan di
          perangkatmu, tanpa sambung bank.
        </p>
      </div>
    </aside>
  );
}

function Shell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="auth">
      <Stage />
      <div className="auth__mobile-head">
        <div className="auth__brand">
          <img src="/logo-mark.png" alt="" width={40} height={40} />
          picis
        </div>
        <p className="auth__claim">Uang keluar masuk, akhirnya kelihatan.</p>
      </div>
      <main className="auth__form-wrap">
        <div className="auth__card">
          <div>
            <h1 className="auth__title">{title}</h1>
            <p className="lede" style={{ marginTop: 8, fontSize: 13.5 }}>
              {subtitle}
            </p>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard';
  const uidBase = useId();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Email dan password wajib diisi.');
      return;
    }
    setBusy(true);
    const result = login(email, password);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    navigate(from, { replace: true });
  };

  const demoLogin = () => {
    setBusy(true);
    const result = login(DEMO_EMAIL, DEMO_PASSWORD);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    navigate('/dashboard', { replace: true });
  };

  return (
    <Shell title="Masuk ke picis" subtitle="Lanjutkan catatan keuanganmu. Data tersimpan di perangkat ini.">
      <form onSubmit={submit} style={{ display: 'grid', gap: 14 }} noValidate>
        {error ? (
          <div className="alert" role="alert">
            <IconAlert size={16} />
            {error}
          </div>
        ) : null}
        <Field label="Email" htmlFor={`${uidBase}-email`}>
          <input
            id={`${uidBase}-email`}
            className="input"
            type="email"
            autoComplete="email"
            placeholder="nama@email.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </Field>
        <Field label="Password" htmlFor={`${uidBase}-password`}>
          <input
            id={`${uidBase}-password`}
            className="input"
            type="password"
            autoComplete="current-password"
            placeholder="Minimal 8 karakter"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </Field>
        <Button variant="primary" block type="submit" disabled={busy} style={{ marginTop: 4 }}>
          {busy ? 'Memeriksa' : 'Masuk'}
          <IconArrowRight size={17} />
        </Button>
      </form>

      <div className="auth__demo">
        <IconLock size={16} />
        <span>
          Akun demo: <strong>{DEMO_EMAIL}</strong> / <strong>{DEMO_PASSWORD}</strong>
        </span>
      </div>
      <Button variant="ghost" block onClick={demoLogin} disabled={busy}>
        <IconSparkle size={16} />
        Masuk dengan akun demo
      </Button>

      <p className="auth__alt">
        Belum punya akun? <Link to="/register">Buat akun baru</Link>
      </p>
      <p className="auth__alt" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <IconQr size={14} /> Tanpa sambung bank, tanpa unggah data ke server.
      </p>
    </Shell>
  );
}

export function Register() {
  const navigate = useNavigate();
  const uidBase = useId();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setErrors({});
    setBusy(true);
    const result = register(name, email, password, confirm);
    setBusy(false);
    if (!result.ok) {
      if (result.field) setErrors({ [result.field]: result.error });
      else setError(result.error);
      return;
    }
    navigate('/dashboard', { replace: true });
  };

  return (
    <Shell
      title="Buat akun picis"
      subtitle="Satu akun untuk mencatat pengeluaran harian, anggaran, dan dompet."
    >
      <form onSubmit={submit} style={{ display: 'grid', gap: 14 }} noValidate>
        {error ? (
          <div className="alert" role="alert">
            <IconAlert size={16} />
            {error}
          </div>
        ) : null}
        <Field label="Nama" htmlFor={`${uidBase}-name`} error={errors.name}>
          <input
            id={`${uidBase}-name`}
            className="input"
            autoComplete="name"
            placeholder="Nama kamu"
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={Boolean(errors.name)}
            required
          />
        </Field>
        <Field label="Email" htmlFor={`${uidBase}-email`} error={errors.email}>
          <input
            id={`${uidBase}-email`}
            className="input"
            type="email"
            autoComplete="email"
            placeholder="nama@email.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={Boolean(errors.email)}
            required
          />
        </Field>
        <div className="field-row">
          <Field label="Password" htmlFor={`${uidBase}-password`} error={errors.password}>
            <input
              id={`${uidBase}-password`}
              className="input"
              type="password"
              autoComplete="new-password"
              placeholder="Minimal 8 karakter"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={Boolean(errors.password)}
              required
            />
          </Field>
          <Field label="Konfirmasi" htmlFor={`${uidBase}-confirm`} error={errors.confirm}>
            <input
              id={`${uidBase}-confirm`}
              className="input"
              type="password"
              autoComplete="new-password"
              placeholder="Ulangi password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              aria-invalid={Boolean(errors.confirm)}
              required
            />
          </Field>
        </div>
        <Button variant="primary" block type="submit" disabled={busy} style={{ marginTop: 4 }}>
          {busy ? 'Membuat akun' : 'Buat akun'}
          <IconArrowRight size={17} />
        </Button>
      </form>

      <p className="auth__alt">
        Sudah punya akun? <Link to="/login">Masuk di sini</Link>
      </p>
    </Shell>
  );
}
