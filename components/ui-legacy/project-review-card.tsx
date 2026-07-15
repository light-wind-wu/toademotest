'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
import AiSparkleIcon from './ai-sparkle-icon';
import { cn } from '@/lib/utils';
import type { SubmittedProject } from '@/lib/types';

/* AI review assistant for the IO admin reviewing a project submission.
   Streams a real LLM assessment (summary / strengths / gaps). */
export default function ProjectReviewCard({ project, className }: {
  project: SubmittedProject;
  className?: string;
}) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const reqId = useRef(0);

  const generate = useCallback(() => {
    const id = ++reqId.current;
    setText('');
    setLoading(true);
    (async () => {
      try {
        const res = await fetch('/api/project-review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project: {
              title: project.title, description: project.description, skills: project.skills,
              discipline: project.discipline, techDomain: project.techDomain, emergingArea: project.emergingArea,
              educationLevel: project.educationLevel, internshipDuration: project.internshipDuration,
              workingLocation: project.workingLocation, slots: project.slots,
              preferredEducation: project.preferredEducation, minGpa: project.minGpa,
              additionalRequirements: project.additionalRequirements, mentorBio: project.mentorBio,
            },
          }),
        });
        if (!res.ok || !res.body) throw new Error('bad');
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let full = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          full += decoder.decode(value, { stream: true });
          if (reqId.current !== id) return;
          setText(full);
          setLoading(false);
        }
        if (reqId.current === id) setLoading(false);
      } catch {
        if (reqId.current === id) { setText('Unable to generate the AI review. Please try again.'); setLoading(false); }
      }
    })();
  }, [project]);

  useEffect(() => { generate(); return () => { reqId.current++; }; }, [generate]);

  return (
    <section className={cn('bg-surface border border-border rounded-2xl p-5', className)}>
      <div className="flex items-center gap-2 mb-3">
        <AiSparkleIcon size={14} className="shrink-0" />
        <h2 className="text-body-md font-semibold text-fg">AI review assistant</h2>
        {loading
          ? <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] text-fg-subtle"><Loader2 size={11} className="animate-spin" />generating…</span>
          : <button onClick={generate} className="ml-auto inline-flex items-center gap-1.5 text-[12px] font-semibold text-accent hover:text-accent/80 transition-colors"><RefreshCw size={12} />Re-run</button>}
      </div>

      {/* aria-live so SR users hear the working→ready transition, never a silent blank (#7) */}
      <div aria-live="polite" aria-busy={loading}>
      {loading && !text ? (
        <div className="space-y-2 py-0.5">
          <span className="sr-only">Generating AI review…</span>
          {[100, 96, 80, 90, 64].map((w, i) => <div key={i} className="h-3 rounded-full bg-bg-subtle animate-pulse" style={{ width: `${w}%` }} aria-hidden="true" />)}
        </div>
      ) : (
        <div className="space-y-1.5">
          {text.split('\n').map((line, i) => {
            const m = line.match(/^(Summary|Strengths|Gaps to address)\s*:\s*(.*)$/i);
            if (m) return (
              <p key={i} className="text-body-sm leading-relaxed mt-2.5 first:mt-0">
                <span className="font-bold text-fg">{m[1]}: </span>
                <span className="text-fg-muted">{m[2]}</span>
              </p>
            );
            if (!line.trim()) return null;
            return <p key={i} className="text-body-sm leading-relaxed text-fg-muted">{line}</p>;
          })}
          {loading && <span className="inline-block w-0.5 h-3.5 bg-accent/70 ml-0.5 animate-pulse align-middle rounded-full" aria-hidden="true" />}
        </div>
      )}
      </div>

      <p className="flex items-start gap-1.5 text-[12px] text-fg-subtle mt-3">
        <AlertTriangle size={12} className="shrink-0 mt-0.5" />
        AI-generated guidance to assist your review — not an approval decision. Verify against the submission.
      </p>
    </section>
  );
}
