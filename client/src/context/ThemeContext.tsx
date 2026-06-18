import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { getDB } from '../lib/db';

interface ThemeContextValue {
  theme: string;
  isDark: boolean;
  setTheme: (name: string) => Promise<void>;
  toggleDark: () => Promise<void>;
  themes: string[];
  darkOverride: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'theme';
const DARK_KEY = 'theme_dark_override';
const DEFAULT_THEME = 'light';
const THEMES = ['light', 'dark', 'corporate'];

async function persistTheme(name: string) {
  try {
    localStorage.setItem(STORAGE_KEY, name);
    const db = await getDB();
    await db.put('settings', { key: 'theme', value: name });
  } catch {}
}

function getInitialTheme(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && THEMES.includes(stored)) return stored;
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
  } catch {}
  return DEFAULT_THEME;
}

function getDarkOverride(): boolean {
  try { return localStorage.getItem(DARK_KEY) === '1'; } catch { return false; }
}

function isDarkTheme(name: string, darkOverride?: boolean): boolean {
  if (name === 'dark') return true;
  if (darkOverride !== undefined) return darkOverride;
  return getDarkOverride();
}

function applyTheme(name: string, darkOverride?: boolean) {
  const root = document.documentElement;
  const dark = isDarkTheme(name, darkOverride);
  root.setAttribute('data-theme', name);
  root.setAttribute('data-mode', dark ? 'dark' : 'light');
  root.style.colorScheme = dark ? 'dark' : 'light';
  root.style.setProperty('--motion-duration', '0.01ms');
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState(getInitialTheme);
  const [darkOverride, setDarkOverride] = useState(getDarkOverride);

  const syncTheme = useCallback(async (name: string, dark?: boolean) => {
    applyTheme(name, dark);
    setThemeState(name);
    if (dark !== undefined) {
      setDarkOverride(dark);
      try { localStorage.setItem(DARK_KEY, dark ? '1' : '0'); } catch {}
    }
    await persistTheme(name);
  }, []);

  const setTheme = useCallback(async (name: string) => {
    const normalized = THEMES.includes(name) ? name : DEFAULT_THEME;
    await syncTheme(normalized);
  }, [syncTheme]);

  const toggleDark = useCallback(async () => {
    if (theme === 'dark') {
      await syncTheme('light', false);
    } else if (theme === 'light') {
      await syncTheme('dark', true);
    } else {
      // Corporate or other theme: toggle dark mode overlay
      const newDark = !darkOverride;
      await syncTheme(theme, newDark);
    }
  }, [theme, darkOverride, syncTheme]);

  useEffect(() => {
    applyTheme(theme, darkOverride);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored || stored === 'light' || stored === 'dark') {
        syncTheme(mq.matches ? 'dark' : 'light');
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [syncTheme]);

  const value = useMemo(() => ({
    theme,
    isDark: isDarkTheme(theme, darkOverride),
    setTheme,
    toggleDark,
    themes: THEMES,
    darkOverride,
  }), [theme, darkOverride, setTheme, toggleDark]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
