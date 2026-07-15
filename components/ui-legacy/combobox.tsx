'use client';

import { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ComboboxProps {
  selected:      string[];
  onToggle:      (val: string) => void;
  options?:      string[];
  groups?:       { label: string; opts: string[] }[];
  placeholder?:  string;
  searchOnly?:   boolean;  // hide all options until user types
  className?:    string;
}

export default function Combobox({
  selected, onToggle, options = [], groups, placeholder = 'Select…', searchOnly = false, className,
}: ComboboxProps) {
  const [open, setOpen]     = useState(false);
  const [query, setQuery]   = useState('');
  const containerRef        = useRef<HTMLDivElement>(null);
  const inputRef            = useRef<HTMLInputElement>(null);

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

  const allOpts = groups ? groups.flatMap(g => g.opts) : options;
  const q       = query.trim().toLowerCase();
  const matched = q ? allOpts.filter(o => o.toLowerCase().includes(q)) : null;
  const showAll = !searchOnly;

  function renderOptions() {
    if (!q && searchOnly) return (
      <p className="px-3 py-6 text-center text-body-sm text-fg-muted">Type to search…</p>
    );
    if (matched) {
      if (matched.length === 0) return (
        <p className="px-3 py-6 text-center text-body-sm text-fg-muted">No results for "{query}"</p>
      );
      return matched.map(o => <OptionRow key={o} label={o} checked={selected.includes(o)} onToggle={onToggle} />);
    }
    if (groups) return groups.map(g => (
      <div key={g.label}>
        <p className="px-3 py-1.5 text-[12px] font-bold text-fg-subtle uppercase tracking-wider bg-bg-muted sticky top-0 z-10">{g.label}</p>
        {g.opts.map(o => <OptionRow key={o} label={o} checked={selected.includes(o)} onToggle={onToggle} />)}
      </div>
    ));
    return options.map(o => <OptionRow key={o} label={o} checked={selected.includes(o)} onToggle={onToggle} />);
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={cn(
          'w-full flex items-center justify-between gap-2 px-3 py-1.5 border rounded-lg text-body-sm bg-surface transition-colors text-left',
          open ? 'border-accent ring-1 ring-accent/30' : 'border-border hover:border-fg-muted',
        )}
      >
        <span className={selected.length === 0 ? 'text-fg-muted' : 'text-fg'}>
          {selected.length === 0 ? placeholder : `${selected.length} selected`}
        </span>
        <ChevronDown size={14} className={cn('text-fg-muted shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {selected.map(s => (
            <span key={s} className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent/10 text-accent rounded text-[13px] font-medium max-w-[200px]">
              <span className="truncate">{s}</span>
              <button type="button" onClick={() => onToggle(s)} className="hover:text-danger transition-colors shrink-0"><X size={10} /></button>
            </span>
          ))}
        </div>
      )}

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
                placeholder="Search…"
                className="w-full pl-8 pr-3 py-1.5 text-body-sm bg-bg-subtle border border-border rounded-lg outline-none focus:border-accent"
              />
            </div>
          </div>
          {/* Options */}
          <div className="max-h-56 overflow-y-auto">
            {renderOptions()}
          </div>
          {selected.length > 0 && (
            <div className="px-3 py-2 border-t border-border bg-bg-subtle flex items-center justify-between">
              <span className="text-[13px] text-fg-muted">{selected.length} selected</span>
              <button type="button" onClick={() => selected.forEach(s => onToggle(s))} className="text-[13px] text-danger hover:underline">Clear all</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function OptionRow({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: (v: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onToggle(label)}
      className="w-full flex items-center gap-2.5 px-3 py-2 text-body-sm hover:bg-bg-subtle transition-colors text-left"
    >
      <span className={cn(
        'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors',
        checked ? 'bg-accent border-accent' : 'border-border bg-surface',
      )}>
        {checked && <Check size={10} className="text-accent-fg" />}
      </span>
      <span className="flex-1">{label}</span>
    </button>
  );
}
