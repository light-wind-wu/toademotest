'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import AiSparkleIcon from './ai-sparkle-icon';
import { buildCvSummary } from '@/lib/cv-summary';
import { getCvHighlights } from '@/lib/cv-extract';
import { cn } from '@/lib/utils';
import type { Application, DSTAEngagementEntry } from '@/lib/types';

/* AI CV summary — streams a real LLM summary (Candidate 360 + mentor + shortlist).
   Falls back to the local templated summary if the API/key is unavailable. */
export default function AiSummaryCard({ app, engagements, className }: {
  app: Application;
  engagements?: DSTAEngagementEntry[];
  className?: string;
}) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const reqId = useRef(0);

  useEffect(() => {
    const id = ++reqId.current;
    setText('');
    setLoading(true);

    const fallback = () => { if (reqId.current === id) { setText(buildCvSummary(app, engagements)); setLoading(false); } };
    const top = [...(app.suitabilityScores ?? [])].sort((a, b) => b.score - a.score)[0];

    (async () => {
      try {
        const res = await fetch('/api/cv-summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            applicant: {
              name: app.name, school: app.school, course: app.course, year: app.year, gpa: app.gpa,
              achievements: app.achievements, previousDSTA: app.previousDSTA, previousDSTADetails: app.previousDSTADetails,
              cvHighlights: getCvHighlights(app),
              topReasoning: top?.reasoning,
            },
            engagements: engagements ?? [],
          }),
        });
        if (!res.ok || !res.body) return fallback();
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let full = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          full += decoder.decode(value, { stream: true });
          if (reqId.current !== id) return;
          if (full.includes('__FALLBACK__')) return fallback();
          setText(full);
          setLoading(false);
        }
        if (reqId.current === id) {
          if (!full.trim()) return fallback();
          setLoading(false);
        }
      } catch {
        fallback();
      }
    })();

    return () => { reqId.current++; }; // invalidate in-flight request on app change/unmount
  }, [app.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={cn('card p-5', className)}>
      <div className="flex items-center gap-2 mb-2">
        <AiSparkleIcon size={14} className="shrink-0" />
        <p className="text-body-md font-semibold text-fg">AI summary</p>
        {loading && <span className="ml-auto text-[11px] text-fg-subtle">generating…</span>}
      </div>
      {/* aria-live so SR users hear the working→ready transition, never a silent blank (#7) */}
      <div aria-live="polite" aria-busy={loading}>
        {loading && !text ? (
          <div className="space-y-2 py-0.5">
            <span className="sr-only">Generating AI summary…</span>
            {[100, 94, 72].map(w => <div key={w} className="h-3 rounded-full bg-bg-subtle animate-pulse" style={{ width: `${w}%` }} aria-hidden="true" />)}
          </div>
        ) : (
          <p className="text-body-md text-fg leading-relaxed">
            {text}
            {loading && <span className="inline-block w-0.5 h-3.5 bg-accent/70 ml-0.5 animate-pulse align-middle rounded-full" aria-hidden="true" />}
          </p>
        )}
      </div>
      <p className="flex items-start gap-1.5 text-[12px] text-fg-subtle mt-2.5">
        <AlertTriangle size={12} className="shrink-0 mt-0.5" />
        AI-generated from the application and CV — may be incomplete or inaccurate. Verify against the source documents.
      </p>
    </div>
  );
}
