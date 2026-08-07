'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui-legacy/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface UnsavedChangesCtx {
  isDirty: boolean;
  setDirty: (v: boolean) => void;
  safeNavigate: (url: string) => void;
  /** Requests leaving the page, always prompting for confirmation (dirty or not). */
  requestLeave: (url: string) => void;
}

const Ctx = createContext<UnsavedChangesCtx>({
  isDirty: false,
  setDirty: () => {},
  safeNavigate: () => {},
  requestLeave: () => {},
});

export function useUnsavedChanges() { return useContext(Ctx); }

export function UnsavedChangesProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isDirty, setDirtyState] = useState(false);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);

  const setDirty = useCallback((v: boolean) => setDirtyState(v), []);

  const safeNavigate = useCallback((url: string) => {
    if (isDirty) {
      setPendingUrl(url);
    } else {
      router.push(url);
    }
  }, [isDirty, router]);

  const requestLeave = useCallback((url: string) => {
    setPendingUrl(url);
  }, []);

  useEffect(() => {
    if (!isDirty) return;
    function handler(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = '';
    }
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  function confirmLeave() {
    if (!pendingUrl) return;
    const url = pendingUrl;
    setPendingUrl(null);
    setDirtyState(false);
    router.push(url);
  }

  function cancelLeave() {
    setPendingUrl(null);
  }

  return (
    <Ctx.Provider value={{ isDirty, setDirty, safeNavigate, requestLeave }}>
      {children}
      <Dialog open={!!pendingUrl} onOpenChange={open => { if (!open) cancelLeave(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Leave this page?</DialogTitle>
            <DialogDescription>
              Any unsaved changes will be lost if you leave this page.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={cancelLeave}>Stay on page</Button>
            <Button variant="danger" onClick={confirmLeave}>Leave anyway</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Ctx.Provider>
  );
}
