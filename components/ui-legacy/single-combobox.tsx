'use client';

import { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SingleComboboxOption {
  value: string;
  label: string;
}

interface SingleComboboxProps {
  value:        string;
  onChange:     (val: string) => void;
  options:      SingleComboboxOption[];
  placeholder?: string;
  className?:   string;
}

export default function SingleCombobox({
  value, onChange, options, placeholder = 'Select…', className,
}: SingleComboboxProps) {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState('');
  const containerRef      = useRef<HTMLDivElement>(null);
  const inputRef          = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    if (open) document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const q       = query.trim().toLowerCase();
  const matched = q ? options.filter(o => o.label.toLowerCase().includes(q)) : options;
  const selected = options.find(o => o.value === value);

  function select(val: string) {
    onChange(val);
    setOpen(false);
    setQuery('');
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange('');
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={cn(
          'w-full flex items-center justify-between gap-2 px-4 py-2.5 border rounded-lg text-body-md bg-surface transition-colors text-left',
          open ? 'border-accent ring-2 ring-accent/20' : 'border-border hover:border-fg-muted',
        )}
      >
        <span className={cn('flex-1 truncate', selected ? 'text-fg' : 'text-fg-muted')}>
          {selected ? selected.label : placeholder}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {selected && (
            <span
              role="button"
              tabIndex={0}
              onClick={clear}
              onKeyDown={e => e.key === 'Enter' && clear(e as unknown as React.MouseEvent)}
              className="w-4 h-4 flex items-center justify-center text-fg-subtle hover:text-danger transition-colors rounded cursor-pointer"
            >
              <X size={12} />
            </span>
          )}
          <ChevronDown size={14} className={cn('text-fg-muted transition-transform', open && 'rotate-180')} />
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-[200] left-0 top-full mt-1 w-full min-w-[280px] bg-surface border border-border rounded-xl shadow-xl overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-muted pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search templates…"
                className="w-full pl-8 pr-3 py-1.5 text-body-sm bg-bg-subtle border border-border rounded-lg outline-none focus:border-accent"
              />
            </div>
          </div>
          {/* Options */}
          <div className="max-h-56 overflow-y-auto">
            {matched.length === 0 ? (
              <p className="px-3 py-6 text-center text-body-sm text-fg-muted">No results for "{query}"</p>
            ) : (
              matched.map(opt => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => select(opt.value)}
                    className={cn(
                      'w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors text-body-sm',
                      isSelected
                        ? 'bg-accent/8 text-accent font-medium'
                        : 'hover:bg-bg-subtle text-fg',
                    )}
                  >
                    <span className="flex-1">{opt.label}</span>
                    {isSelected && <Check size={14} className="text-accent shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
