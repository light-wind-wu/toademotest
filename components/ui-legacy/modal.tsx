'use client';

import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useFocusTrap } from '@/lib/use-focus-trap';

const MAX_WIDTH = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
  '2xl': 'max-w-4xl',
};

export default function Modal({
  open,
  onClose,
  children,
  maxWidth = 'sm',
  ariaLabel,
  labelledBy,
  destructive = false,
}: {
  open: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  /** Accessible name when the dialog has no visible heading to point at. */
  ariaLabel?: string;
  /** id of the visible heading that names this dialog (preferred). */
  labelledBy?: string;
  /** Alert/destructive dialogs use role="alertdialog" and disable scrim click-out + Esc. */
  destructive?: boolean;
}) {
  const panelRef = useFocusTrap<HTMLDivElement>(open, onClose, { closeOnEsc: !destructive });

  // Lock background page scroll while the dialog is open so scrolling inside the
  // dialog doesn't chain through to the page behind it.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;
  return (
    <>
      <div
        className="fixed inset-0 bg-fg/30 z-[200]"
        onClick={destructive ? undefined : onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role={destructive ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-label={labelledBy ? undefined : ariaLabel ?? 'Dialog'}
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={cn(
          'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
          'bg-surface rounded-2xl shadow-2xl z-[210] w-full mx-4 p-6 modal-animate outline-none',
          MAX_WIDTH[maxWidth],
        )}
      >
        {children}
      </div>
    </>
  );
}
