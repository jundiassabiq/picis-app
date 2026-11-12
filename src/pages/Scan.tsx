import { useEffect, useRef, useState } from 'react';
import type { ReceiptRead } from '../lib/qr';
import { decodeQrFromFile, parseReceiptPayload } from '../lib/qr';
import { rupiah } from '../lib/format';
import { Button, Field } from '../components/ui';
import { useQuickAdd } from '../components/quickadd';
import {
  IconAlert,
  IconArrowRight,
  IconCamera,
  IconCheck,
  IconInfo,
  IconQr,
  IconUpload,
} from '../components/icons';

type State =
  | { status: 'idle' }
  | { status: 'working' }
  | { status: 'ok'; read: ReceiptRead; preview: string; file: string }
  | { status: 'fail'; message: string; preview: string | null; detail?: string };

export default function Scan() {
  const quick = useQuickAdd();
  const [state, setState] = useState<State>({ status: 'idle' });
  const [dragging, setDragging] = useState(false);
  const [manual, setManual] = useState('');
  const urls = useRef<string[]>([]);
  const resultRef = useRef<HTMLElement>(null);

  useEffect(
    () => () => {
      urls.current.forEach((url) => URL.revokeObjectURL(url));
    },
    [],
  );

  /* Di ponsel kartu hasil ada di bawah kotak unggah, jadi antar ke sana. */
  useEffect(() => {
    if (state.status !== 'ok' && state.status !== 'fail') return;
    if (window.innerWidth >= 720) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    resultRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }, [state.status]);

  const remember = (url: string) => {
    urls.current.push(url);
    return url;
  };

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setState({
        status: 'fail',
        message: 'File harus berupa gambar (JPG atau PNG).',
        preview: null,
      });
      return;
    }
    const preview = remember(URL.createObjectURL(file));
    setState({ status: 'working' });
    try {
      const raw = await decodeQrFromFile(file);
      if (!raw) {
        setState({
          status: 'fail',
          message: 'Tidak bisa membaca total. Isi manual.',
          preview,
          detail: 'QR tidak ditemukan atau terlalu kecil. Coba foto lebih dekat dan pastikan QR tidak terlipat.',
        });
        return;
      }
      const read = parseReceiptPayload(raw);
      setState({ status: 'ok', read, preview, file: file.name });
    } catch {
      setState({
        status: 'fail',
        message: 'Tidak bisa membaca total. Isi manual.',
        preview,
        detail: 'Gambar gagal diproses di perangkat ini.',
      });
    }
  };

  const useSample = async () => {
    setState({ status: 'working' });
    try {
      const response = await fetch('/contoh-struk-qr.png');
      if (!response.ok) throw new Error('missing sample');
      const blob = await response.blob();
      const file = new File([blob], 'contoh-struk.png', { type: blob.type || 'image/png' });
      await handleFile(file);
    } catch {
      setState({
        status: 'fail',
        message: 'Contoh struk tidak tersedia.',
        preview: null,
        detail: 'Muat ulang halaman lalu coba lagi.',
      });
    }
  };

  const startManual = () => {
    const digits = manual.replace(/[^\d]/g, '');
    if (!digits) return;
    quick.open({ amount: Number(digits), note: 'Belanja (isi manual)', source: 'scan' });
  };

  const useRead = () => {
    if (state.status !== 'ok') return;
    quick.open({
      amount: state.read.amount ?? undefined,
      note: state.read.merchant ? `${state.read.merchant} (dari struk)` : 'Dari struk',
      source: 'scan',
    });
  };

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1>Scan QR struk</h1>
          <p className="lede" style={{ marginTop: 6, fontSize: 13.5 }}>
            Ambil foto struk, QR dibaca langsung di perangkat. Tidak ada foto yang diunggah ke mana
            pun.
          </p>
        </div>
      </div>

      <div className="scan">
        <section className="card card--pad-lg" aria-labelledby="scan-upload-title">
          <div className="card__head">
            <h2 id="scan-upload-title">1. Pilih foto struk</h2>
            <span className="tag tag--line">JPG atau PNG</span>
          </div>

          <div
            className={`drop${dragging ? ' is-drag' : ''}`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              const file = event.dataTransfer.files?.[0];
              if (file) void handleFile(file);
            }}
          >
            <span className="drop__frame" aria-hidden="true">
              <IconQr size={28} />
            </span>
            <h2 style={{ fontSize: 18 }}>
              {state.status === 'working' ? 'Membaca QR' : 'Letakkan foto struk di sini'}
            </h2>
            <p>
              Pilih file dari galeri, atau tarik ke kotak ini. QR di struk akan dibaca otomatis
              untuk mengisi jumlah.
            </p>
            <div className="row" style={{ justifyContent: 'center', gap: 8, width: '100%', maxWidth: 320 }}>
              <label
                className="btn btn--ink"
                style={{ cursor: 'pointer', position: 'relative', flex: '1 1 0', minWidth: 0 }}
              >
                <IconUpload size={17} />
                Pilih foto
                <input
                  type="file"
                  accept="image/*"
                  style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void handleFile(file);
                    event.target.value = '';
                  }}
                />
              </label>
              <label
                className="btn btn--cream"
                style={{ cursor: 'pointer', position: 'relative', flex: '1 1 0', minWidth: 0 }}
              >
                <IconCamera size={17} />
                Ambil foto
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void handleFile(file);
                    event.target.value = '';
                  }}
                />
              </label>
            </div>
            <button type="button" className="card__link" onClick={() => void useSample()}>
              Coba contoh QR struk
              <IconArrowRight size={13} />
            </button>
            <span className="drop__hint">
              Foto hanya diproses di browser. Tidak disimpan setelah halaman ditutup.
            </span>
          </div>

          <div className="steps" style={{ marginTop: 18 }}>
            <div className="step">
              <b aria-hidden="true">1</b>
              <span>Foto struk dari aplikasi kasir atau struk kertas, pastikan QR terlihat jelas.</span>
            </div>
            <div className="step">
              <b aria-hidden="true">2</b>
              <span>Jumlah yang terbaca ditandai perlu dicek, lalu pilih kategori dan dompet.</span>
            </div>
            <div className="step">
              <b aria-hidden="true">3</b>
              <span>Simpan. Transaksi langsung masuk ke daftar dan laporan bulan ini.</span>
            </div>
          </div>
        </section>

        <section
          className="card card--pad-lg scan-result-card"
          aria-labelledby="scan-result-title"
          ref={resultRef}
        >
          <div className="card__head">
            <h2 id="scan-result-title">2. Hasil baca</h2>
            {state.status === 'ok' ? (
              <span className="tag tag--safe">
                <IconCheck size={12} />
                QR terbaca
              </span>
            ) : null}
          </div>

          {state.status === 'idle' ? (
            <div className="empty" style={{ borderStyle: 'solid', borderColor: 'var(--line)' }}>
              <span className="empty__icon" aria-hidden="true">
                <IconInfo size={22} />
              </span>
              <h3>Belum ada foto</h3>
              <p>Setelah foto dibaca, nominal dan nama toko muncul di sini untuk kamu cek.</p>
            </div>
          ) : null}

          {state.status === 'working' ? (
            <div aria-live="polite" style={{ display: 'grid', gap: 12 }}>
              <p className="muted" style={{ fontSize: 13, fontWeight: 600 }}>
                Membaca QR di perangkat...
              </p>
              <div className="sk" style={{ height: 200, borderRadius: 22 }} />
              <div className="sk" style={{ height: 56 }} />
            </div>
          ) : null}

          {state.status === 'fail' ? (
            <div style={{ display: 'grid', gap: 14 }}>
              <div className="alert" role="alert">
                <IconAlert size={16} />
                {state.message}
              </div>
              {state.detail ? <p className="muted" style={{ fontSize: 12.5 }}>{state.detail}</p> : null}
              {state.preview ? (
                <div className="preview">
                  <img src={state.preview} alt="Foto struk yang tidak terbaca" width={600} height={750} />
                </div>
              ) : null}
              <Field label="Isi jumlah manual" htmlFor="scan-manual">
                <input
                  id="scan-manual"
                  className="input input--num"
                  inputMode="numeric"
                  placeholder="Rp0"
                  value={manual}
                  onChange={(event) => setManual(event.target.value)}
                />
              </Field>
              <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                <Button variant="primary" onClick={startManual} disabled={!manual.replace(/\D/g, '')}>
                  Isi nominal manual
                </Button>
                <Button variant="ghost" onClick={() => setState({ status: 'idle' })}>
                  Coba foto lain
                </Button>
              </div>
            </div>
          ) : null}

          {state.status === 'ok' ? (
            <div className="scan-result">
              <div className="preview">
                <img src={state.preview} alt={`Struk dari ${state.file}`} width={600} height={750} />
              </div>

              <div>
                <p className="eyebrow">TOTAL TERBACA</p>
                <p className="num" style={{ fontSize: 34, marginTop: 4 }}>
                  {state.read.amount ? rupiah(state.read.amount) : 'Belum terbaca'}
                </p>
              </div>

              <dl className="kv">
                <dt>Toko</dt>
                <dd>{state.read.merchant ?? 'Tidak diketahui'}</dd>
                <dt>Sumber</dt>
                <dd>{state.read.via === 'json' ? 'Data JSON di QR' : state.read.via === 'url' ? 'Tautan struk' : 'Teks QR'}</dd>
                <dt>Isi QR</dt>
                <dd title={state.read.raw}>
                  {state.read.raw.length > 64 ? `${state.read.raw.slice(0, 64)}...` : state.read.raw}
                </dd>
              </dl>

              {state.read.amount ? (
                <div className="alert alert--butter">
                  <IconAlert size={16} />
                  Jumlah dari struk perlu dicek. Perbaiki kalau salah baca sebelum simpan.
                </div>
              ) : (
                <div className="alert" role="alert">
                  <IconAlert size={16} />
                  Nominal tidak terbaca. Isi manual di form transaksi.
                </div>
              )}

              <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                <Button variant="primary" onClick={useRead}>
                  <IconCheck size={16} />
                  Lanjut isi transaksi
                </Button>
                <Button variant="ghost" onClick={() => setState({ status: 'idle' })}>
                  Scan ulang
                </Button>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
