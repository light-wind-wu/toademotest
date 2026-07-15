'use client';

import { useId } from 'react';
import { X } from 'lucide-react';
import { useFocusTrap } from '@/lib/use-focus-trap';

interface DrawerProps {
  open:     boolean;
  onClose:  () => void;
  title:    string;
  subtitle?: string;
  width?:   string;
  children: React.ReactNode;
  footer?:  React.ReactNode;
}

export default function Drawer({ open, onClose, title, subtitle, width = '520px', children, footer }: DrawerProps) {
  const titleId = useId();
  const panelRef = useFocusTrap<HTMLDivElement>(open, onClose);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-fg/20 z-[60]" onClick={onClose} aria-hidden="true" />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="fixed right-0 top-0 h-full bg-surface border-l border-border z-[70] flex flex-col shadow-2xl outline-none"
        style={{ width: `min(100vw, ${width})` }}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="min-w-0 pr-4">
            <h2 id={titleId} className="text-headline-md text-fg truncate">{title}</h2>
            {subtitle && <p className="text-body-sm text-fg-muted mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-bg-subtle text-fg-muted transition-colors shrink-0 mt-0.5"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>

        {/* Optional sticky footer */}
        {footer && (
          <div className="shrink-0 border-t border-border px-6 py-4 bg-surface">
            {footer}
          </div>
        )}
      </div>
    </>
  );
}
