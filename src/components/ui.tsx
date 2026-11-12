import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { initials } from '../lib/format';
import { IconAlert, IconCheck, IconChevronLeft, IconChevronRight, IconClose, IconSparkle } from './icons';

/* Button ----------------------------------------------------------------- */

type ButtonVariant = 'primary' | 'cream' | 'ink' | 'ghost' | 'quiet' | 'danger' | 'teal';

export function Button({
  variant = 'cream',
  size = 'md',
  block = false,
  className,
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: 'md' | 'sm';
  block?: boolean;
}) {
  const classes = [
    'btn',
    variant !== 'cream' ? `btn--${variant}` : 'btn--cream',
    size === 'sm' ? 'btn--sm' : '',
    block ? 'btn--block' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  return <button type={type} className={classes} {...rest} />;
}

/* Field ------------------------------------------------------------------ */

export function Field({
  label,
  htmlFor,
  error,
  hint,
  counter,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  counter?: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>
        <span>{label}</span>
        {counter ? <span className="field__count">{counter}</span> : null}
      </label>
      {children}
      {error ? (
        <p className="error-text" id={`${htmlFor}-error`}>
          <IconAlert size={14} />
          {error}
        </p>
      ) : hint ? (
        <p className="field__count">{hint}</p>
      ) : null}
    </div>
  );
}

/* Avatar ----------------------------------------------------------------- */

export function Avatar({
  name,
  size = 'md',
  tone,
}: {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  tone?: 'teal' | 'pink' | 'ink';
}) {
  const classes = ['avatar', size !== 'md' ? `avatar--${size}` : '', tone ? `avatar--${tone}` : '']
    .filter(Boolean)
    .join(' ');
  return (
    <span className={classes} aria-hidden="true">
      {initials(name) || '?'}
    </span>
  );
}

/* Sheet ------------------------------------------------------------------ */

export function Sheet({
  open,
  onClose,
  title,
  eyebrow,
  children,
  footer,
  small = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  children: ReactNode;
  footer?: ReactNode;
  small?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusables = () =>
      Array.from(
        panel?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);

    const raf = requestAnimationFrame(() => {
      const auto = panel?.querySelector<HTMLElement>('[data-autofocus]');
      (auto ?? focusables()[0] ?? panel)?.focus();
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="scrim"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={`sheet${small ? ' sheet--sm' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={panelRef}
        tabIndex={-1}
      >
        <div className="sheet__handle" />
        <header className="sheet__head">
          <div>
            {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
            <h2 id={titleId}>{title}</h2>
          </div>
          <button type="button" className="icon-btn icon-btn--plain" onClick={onClose} aria-label="Tutup">
            <IconClose size={20} />
          </button>
        </header>
        <div className="sheet__body">{children}</div>
        {footer ? <footer className="sheet__foot">{footer}</footer> : null}
      </div>
    </div>,
    document.body,
  );
}

/* Confirm ---------------------------------------------------------------- */

export function ConfirmSheet({
  open,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel = 'Hapus',
  tone = 'danger',
  requireText,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body: ReactNode;
  confirmLabel?: string;
  tone?: 'danger' | 'primary';
  requireText?: string;
}) {
  const [typed, setTyped] = useState('');
  const inputId = useId();

  useEffect(() => {
    if (open) setTyped('');
  }, [open]);

  const ready = !requireText || typed.trim() === requireText;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      small
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Batal
          </Button>
          <Button variant={tone === 'danger' ? 'primary' : 'ink'} onClick={onConfirm} disabled={!ready}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div style={{ display: 'grid', gap: 12 }}>
        <p className="lede" style={{ fontSize: 13.5 }}>
          {body}
        </p>
        {requireText ? (
          <Field label={`Ketik ${requireText} untuk melanjutkan`} htmlFor={inputId}>
            <input
              id={inputId}
              className="input"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
              data-autofocus
            />
          </Field>
        ) : null}
      </div>
    </Sheet>
  );
}

/* Toast ------------------------------------------------------------------ */

interface ToastItem {
  id: number;
  message: string;
  tone: 'default' | 'warn';
  actionLabel?: string;
  onAction?: () => void;
  duration: number;
}

type ToastInput = Omit<ToastItem, 'id' | 'tone' | 'duration'> & {
  tone?: 'default' | 'warn';
  duration?: number;
};

const ToastContext = createContext<{ push: (item: ToastInput) => void }>({
  push: () => undefined,
});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (item: ToastInput) => {
      const id = Date.now() + Math.random();
      const duration = item.duration ?? 4200;
      setItems((prev) => [...prev.slice(-1), { ...item, id, tone: item.tone ?? 'default', duration }]);
      const timer = window.setTimeout(() => dismiss(id), duration);
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((timer) => window.clearTimeout(timer));
      map.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      {createPortal(
        <div className="toast-wrap" role="status" aria-live="polite">
          {items.map((item) => (
            <div className={`toast${item.tone === 'warn' ? ' toast--warn' : ''}`} key={item.id}>
              <span className="toast__icon">
                {item.tone === 'warn' ? <IconAlert size={15} /> : <IconCheck size={15} />}
              </span>
              <span>{item.message}</span>
              {item.actionLabel ? (
                <button
                  type="button"
                  className="toast__action"
                  onClick={() => {
                    item.onAction?.();
                    dismiss(item.id);
                  }}
                >
                  {item.actionLabel}
                </button>
              ) : null}
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext).push;
}

/* Segmented -------------------------------------------------------------- */

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  block = false,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string; icon?: ReactNode }>;
  label: string;
  block?: boolean;
}) {
  return (
    <div className={`segmented${block ? ' segmented--block' : ''}`} role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}

/* Month bar -------------------------------------------------------------- */

export function MonthBar({
  month,
  onChange,
  maxMonth,
}: {
  month: string;
  onChange: (month: string) => void;
  maxMonth?: string;
}) {
  const shift = (delta: number) => {
    const [y, m] = month.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1 + delta, 1));
    onChange(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`);
  };
  const label = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(
    new Date(`${month}-01T12:00:00+07:00`),
  );
  const canNext = !maxMonth || month < maxMonth;

  return (
    <div className="month-bar">
      <p className="month-bar__label">{label}</p>
      <div className="row" style={{ gap: 2 }}>
        <button
          type="button"
          className="icon-btn icon-btn--plain"
          onClick={() => shift(-1)}
          aria-label="Bulan sebelumnya"
        >
          <IconChevronLeft size={20} />
        </button>
        <button
          type="button"
          className="icon-btn icon-btn--plain"
          onClick={() => shift(1)}
          aria-label="Bulan berikutnya"
          disabled={!canNext}
          style={!canNext ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
        >
          <IconChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}

/* Empty ------------------------------------------------------------------ */

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty__icon" aria-hidden="true">
        {icon}
      </span>
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </div>
  );
}

/* Stage ------------------------------------------------------------------ */

export function Stage() {
  return (
    <div className="stage" aria-hidden="true">
      <span className="stage__arc stage__arc--pink" />
      <span className="stage__arc stage__arc--teal" />
      <IconSparkle className="stage__spark stage__spark--a" size={26} />
      <IconSparkle className="stage__spark stage__spark--b" size={18} />
    </div>
  );
}
