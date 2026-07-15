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

  useEffect(() => {
    const saved = localStorage.getItem('dsta_theme') as Mode | null;
    if (saved === 'dark' || saved === 'light') setMode(saved);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-zone', 'enterprise');
    document.documentElement.setAttribute('data-mode', mode);
    localStorage.setItem('dsta_theme', mode);
  }, [mode]);

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
