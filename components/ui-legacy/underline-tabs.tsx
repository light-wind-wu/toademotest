'use client';

import { cn } from '@/lib/utils';
import { Tabs as BaseTabs } from '@base-ui-components/react/tabs';

export interface UnderlineTabItem {
  value: string;
  label: string;
  count?: number;
}

export interface UnderlineTabsProps {
  value: string;
  onValueChange: (value: string) => void;
  tabs: UnderlineTabItem[];
  ariaLabel?: string;
  className?: string;
}

export function UnderlineTabs({
  value,
  onValueChange,
  tabs,
  ariaLabel,
  className,
}: UnderlineTabsProps) {
  return (
    <BaseTabs.Root value={value} onValueChange={onValueChange} className={className}>
      <BaseTabs.List
        aria-label={ariaLabel}
        className="flex flex-wrap gap-1 border-b border-border"
      >
        {tabs.map((tab) => {
          const selected = tab.value === value;
          return (
            <BaseTabs.Tab
              key={tab.value}
              value={tab.value}
              className={cn(
                'relative whitespace-nowrap px-3 py-2 text-sm font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
                selected ? 'text-accent' : 'text-fg-muted hover:text-fg',
                'after:absolute after:bottom-[-1px] after:left-0 after:right-0 after:h-0.5 after:rounded-t-full after:transition-colors',
                selected ? 'after:bg-accent' : 'after:bg-transparent',
              )}
            >
              <span className="flex items-center gap-2">
                {tab.label}
                {tab.count != null && (
                  <span
                    className={cn(
                      'text-sm font-normal transition-colors',
                      selected ? 'text-accent' : 'text-fg-subtle',
                    )}
                  >
                    ({tab.count})
                  </span>
                )}
              </span>
            </BaseTabs.Tab>
          );
        })}
      </BaseTabs.List>
    </BaseTabs.Root>
  );
}
