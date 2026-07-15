'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { PROGRAMMES_LIST, loadLiveProgrammeOptions } from './data';

interface ProgrammeCtx {
  activeProg: string;
  setActiveProg: (id: string) => void;
  progOpts: { value: string; label: string }[];
}

const LS_KEY = 'dsta_selected_programme';

const ProgrammeContext = createContext<ProgrammeCtx>({
  activeProg: PROGRAMMES_LIST[0]?.value ?? 'PROG-0009',
  setActiveProg: () => {},
  progOpts: PROGRAMMES_LIST,
});

export const PROGRAMMES_CHANGED_EVENT = 'dsta:programmes-changed';

export function ProgrammeProvider({ children }: { children: ReactNode }) {
  const [progOpts, setProgOpts] = useState(PROGRAMMES_LIST);
  const [activeProg, setActiveProgState] = useState(PROGRAMMES_LIST[0]?.value ?? 'PROG-0009');

  function refreshOpts() {
    const opts = loadLiveProgrammeOptions();
    setProgOpts(opts);
    setActiveProgState(prev => {
      if (opts.some(o => o.value === prev)) return prev;
      return opts[0]?.value ?? prev;
    });
  }

  useEffect(() => {
    const opts = loadLiveProgrammeOptions();
    setProgOpts(opts);
    const saved = localStorage.getItem(LS_KEY);
    if (saved && opts.some(o => o.value === saved)) {
      setActiveProgState(saved);
    } else if (opts.length > 0) {
      setActiveProgState(opts[0].value);
    }

    window.addEventListener(PROGRAMMES_CHANGED_EVENT, refreshOpts);
    return () => window.removeEventListener(PROGRAMMES_CHANGED_EVENT, refreshOpts);
  }, []);

  function setActiveProg(id: string) {
    setActiveProgState(id);
    localStorage.setItem(LS_KEY, id);
  }

  return (
    <ProgrammeContext.Provider value={{ activeProg, setActiveProg, progOpts }}>
      {children}
    </ProgrammeContext.Provider>
  );
}

export function useProgramme() {
  return useContext(ProgrammeContext);
}
