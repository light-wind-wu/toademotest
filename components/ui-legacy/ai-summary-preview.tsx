'use client';

import { Sparkles, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Application } from '@/lib/types';

interface AiSummaryPreviewProps {
  app: Application;
  disciplineMatch: boolean;
  skillsMatched: number;
  skillsTotal: number;
  rank: number | null;
  className?: string;
}

export default function AiSummaryPreview({
  app,
  disciplineMatch,
  skillsMatched,
  skillsTotal,
  rank,
  className,
}: AiSummaryPreviewProps) {
  const summary = app.summary || app.notes || '';
  if (!summary) return null;

  return (
    <span className={cn('group/summary relative inline-flex items-center gap-1', className)}>
      <Sparkles size={11} className="shrink-0 text-accent" />
      <span className="truncate">{summary}</span>

      <span
        className="pointer-events-none absolute left-24 top-5 z-50 w-[min(320px,calc(100vw-96px))] opacity-0 transition-opacity group-hover/summary:opacity-100 group-focus/summary:opacity-100"
        aria-hidden="true"
      >
        <span className="block rounded-lg border border-border bg-surface p-3 shadow-md">
          <span className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-accent">
            <Sparkles size={11} />
            AI Summary
          </span>
          <span className="block text-[11px] leading-relaxed text-fg-muted">{summary}</span>
          <span className="mt-2 flex flex-wrap items-center gap-2 border-t border-border pt-2 text-[10px] text-fg-muted">
            <span className={cn(
              'inline-flex items-center gap-1 font-medium',
              disciplineMatch ? 'text-success' : 'text-danger'
            )}>
              {disciplineMatch ? <Check size={10} /> : <span>×</span>}
              Discipline of Study
            </span>
            <span>{skillsMatched} / {skillsTotal} skills</span>
            {rank && <span>#{rank}</span>}
          </span>
        </span>
      </span>
    </span>
  );
}
