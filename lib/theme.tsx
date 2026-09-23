'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Mode = 'light' | 'dark';

interface ThemeCtx {
  mode: Mode;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeCtx>({ mode: 'light', toggle: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>('light');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('dsta_theme');
      if (saved === 'dark' || saved === 'light') setMode(saved);
    } catch { /* Keep the default when browser storage is unavailable. */ }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.setAttribute('data-zone', 'd-experience');
    document.documentElement.setAttribute('data-mode', mode);
    try { localStorage.setItem('dsta_theme', mode); } catch { /* The theme still applies for this visit. */ }
  }, [mode, ready]);

  function toggle() {
    setMode(m => (m === 'light' ? 'dark' : 'light'));
  }

  return (
    <ThemeContext.Provider value={{ mode, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
