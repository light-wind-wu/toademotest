'use client';

import { useState, useRef, useEffect } from 'react';
import { GraduationCap, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Option {
  value: string;
  label: string;
}

interface ProgToggleProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
}

export default function ProgToggle({ options, value, onChange }: ProgToggleProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const label = options.find(o => o.value === value)?.label ?? value;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(p => !p)}
        className="flex items-center gap-2.5 bg-surface text-fg border border-border px-4 py-2 rounded-xl font-semibold text-body-md transition-all hover:bg-bg-subtle shadow-sm"
      >
        <GraduationCap size={15} className="text-fg-muted" />
        <span>{label}</span>
        <ChevronDown size={14} className={cn('transition-transform duration-200', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1.5 bg-surface border border-border rounded-xl shadow-lg z-50 overflow-hidden min-w-max max-w-[calc(100vw-2rem)]">
          {options.map(o => (
            <button
              key={o.value}
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={cn(
                'w-full flex items-center gap-2.5 px-4 py-2.5 text-body-sm text-left transition-colors',
                o.value === value
                  ? 'bg-accent text-white font-semibold'
                  : 'text-fg hover:bg-bg-subtle',
              )}
            >
              <GraduationCap size={13} className={o.value === value ? 'text-white/80' : 'text-fg-muted'} />
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
