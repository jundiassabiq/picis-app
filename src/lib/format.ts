export const TZ = 'Asia/Jakarta';

const IDR = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });
const COMPACT = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 });
const MONTH_LONG = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric', timeZone: TZ });
const MONTH_SHORT = new Intl.DateTimeFormat('id-ID', { month: 'short', timeZone: TZ });
const DAY_MONTH = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', timeZone: TZ });
const FULL_DATE = new Intl.DateTimeFormat('id-ID', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: TZ,
});

export function todayISO(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  return parts;
}

export function currentMonth(): string {
  return todayISO().slice(0, 7);
}

export function isoDate(value: string): Date {
  // Noon anchor keeps the calendar day stable regardless of the viewer time zone.
  return new Date(`${value}T12:00:00+07:00`);
}

export function rupiah(value: number, withSign = false): string {
  const abs = Math.abs(Math.round(value));
  const sign = value < 0 ? '-' : withSign ? '+' : '';
  return `${sign}Rp${IDR.format(abs)}`;
}

export function rupiahCompact(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}Rp${COMPACT.format(abs / 1_000_000_000)} M`;
  if (abs >= 1_000_000) return `${sign}Rp${COMPACT.format(abs / 1_000_000)} jt`;
  if (abs >= 1_000) return `${sign}Rp${Math.round(abs / 1_000)} rb`;
  return `${sign}Rp${abs}`;
}

/** Groups thousands without the currency mark, for inputs and dense rows. */
export function groupDigits(value: number): string {
  if (!Number.isFinite(value)) return '';
  return IDR.format(Math.round(value));
}

export function parseAmount(raw: string): number {
  const digits = raw.replace(/[^\d]/g, '');
  if (!digits) return 0;
  return Number(digits);
}

export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return MONTH_LONG.format(new Date(Date.UTC(y, m - 1, 1, 12)));
}

export function monthShort(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return MONTH_SHORT.format(new Date(Date.UTC(y, m - 1, 1, 12)));
}

export function monthOf(date: string): string {
  return date.slice(0, 7);
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function monthsEnding(month: string, count: number): string[] {
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) out.push(shiftMonth(month, -i));
  return out;
}

export function dayLabel(date: string): string {
  const today = todayISO();
  if (date === today) return 'Hari ini';
  const yesterday = new Date(`${today}T12:00:00+07:00`);
  yesterday.setDate(yesterday.getDate() - 1);
  const y = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(yesterday);
  if (date === y) return 'Kemarin';
  const d = isoDate(date);
  const sameYear = date.slice(0, 4) === today.slice(0, 4);
  return sameYear ? DAY_MONTH.format(d) : `${DAY_MONTH.format(d)} ${date.slice(0, 4)}`;
}

export function fullDateLabel(date: string): string {
  return FULL_DATE.format(isoDate(date));
}

export function niceDay(date: string): string {
  return DAY_MONTH.format(isoDate(date));
}

export function percent(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

export function isFutureMonth(month: string): boolean {
  return month > currentMonth();
}
