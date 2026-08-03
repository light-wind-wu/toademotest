'use client';

/* Session chapter intro — mirrors concept demo `.chapter-intro-card` motion
   (card cycle + top progress + staggered copy). Full-stage scrim uses page `bg-bg`
   (same as Myinfo overlay). Auto-dismisses after ~2s. */
import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { CHAPTER_INTROS } from '@/lib/apply-application';

type SessionKey = keyof typeof CHAPTER_INTROS;

export default function ChapterIntro({
  session,
  onDone,
}: {
  session: SessionKey;
  onDone: () => void;
}) {
  const intro = CHAPTER_INTROS[session];

  useEffect(() => {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const delay = reduced ? 500 : 2000;
    const t = window.setTimeout(onDone, delay);
    return () => window.clearTimeout(t);
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-bg px-4 py-10"
      role="dialog"
      aria-modal="true"
      aria-labelledby="chapterIntroTitle"
    >
      <div
        className={cn(
          'chapter-intro-card relative grid w-full max-w-[760px] min-h-[330px] items-end overflow-hidden',
          'rounded-2xl border border-border bg-surface p-[clamp(34px,6vw,64px)] shadow-lg',
        )}
      >
        <div className="chapter-intro-copy relative max-w-[580px]">
          <p className="chapter-intro-line mb-4 text-[12px] font-extrabold tracking-[0.1em] text-accent uppercase">
            {intro.label}
          </p>
          <h2
            id="chapterIntroTitle"
            className="chapter-intro-line mb-[18px] text-[clamp(1.75rem,5vw,3.375rem)] font-bold leading-[1.05] tracking-[-0.035em] text-fg text-balance"
          >
            {intro.title}
          </h2>
          <p className="chapter-intro-line max-w-[520px] text-[17px] leading-relaxed text-fg-muted">
            {intro.description}
          </p>
        </div>
      </div>
    </div>
  );
}
