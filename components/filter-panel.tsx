'use client';
import { useState, useRef } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

export interface FilterDef {
  key:     string;
  label:   string;
  options: { value: string; label: string }[];
}

export interface ActiveFilter {
  key:    string;
  values: string[];
}

interface Props {
  defs:     FilterDef[];
  filters:  ActiveFilter[];
  onChange: (filters: ActiveFilter[]) => void;
}

export function FilterPanel({ defs, filters, onChange }: Props) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [dropPos, setDropPos] = useState<Record<string, { top: number; left: number }>>({});

  function getValues(key: string): string[] {
    return filters.find(f => f.key === key)?.values ?? [];
  }

  function toggleChip(key: string) {
    const btn = btnRefs.current[key];
    if (btn) {
      const r = btn.getBoundingClientRect();
      setDropPos(prev => ({ ...prev, [key]: { top: r.bottom + 6, left: r.left } }));
    }
    setOpenKey(prev => prev === key ? null : key);
  }

  function toggleValue(key: string, value: string) {
    const current = getValues(key);
    const next = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    const existing = filters.find(f => f.key === key);
    if (existing) {
      onChange(next.length === 0
        ? filters.filter(f => f.key !== key)
        : filters.map(f => f.key === key ? { ...f, values: next } : f)
      );
    } else {
      onChange([...filters, { key, values: next }]);
    }
  }

  function clearFilter(key: string, e: React.MouseEvent) {
    e.stopPropagation();
    onChange(filters.filter(f => f.key !== key));
    if (openKey === key) setOpenKey(null);
  }

  const hasAnyActive = defs.some(d => getValues(d.key).length > 0);

  return (
    <>
      {openKey && (
        <div className="fixed inset-0 z-[150]" onClick={() => setOpenKey(null)} />
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {defs.map(def => {
          const selected = getValues(def.key);
          const isActive = selected.length > 0;
          const isOpen   = openKey === def.key;
          const pos      = dropPos[def.key];

          const chipLabel = isActive
            ? selected.length === 1
              ? `${def.label}: ${def.options.find(o => o.value === selected[0])?.label ?? selected[0]}`
              : `${def.label}: ${selected.length}`
            : def.label;

          return (
            <div key={def.key} className="relative">
              <button
                ref={el => { btnRefs.current[def.key] = el; }}
                onClick={() => toggleChip(def.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-body-sm font-medium transition-colors whitespace-nowrap',
                  isActive || isOpen
                    ? 'border-accent bg-accent/8 text-accent'
                    : 'border-border bg-surface text-fg-muted hover:text-fg hover:border-fg-muted'
                )}
              >
                {chipLabel}
                {isActive
                  ? <X size={12} className="shrink-0" onClick={e => clearFilter(def.key, e)} />
                  : <ChevronDown size={12} className={cn('shrink-0 transition-transform', isOpen && 'rotate-180')} />
                }
              </button>

              {isOpen && pos && (
                <div
                  className="fixed bg-surface border border-border rounded-xl shadow-lg z-[200] py-1.5 min-w-[11rem]"
                  style={{ top: pos.top, left: pos.left }}
                  onClick={e => e.stopPropagation()}
                >
                  <p className="px-3 py-1 text-[12px] font-bold text-fg-subtle uppercase tracking-widest">{def.label}</p>
                  {def.options.map(opt => {
                    const checked = selected.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        onClick={() => toggleValue(def.key, opt.value)}
                        className="w-full flex items-center gap-2.5 px-3 py-1.5 text-body-sm text-fg hover:bg-bg-subtle transition-colors text-left"
                      >
                        <Checkbox
                          checked={checked}
                          aria-label={`Toggle ${opt.label}`}
                          tabIndex={-1}
                          className="pointer-events-none"
                        />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {hasAnyActive && (
          <button
            onClick={() => onChange([])}
            className="text-body-sm text-fg-muted hover:text-danger transition-colors"
          >
            Clear
          </button>
        )}
      </div>
    </>
  );
}
