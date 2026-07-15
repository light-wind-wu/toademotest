'use client';

import { Fragment, useRef, useState, useLayoutEffect, useId, useCallback } from 'react';
import { cn } from '@/lib/utils';

export interface TabItem {
  key: string;
  label: string;
  /** Optional count rendered after the label. */
  count?: number;
  /** Draws an attention dot + warning-toned count. */
  urgent?: boolean;
  /** Renders a thin separator before this tab to visually group segments. */
  dividerBefore?: boolean;
}

interface TabBarProps {
  tabs: TabItem[];
  value: string;
  onChange: (key: string) => void;
  /** Accessible name for the tablist. */
  ariaLabel?: string;
  /**
   * Shared id base so tabs can point at their panels via aria-controls and
   * panels can point back via aria-labelledby. Pass the same value to the
   * matching <div role="tabpanel" id={`${idBase}-panel-${value}`}
   * aria-labelledby={`${idBase}-tab-${value}`}>. Omit if you have no panel.
   */
  idBase?: string;
  className?: string;
}

/**
 * PRIZM 4.0 segmented sliding-pill tabs (cross-cutting standard #4).
 * role="tablist" + roving tabindex (selected=0, rest=-1) + Arrow/Home/End
 * keyboard nav + aria-selected. The active pill slides ~150ms and is
 * reduced-motion safe. The single tab idiom app-wide.
 */
export default function TabBar({ tabs, value, onChange, ariaLabel, idBase, className }: TabBarProps) {
  const autoId = useId();
  const base = idBase ?? autoId;
  const listRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);

  const activeIdx = Math.max(0, tabs.findIndex((t) => t.key === value));

  const measure = useCallback(() => {
    const btn = btnRefs.current[value];
    if (btn) setPill({ left: btn.offsetLeft, width: btn.offsetWidth });
  }, [value]);

  // Position the sliding pill behind the active tab; reflow on resize.
  useLayoutEffect(() => {
    measure();
    const list = listRef.current;
    if (!list) return;
    const ro = new ResizeObserver(measure);
    ro.observe(list);
    return () => ro.disconnect();
  }, [measure, tabs]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      let next = activeIdx;
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown': next = (activeIdx + 1) % tabs.length; break;
        case 'ArrowLeft':
        case 'ArrowUp':   next = (activeIdx - 1 + tabs.length) % tabs.length; break;
        case 'Home':      next = 0; break;
        case 'End':       next = tabs.length - 1; break;
        default: return;
      }
      e.preventDefault();
      const nk = tabs[next].key;
      onChange(nk);
      btnRefs.current[nk]?.focus();
    },
    [activeIdx, tabs, onChange],
  );

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={ariaLabel}
      aria-orientation="horizontal"
      onKeyDown={onKeyDown}
      className={cn('relative inline-flex items-center gap-0.5 bg-bg-muted rounded-md p-1', className)}
    >
      {pill && (
        <span
          aria-hidden="true"
          className="absolute top-1 bottom-1 rounded-sm bg-surface shadow-sm transition-[transform,width] duration-150 ease-out motion-reduce:transition-none"
          style={{ left: 0, width: pill.width, transform: `translateX(${pill.left}px)` }}
        />
      )}
      {tabs.map((t) => {
        const selected = t.key === value;
        return (
          <Fragment key={t.key}>
            {t.dividerBefore && (
              <span aria-hidden="true" className="mx-1 h-4 w-px shrink-0 self-center bg-border" />
            )}
          <button
            ref={(el) => { btnRefs.current[t.key] = el; }}
            type="button"
            role="tab"
            id={`${base}-tab-${t.key}`}
            aria-selected={selected}
            aria-controls={idBase ? `${base}-panel-${t.key}` : undefined}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(t.key)}
            className={cn(
              'relative z-10 inline-flex h-7 items-center gap-2 whitespace-nowrap rounded-sm px-3 text-body-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              selected ? 'text-accent' : 'text-fg-muted hover:text-fg',
            )}
          >
            {t.urgent && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />}
            {t.label}
            {t.count != null && (
              <span
                className={cn(
                  'text-body-sm font-semibold leading-none',
                  t.urgent ? 'text-warning'
                    : selected ? 'text-accent'
                    : 'text-fg-muted',
                )}
              >
                ({t.count})
              </span>
            )}
          </button>
          </Fragment>
        );
      })}
    </div>
  );
}
