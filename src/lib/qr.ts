import jsQR from 'jsqr';

export interface ReceiptRead {
  raw: string;
  amount: number | null;
  merchant: string | null;
  via: 'json' | 'url' | 'teks';
}

/** Reads the first QR code found in an image file, entirely in the browser. */
export async function decodeQrFromFile(file: File): Promise<string | null> {
  const bitmap = await createImageBitmap(file);
  try {
    const max = 1600;
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, width, height);
    const image = ctx.getImageData(0, 0, width, height);
    const code = jsQR(image.data, width, height, { inversionAttempts: 'attemptBoth' });
    return code?.data ?? null;
  } finally {
    bitmap.close?.();
  }
}

export async function decodeQrFromUrl(url: string): Promise<string | null> {
  const res = await fetch(url);
  if (!res.ok) return null;
  const blob = await res.blob();
  return decodeQrFromFile(new File([blob], 'contoh-struk.png', { type: blob.type }));
}

function parseNumberToken(token: string): number | null {
  let s = token.trim().replace(/\s/g, '');
  if (!/\d/.test(s)) return null;
  const dot = s.lastIndexOf('.');
  const comma = s.lastIndexOf(',');
  if (dot >= 0 && comma >= 0) {
    s = dot > comma ? s.replace(/,/g, '') : s.replace(/\./g, '').replace(',', '.');
  } else if (dot >= 0) {
    const parts = s.split('.');
    if (parts.length > 2) s = s.replace(/\./g, '');
    else if (parts[1].length === 3) s = s.replace('.', '');
  } else if (comma >= 0) {
    const parts = s.split(',');
    if (parts.length > 2) s = s.replace(/,/g, '');
    else if (parts[1].length === 3) s = s.replace(',', '');
    else s = s.replace(',', '.');
  }
  const value = Number(s);
  return Number.isFinite(value) ? Math.round(value) : null;
}

function readMerchant(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const clean = value.trim();
  if (!clean || clean.length > 42 || /^https?:/i.test(clean)) return null;
  return clean;
}

const LABELED = /(?:grand\s*total|total|jumlah|tagihan|dibayar|bayar)\s*[:=]?\s*(?:rp\.?\s*)?([\d][\d.,\s]{2,18})/i;

/** Turns whatever the QR carries into a rupiah amount, or nothing at all. */
export function parseReceiptPayload(raw: string): ReceiptRead {
  const text = raw.trim();
  const result: ReceiptRead = { raw: text, amount: null, merchant: null, via: 'teks' };

  if (text.startsWith('{')) {
    try {
      const data = JSON.parse(text) as Record<string, unknown>;
      const keys = ['total', 'grandTotal', 'grand_total', 'amount', 'nominal', 'tagihan', 'harga'];
      for (const key of keys) {
        const value = data[key];
        if (typeof value === 'number' && value > 0) {
          result.amount = Math.round(value);
          break;
        }
        if (typeof value === 'string') {
          const parsed = parseNumberToken(value);
          if (parsed && parsed > 0) {
            result.amount = parsed;
            break;
          }
        }
      }
      result.merchant =
        readMerchant(data.merchant) ?? readMerchant(data.store) ?? readMerchant(data.name);
      if (result.amount) result.via = 'json';
      return result;
    } catch {
      /* not JSON after all, keep going */
    }
  }

  if (/^https?:/i.test(text)) {
    try {
      const url = new URL(text);
      const keys = ['total', 'amount', 'nominal', 'grand_total', 'grandTotal', 'tagihan', 'harga'];
      for (const key of keys) {
        const value = url.searchParams.get(key);
        if (!value) continue;
        const parsed = parseNumberToken(value);
        if (parsed && parsed > 0) {
          result.amount = parsed;
          break;
        }
      }
      result.merchant =
        readMerchant(url.searchParams.get('merchant') ?? '') ??
        readMerchant(url.searchParams.get('nama') ?? '') ??
        readMerchant(url.searchParams.get('toko') ?? '') ??
        readMerchant(url.searchParams.get('store') ?? '') ??
        readMerchant(url.hostname.replace(/^www\./, ''));
      if (result.amount) result.via = 'url';
      return result;
    } catch {
      /* fall through to text parsing */
    }
  }

  const labeled = text.match(LABELED);
  if (labeled) {
    const parsed = parseNumberToken(labeled[1]);
    if (parsed && parsed > 0) result.amount = parsed;
  }

  if (!result.amount) {
    const rp = [...text.matchAll(/rp\.?\s*([\d][\d.,]{2,})/gi)]
      .map((m) => parseNumberToken(m[1]))
      .filter((n): n is number => Boolean(n && n > 0));
    if (rp.length > 0) result.amount = Math.max(...rp);
  }

  const firstLine = text.split(/\r?\n/)[0];
  if (firstLine && firstLine !== text) result.merchant = readMerchant(firstLine);

  return result;
}
