'use client';

/* ⚠ DEV-ONLY throwaway — DELETE BEFORE SHIP.
   A floating switch to flip the `categoryFormThumbnails` feature flag in place, so the
   two category-form-preview presentations (inline links vs. thumbnail gallery) can be
   compared without walking to Admin Settings. Deliberately styled as an obvious dev
   artifact (dashed amber chrome, "DEV" badge).

   Rendered through a portal to <body> so it's anchored to the viewport — the app shell's
   kinetic-scroll wrapper applies a CSS transform, which would otherwise make a plain
   position:fixed element scroll with (and clip against) the shell. Remove this file + its
   single mount in views/programme-form.tsx to fully excise it. */
import { Wrench, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSystemConfig, loadSystemConfig, saveSystemConfig } from '@/lib/portal-config';

export default function PreviewFlagFab() {
  const cfg = useSystemConfig();
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || dismissed) return null;

  const on = cfg.categoryFormThumbnails;
  const setOn = (next: boolean) => {
    if (next !== on) saveSystemConfig({ ...loadSystemConfig(), categoryFormThumbnails: next });
  };

  const catInput = cfg.categoryInput;
  const setCatInput = (next: 'radio' | 'dropdown') => {
    if (next !== catInput) saveSystemConfig({ ...loadSystemConfig(), categoryInput: next });
  };

  return createPortal(
    <div
      className="fixed bottom-5 left-5 z-[2147483647] w-[230px] rounded-xl border-2 border-dashed border-warning bg-surface-elevated p-3 shadow-lg"
      style={{ fontFamily: 'ui-monospace, monospace' }}
      data-zone="enterprise" data-mode="light"
    >
      <div className="flex items-center gap-1.5 mb-2">
        <Wrench size={12} className="text-warning" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-warning">Dev tool</span>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Hide dev tool for this session"
          className="ml-auto text-fg-subtle hover:text-fg"
        >
          <X size={13} />
        </button>
      </div>

      <p className="text-[11px] leading-snug text-fg-muted mb-2">
        Category form preview style — <span className="font-semibold text-fg">temporary toggle, will be removed.</span>
      </p>

      {/* segmented toggle between the two presentations */}
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-bg-muted p-1">
        <button
          type="button"
          onClick={() => setOn(false)}
          className={`rounded-md py-1 text-[11px] font-semibold transition-colors ${!on ? 'bg-accent text-accent-fg' : 'text-fg-muted hover:text-fg'}`}
        >
          Inline
        </button>
        <button
          type="button"
          onClick={() => setOn(true)}
          className={`rounded-md py-1 text-[11px] font-semibold transition-colors ${on ? 'bg-accent text-accent-fg' : 'text-fg-muted hover:text-fg'}`}
        >
          Thumbnails
        </button>
      </div>

      <p className="mt-3 text-[11px] leading-snug text-fg-muted mb-2">
        Internship category input — <span className="font-semibold text-fg">single-select style.</span>
      </p>

      {/* segmented toggle between radio group and dropdown */}
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-bg-muted p-1">
        <button
          type="button"
          onClick={() => setCatInput('radio')}
          className={`rounded-md py-1 text-[11px] font-semibold transition-colors ${catInput === 'radio' ? 'bg-accent text-accent-fg' : 'text-fg-muted hover:text-fg'}`}
        >
          Radio
        </button>
        <button
          type="button"
          onClick={() => setCatInput('dropdown')}
          className={`rounded-md py-1 text-[11px] font-semibold transition-colors ${catInput === 'dropdown' ? 'bg-accent text-accent-fg' : 'text-fg-muted hover:text-fg'}`}
        >
          Dropdown
        </button>
      </div>
    </div>,
    document.body,
  );
}
