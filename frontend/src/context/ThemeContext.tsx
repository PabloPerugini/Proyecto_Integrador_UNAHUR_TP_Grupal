import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ThemeContext } from './ThemeContextValue';
import { clearTokenCache, readToken, toHex } from '../utils/color';

const THEME_KEY = 'theme';

function getInitialTheme(): 'light' | 'dark' {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    return stored === 'dark' || stored === 'light' ? stored : 'light';
  } catch {
    return 'light';
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const initial = getInitialTheme();
    document.documentElement.setAttribute('data-bs-theme', initial);
    return initial;
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-bs-theme', theme);
    clearTokenCache();
    const themeColor = toHex(readToken('--color-bg'));
    if (themeColor) {
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColor);
    }
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    const next = theme === 'light' ? 'dark' : 'light';
    // El atributo se actualiza antes del render para que readToken() resuelva
    // los tokens del tema nuevo en el mismo ciclo.
    document.documentElement.setAttribute('data-bs-theme', next);
    clearTokenCache();
    setTheme(next);
  }, [theme]);

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}