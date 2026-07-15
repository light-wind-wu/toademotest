'use client';

/* IM8 data-classification strip — a full-width marking shown at the top of
   government pages. Tone shifts with sensitivity. The public sign-in screen is
   OFFICIAL (OPEN); the strip reassures users the touchpoint is a managed gov
   service. Faithful port of the handoff's ClassificationStrip. */
import { Lock } from 'lucide-react';

function classMeta(level: string) {
  const L = (level || '').toUpperCase();
  if (L.includes('RESTRICTED') || L.includes('CONFIDENTIAL') || L.includes('SECRET'))
    return 'bg-[rgb(127_29_29)] text-white';
  if (L.includes('HIGH'))
    return 'bg-[rgb(180_83_9)] text-white';
  if (L.includes('SENSITIVE') || L.includes('CLOSED'))
    return 'bg-[rgb(20_83_45)] text-white';
  // OFFICIAL (OPEN) — public, calm
  return 'bg-[rgb(15_118_110)] text-white';
}

export default function ClassificationStrip({ level = 'OFFICIAL (OPEN)' }: { level?: string }) {
  return (
    <div
      className={`w-full flex items-center justify-center gap-1.5 py-1 ${classMeta(level)}`}
      role="note"
      aria-label={`Information classification: ${level}`}
    >
      <Lock size={12} />
      <span className="text-[11px] font-bold uppercase tracking-widest">{level}</span>
    </div>
  );
}
