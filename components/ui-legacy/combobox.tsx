'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  chipClassName?: string;
  chips?:        'inline' | 'below';
}

export default function Combobox({
  selected, onToggle, options = [], groups, placeholder = 'Select…', searchOnly = false, className, chipClassName, chips = 'below',
}: ComboboxProps) {
  const [open, setOpen]     = useState(false);
  const [query, setQuery]   = useState('');
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const containerRef        = useRef<HTMLDivElement>(null);
  const inputRef            = useRef<HTMLInputElement>(null);

  const updatePosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setPosition({
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 280),
    });
  }, []);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    if (open) {
      updatePosition();
      document.addEventListener('mousedown', onOutside);
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        document.removeEventListener('mousedown', onOutside);
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [open, updatePosition]);

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

  const inlineChips = chips === 'inline' && selected.length > 0
    ? renderInlineChips(selected, chipClassName, onToggle)
    : null;

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={cn(
          'w-full max-w-full flex items-center gap-2 px-3 py-1.5 border rounded-lg text-body-sm bg-surface transition-colors text-left',
          open ? 'border-accent ring-1 ring-accent/30' : 'border-border hover:border-fg-muted',
          chips === 'inline' && 'min-h-[38px]',
        )}
      >
        <span className={cn('flex-1 flex items-center gap-1.5 truncate', selected.length === 0 ? 'text-fg-muted' : 'text-fg')}>
          {chips === 'inline' ? (
            selected.length === 0 ? placeholder : inlineChips
          ) : (
            selected.length === 0 ? placeholder : `${selected.length} selected`
          )}
        </span>
        <ChevronDown size={14} className={cn('text-fg-muted shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {/* Selected chips */}
      {chips === 'below' && selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {selected.map(s => (
            <span key={s} className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[13px] font-medium max-w-[200px]',
              chipClassName ?? 'bg-accent/10 text-accent',
            )}>
              <span className="truncate">{s}</span>
              <button type="button" onClick={() => onToggle(s)} className="hover:text-fg transition-colors shrink-0"><X size={10} /></button>
            </span>
          ))}
        </div>
      )}

      {/* Dropdown */}
      {open && createPortal(
        <div
          onMouseDown={e => e.stopPropagation()}
          style={{ position: 'fixed', top: position.top, left: position.left, width: position.width }}
          className="z-[200] bg-surface border border-border rounded-xl shadow-xl overflow-hidden"
        >
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
        </div>,
        document.body,
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

function InlineChip({ label, chipClassName, onRemove }: { label: string; chipClassName?: string; onRemove: () => void }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-medium max-w-[160px] text-[rgba(69,85,108,1)]',
      chipClassName,
    )}>
      <span className="truncate">{label}</span>
      <span
        role="button"
        tabIndex={0}
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); e.preventDefault(); onRemove(); } }}
        className="shrink-0 cursor-pointer hover:opacity-80"
        aria-label={`Remove ${label}`}
      >
        <X size={10} className="text-current" />
      </span>
    </span>
  );
}

function renderInlineChips(selected: string[], chipClassName: string | undefined, onToggle: (val: string) => void) {
  const MAX_VISIBLE = 3;
  if (selected.length <= MAX_VISIBLE) {
    return selected.map(s => <InlineChip key={s} label={s} chipClassName={chipClassName} onRemove={() => onToggle(s)} />);
  }
  const visible = selected.slice(0, MAX_VISIBLE);
  const overflow = selected.length - MAX_VISIBLE;
  return (
    <>
      {visible.map(s => <InlineChip key={s} label={s} chipClassName={chipClassName} onRemove={() => onToggle(s)} />)}
      <span className="text-caption text-fg-muted">+{overflow}</span>
    </>
  );
}
