'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui-legacy/dialog';
import { CheckCircle2, LockKeyhole, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ApplicantInternBadge, InternBadgeStatus } from '@/lib/types';

const content: Record<InternBadgeStatus, { label: string; title: string; description: string }> = {
  preview: {
    label: 'Under discussion',
    title: 'DSTA Intern Badge — Under Discussion',
    description: 'The internship badge and LinkedIn sharing feature are still under discussion and have not been confirmed.',
  },
  eligible: {
    label: 'Available to earn',
    title: 'DSTA Intern Badge',
    description: 'Complete your internship successfully to earn this badge.',
  },
  in_progress: {
    label: 'In progress',
    title: 'DSTA Intern Badge',
    description: 'Successful internship completion is still required.',
  },
  earned: {
    label: 'Badge earned',
    title: 'DSTA Intern',
    description: 'Awarded after successfully completing your DSTA internship.',
  },
};

function InternBadgeMark({ status, compact = false }: { status: InternBadgeStatus; compact?: boolean }) {
  const isEarned = status === 'earned';
  const isAvailable = status === 'eligible';

  if (isEarned) {
    return <Image src="/images/dsta-internship-complete.png" alt="" width={300} height={332} className={cn('shrink-0 object-contain', compact ? 'size-7' : 'h-[104px] w-[92px]')} />;
  }

  return (
    <span className={cn('relative block shrink-0', compact ? 'h-7 w-7' : 'h-[104px] w-[92px]')} aria-hidden>
      <svg viewBox="0 0 92 104" className="absolute inset-0 size-full overflow-visible">
        <path
          d="M46 3 84 25v43L46 101 8 68V25L46 3Z"
          className={cn(isEarned ? 'fill-accent stroke-accent' : 'fill-surface stroke-accent/55', isAvailable && '[stroke-dasharray:6_5]')}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M46 12 75 29v34L46 89 17 63V29L46 12Z"
          className={isEarned ? 'fill-accent-hover stroke-surface/70' : 'fill-bg-subtle stroke-accent/25'}
          strokeWidth="1.5"
        />
        <path d="M46 82l2.2 4.3 4.8.7-3.5 3.4.8 4.8-4.3-2.3-4.3 2.3.8-4.8-3.5-3.4 4.8-.7L46 82Z" className={isEarned ? 'fill-surface' : 'fill-accent/55'} />
      </svg>

      {!compact ? (
        <>
          <span className="absolute left-[25px] top-[21px] h-[25px] w-[42px] overflow-hidden">
            <Image src="/images/dsta-logo.svg" alt="" width={92} height={47} className="absolute -left-12 top-0 h-auto w-[92px] max-w-none" />
          </span>
          <span className={cn('absolute left-1/2 top-[51px] flex h-7 w-[102px] -translate-x-1/2 items-center justify-center rounded-sm border text-[8px] font-bold tracking-[0.09em]', isEarned ? 'border-accent-hover bg-accent-hover text-accent-fg' : 'border-accent/35 bg-surface text-accent')}>DSTA INTERNSHIP</span>
          {!isEarned ? <LockKeyhole className="absolute bottom-[12px] left-1/2 size-4 -translate-x-1/2 text-accent/60" strokeWidth={1.7} /> : null}
        </>
      ) : (
        <CheckCircle2 className={cn('absolute left-1/2 top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2', isEarned ? 'text-accent-fg' : 'text-accent')} />
      )}
    </span>
  );
}

export function InternBadgeStatus({ status, compact = false, className, badgeName, programmeName, earnedAt, imageSrc }: { status: InternBadgeStatus; compact?: boolean; className?: string; badgeName?: string; programmeName?: string; earnedAt?: string; imageSrc?: string }) {
  const isEarned = status === 'earned';
  const { label, title, description } = content[status];
  const displayTitle = badgeName ?? title;

  if (compact) {
    return (
      <span className={cn('inline-flex min-h-8 items-center gap-2 rounded-full border py-0.5 pl-1 pr-3 text-[12px] font-semibold leading-4', isEarned ? 'border-success/30 bg-success/15 text-success' : 'border-accent/20 bg-accent/5 text-accent', className)}>
        <InternBadgeMark status={status} compact />
        {displayTitle}
      </span>
    );
  }

  return (
    <article className={cn('flex min-w-0 items-center gap-4 rounded-xl border bg-surface p-5', isEarned ? 'border-success/30' : 'border-accent/20', className)}>
      {imageSrc ? <Image src={imageSrc} alt="DSTA Internship completion badge" width={300} height={332} className="h-auto w-20 shrink-0 object-contain" /> : <InternBadgeMark status={status} />}
      <div className="min-w-0 flex-1">
        <span className={cn('inline-flex whitespace-nowrap items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]', isEarned ? 'bg-success/15 text-success' : 'bg-accent/10 text-accent')}>
          {isEarned ? <CheckCircle2 className="size-3" aria-hidden /> : null}
          {label}
        </span>
        <p className="mt-2 text-[16px] font-semibold leading-6 text-fg">{displayTitle}</p>
        {programmeName ? <p className="mt-1 text-[12px] font-medium leading-5 text-fg-muted">{programmeName}</p> : null}
        <p className="mt-1 text-[13px] leading-5 text-fg-muted">{isEarned && earnedAt ? `Completed on ${earnedAt}` : description}</p>
      </div>
    </article>
  );
}

export function PublicInternBadgePreview({ className }: { className?: string }) {
  return <InternBadgeStatus status="preview" imageSrc="/images/dsta-internship-complete.png" className={cn('w-full max-w-[380px] gap-3 border-0 bg-transparent p-0 shadow-none [&>img]:w-12 [&>div>span]:hidden [&>div>p:first-of-type]:mt-0 [&>div>p:first-of-type]:text-sm [&>div>p:first-of-type]:leading-5 [&>div>p:last-of-type]:text-xs [&>div>p:last-of-type]:leading-[18px]', className)} />;
}

export function InternBadgeCollection({ badges, compact = false, className, celebrate = false }: { badges: readonly ApplicantInternBadge[]; compact?: boolean; className?: string; celebrate?: boolean }) {
  const [award, setAward] = useState<ApplicantInternBadge | null>(null);
  const [replay, setReplay] = useState(0);
  useEffect(() => {
    if (!celebrate || compact) return;
    const timer = window.setTimeout(() => {
      const unseen = badges.find((badge) => {
        if (badge.status !== 'earned') return false;
        try { return localStorage.getItem(`dsta_badge_reveal:${badge.id}:${badge.earnedAt ?? ''}`) !== 'true'; }
        catch { return true; }
      });
      if (unseen) {
        setAward(unseen);
        try { localStorage.setItem(`dsta_badge_reveal:${unseen.id}:${unseen.earnedAt ?? ''}`, 'true'); } catch { /* Persistence is optional. */ }
      }
    }, 650);
    return () => window.clearTimeout(timer);
  }, [badges, celebrate, compact]);

  if (badges.length === 0) return null;

  return (
    <div className={cn(compact ? 'flex flex-wrap gap-2' : 'grid gap-3 sm:grid-cols-2', className)} aria-label={`${badges.length} DSTA internship badge${badges.length === 1 ? '' : 's'}`}>
      {badges.map((badge) => (
        <InternBadgeStatus key={badge.id} status={badge.status} compact={compact} badgeName={badge.name} programmeName={badge.programmeName} earnedAt={badge.earnedAt} />
      ))}
      {celebrate && !compact && badges.some((badge) => badge.status === 'earned') && (
        <Button
          variant="ghost"
          size="sm"
          className="col-span-full justify-self-end text-fg-muted"
          onClick={() => {
            const earnedBadge = badges.find((badge) => badge.status === 'earned');
            if (!earnedBadge) return;
            setReplay((value) => value + 1);
            setAward(earnedBadge);
          }}
        >
          <RotateCcw className="size-3.5" aria-hidden />
          Reset Celebration
        </Button>
      )}
      <Dialog open={Boolean(award)} onOpenChange={(open) => { if (!open) setAward(null); }}>
        <DialogContent className="w-[calc(100%-32px)] max-w-[480px] max-h-[calc(100dvh-32px)] overflow-y-auto rounded-2xl p-6 text-center sm:p-8">
          {award && <>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Achievement Unlocked</p>
            <div key={replay} className="relative mx-auto flex h-56 w-full items-center justify-center [perspective:900px] sm:h-64">
              <div aria-hidden="true" className="absolute size-48 rounded-full bg-accent/10 ring-1 ring-accent/20" />
              <Image src="/images/dsta-internship-complete.png" alt="DSTA Internship completion badge" width={300} height={332} priority className="badge-award-reveal relative h-52 w-auto object-contain drop-shadow-lg sm:h-60" />
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 motion-reduce:hidden">
                <Image src="/images/fireworks.svg" alt="" width={523} height={368} className="fireworks-fall h-auto w-full" />
              </div>
            </div>
            <DialogTitle className="text-2xl leading-tight">You’ve Earned Your Badge!</DialogTitle>
            <DialogDescription className="text-sm leading-6">Congratulations on completing your DSTA internship. Your hard work and contribution deserve to be celebrated.</DialogDescription>
            <div className="rounded-lg bg-bg-subtle p-3">
              <p className="font-semibold text-fg">{award.name}</p>
              <p className="mt-1 text-sm text-fg-muted">{award.programmeName}</p>
              {award.earnedAt && <p className="mt-1 text-xs text-fg-muted">Completed on {award.earnedAt}</p>}
            </div>
            <Button onClick={() => setAward(null)} className="w-full">Continue to Dashboard</Button>
            <Button variant="ghost" size="sm" onClick={() => setReplay((value) => value + 1)} className="mx-auto text-fg-muted motion-reduce:hidden">Celebrate Again</Button>
          </>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
