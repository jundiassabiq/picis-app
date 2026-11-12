import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { ThemePref } from '../lib/types';
import { setTheme, useDB } from '../lib/db';

interface ThemeValue {
  pref: ThemePref;
  resolved: 'light' | 'dark';
  set: (pref: ThemePref) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeValue>({
  pref: 'system',
  resolved: 'light',
  set: () => undefined,
  toggle: () => undefined,
});

const DARK_QUERY = '(prefers-color-scheme: dark)';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const db = useDB();
  const pref = db.theme;
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia?.(DARK_QUERY).matches ?? false,
  );

  useEffect(() => {
    const query = window.matchMedia(DARK_QUERY);
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const resolved: 'light' | 'dark' =
    pref === 'system' ? (systemDark ? 'dark' : 'light') : pref;

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = resolved;
    root.style.colorScheme = resolved;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', resolved === 'dark' ? '#14100D' : '#F5EBD8');
  }, [resolved]);

  const value = useMemo<ThemeValue>(
    () => ({
      pref,
      resolved,
      set: (next) => setTheme(next),
      // Tombol cepat selalu menghasilkan perubahan yang terlihat,
      // termasuk saat preferensi sedang "sistem".
      toggle: () => setTheme(resolved === 'dark' ? 'light' : 'dark'),
    }),
    [pref, resolved],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
