'use client';

import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

export function Accordion({
  title,
  defaultOpen = false,
  children,
  className,
  first = false,
  last = false,
}: {
  title: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
  first?: boolean;
  last?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={cn(
        'border border-border bg-surface',
        first ? 'rounded-t-lg' : 'rounded-none border-t-0',
        last ? 'rounded-b-lg' : '',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-left bg-bg-muted transition-colors"
      >
        <span className="text-body-sm font-semibold text-fg">{title}</span>
        <ChevronDown
          size={16}
          className={cn(
            'shrink-0 text-fg-muted transition-transform duration-200',
            open ? 'rotate-180' : ''
          )}
        />
      </button>
      {open && <div className="border-t border-border px-4 py-4">{children}</div>}
    </div>
  );
}

export default Accordion;
