'use client';

import { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import type { SuitabilityScore } from '@/lib/types';
import { reweightScore, type ScoringWeights } from '@/lib/scoring';

/* Portal-based so it never clips inside a scrolling table. */
function BreakdownPopover({
  sui, weights, pos, onClose,
}: {
  sui: SuitabilityScore;
  weights: ScoringWeights;
  pos: { top: number; left: number; badgeTop: number };
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [top, setTop] = useState(pos.top);

  useEffect(() => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    if (r.bottom > window.innerHeight - 8) setTop(Math.max(8, pos.badgeTop - r.height - 6));
    setVisible(true);
  }, [pos.badgeTop]);

  const total = reweightScore(sui, weights);
  const rows: [string, number, number | undefined][] = [
    ['Discipline of study', weights.discipline, sui.disciplineScore],
    ['Skills',              weights.skills,     sui.skillsScore],
    ['Standing',            weights.standing,   sui.standingScore],
  ];
  const confCls = sui.confidence === 'High' ? 'bg-success-bg text-success'
    : sui.confidence === 'Medium' ? 'bg-warning-bg text-warning' : 'bg-danger-bg text-danger';

  return (
    <div
      ref={ref}
      onMouseLeave={onClose}
      style={{ position: 'fixed', top, left: pos.left, zIndex: 9999, width: 290, opacity: visible ? 1 : 0, transition: 'opacity 0.08s' }}
      className="bg-surface border border-border rounded-xl shadow-xl p-4 pointer-events-auto text-left"
    >
      <div className="flex items-center justify-between mb-2.5">
        <p className="text-label-sm font-bold text-fg">Suitability breakdown</p>
        <span className="text-[13px] font-bold px-2 py-0.5 rounded-lg border bg-accent/10 text-accent border-accent/20 tabular-nums">{total}</span>
      </div>
      <div className="space-y-1.5">
        {rows.map(([label, w, v]) => v == null ? null : (
          <div key={label} className="flex items-center justify-between gap-3">
            <span className="text-body-sm text-fg-muted">{label} <span className="text-fg-subtle">· {w}%</span></span>
            <span className="text-body-sm font-bold text-fg tabular-nums">{v}</span>
          </div>
        ))}
      </div>
      {sui.confidence && (
        <div className="mt-2.5 pt-2.5 border-t border-border flex items-center justify-between">
          <span className="text-[12px] text-fg-subtle">Confidence</span>
          <span className={cn('text-[12px] font-bold px-1.5 py-0.5 rounded', confCls)}>{sui.confidence}</span>
        </div>
      )}
      {sui.reasoning && <p className="text-[12px] text-fg-muted mt-2 leading-snug">{sui.reasoning}</p>}
      <p className="text-[12px] text-fg-subtle mt-1.5">AI-estimated — may not always be accurate.</p>
    </div>
  );
}

export function SuitabilityBadge({
  score, sui, weights, variant = 'pill', className,
}: {
  score: number;
  sui?: SuitabilityScore;
  weights: ScoringWeights;
  variant?: 'pill' | 'plain';
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [tip, setTip] = useState<{ top: number; left: number; badgeTop: number } | null>(null);

  function onEnter() {
    if (!sui || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setTip({ top: r.bottom + 6, left: Math.max(8, Math.min(r.right - 290, window.innerWidth - 290 - 8)), badgeTop: r.top });
  }

  const pill = score >= 85 ? 'bg-success-bg text-success border-success/20'
    : score >= 70 ? 'bg-accent/10 text-accent border-accent/20'
    : score >= 55 ? 'bg-warning-bg text-warning border-warning/20'
    : 'bg-danger-bg text-danger border-danger/20';
  const plain = score >= 80 ? 'text-success' : score >= 60 ? 'text-accent' : score >= 40 ? 'text-warning' : 'text-danger';

  return (
    <>
      <span
        ref={ref}
        onMouseEnter={onEnter}
        onMouseLeave={() => setTip(null)}
        className={cn(
          variant === 'pill'
            ? cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[13px] font-bold border', pill)
            : cn('font-black tabular-nums', plain),
          sui && 'cursor-help',
          className,
        )}
      >
        {variant === 'pill' ? score : `${score}%`}
      </span>
      {typeof window !== 'undefined' && tip && sui && createPortal(
        <BreakdownPopover sui={sui} weights={weights} pos={tip} onClose={() => setTip(null)} />,
        document.body,
      )}
    </>
  );
}
