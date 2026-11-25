import { useEffect, useState } from 'react';

const media = () => window.matchMedia('(prefers-color-scheme: dark)');

/** Applies the theme setting ('light' | 'dark' | 'system') to <html>. Returns the resolved theme. */
export function useTheme(theme) {
  const [systemDark, setSystemDark] = useState(() => media().matches);

  useEffect(() => {
    const m = media();
    const onChange = (e) => setSystemDark(e.matches);
    m.addEventListener('change', onChange);
    return () => m.removeEventListener('change', onChange);
  }, []);

  const resolved = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolved === 'dark');
    document.documentElement.style.colorScheme = resolved;
  }, [resolved]);

  return resolved;
}
