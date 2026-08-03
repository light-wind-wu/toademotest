'use client';

/* Session 2 — Find Your Project Fit:
   chapter intro → interests (+ archetype modal) → ranking | quiz (Q1–3). */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowRight,
  Check,
  GripVertical,
  Star,
  Trash2,
} from 'lucide-react';
import ApplicationFlowShell from '@/components/apply/application-flow-shell';
import ChapterIntro from '@/components/apply/chapter-intro';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  clearChapterIntro,
  loadApplyDraft,
  peekChapterIntro,
  saveApplyDraft,
  type ApplySessionDraft,
} from '@/lib/apply-application';
import {
  INTEREST_OPTIONS,
  MAX_RANKED,
  PROJECT_MATCHES,
  QUIZ_QUESTIONS,
  resolveArchetype,
  type ArchetypeInfo,
  type ProjectMatch,
} from '@/lib/apply-project-fit';
import { loadApplicantProfile } from '@/lib/myinfo';
import { isSignedIn } from '@/lib/session';
import { cn } from '@/lib/utils';

type Phase = 'interests' | 'ranking' | 'quiz' | 'result';

function shouldShowSession2Intro(): boolean {
  if (typeof window === 'undefined') return false;
  const fromQuery = new URLSearchParams(window.location.search).get('intro');
  return fromQuery === 'session-2' || peekChapterIntro() === 'session-2';
}

export default function ApplyProjectFitPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [draft, setDraft] = useState<ApplySessionDraft | null>(null);
  const [phase, setPhase] = useState<Phase>('interests');
  const [showArchetype, setShowArchetype] = useState(false);
  const [showSession3, setShowSession3] = useState(false);
  const [session3Next, setSession3Next] = useState<'ranking' | 'additional'>('ranking');
  const [quizIndex, setQuizIndex] = useState(0);
  const [displayName, setDisplayName] = useState('there');

  useEffect(() => {
    if (!isSignedIn()) {
      router.replace('/login');
      return;
    }
    setShowIntro(shouldShowSession2Intro());
    const d = loadApplyDraft();
    setDraft(d);
    const profile = loadApplicantProfile();
    const name = profile?.name?.trim().split(/\s+/)[0] || 'Chen';
    setDisplayName(name);
    setReady(true);
  }, [router]);

  /* Ranking locks the page — prevent document scrollbars */
  useEffect(() => {
    if (phase !== 'ranking' || showIntro) return;
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, [phase, showIntro]);

  const persist = useCallback((next: ApplySessionDraft) => {
    setDraft(next);
    saveApplyDraft(next);
  }, []);

  const onIntroDone = useCallback(() => {
    clearChapterIntro();
    setShowIntro(false);
    setShowArchetype(true);
    router.replace('/apply/project-fit', { scroll: false });
  }, [router]);

  if (!ready || !draft) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-body-sm text-fg-muted">
        Loading…
      </div>
    );
  }

  if (showIntro) {
    return (
      <>
        <ApplicationFlowShell stepId="project-fit" hideFooter chapterMode>
          <div className="min-h-[50vh]" aria-hidden />
        </ApplicationFlowShell>
        <ChapterIntro session="session-2" onDone={onIntroDone} />
      </>
    );
  }

  const footer =
    phase === 'interests'
      ? {
          onBack: () => router.push('/apply/availability'),
          onContinue: () => setPhase('ranking'),
          continueLabel: 'Continue',
          continueDisabled: draft.interests.length === 0,
        }
      : phase === 'result'
        ? {
            onBack: () => {
              setQuizIndex(QUIZ_QUESTIONS.length - 1);
              setPhase('quiz');
            },
            onContinue: () => setPhase('ranking'),
            continueLabel: 'Continue',
            continueDisabled: false,
          }
      : phase === 'ranking'
        ? {
            onBack: () => setPhase(draft.quizTaken ? 'result' : 'interests'),
            onContinue: () => {
              setSession3Next('additional');
              setShowSession3(true);
            },
            continueLabel: 'Continue',
            continueDisabled: draft.rankedProjectIds.length === 0,
          }
        : {
            onBack: () => {
              if (quizIndex > 0) setQuizIndex((i) => i - 1);
              else setPhase('interests');
            },
            onContinue: () => {
              if (draft.quizAnswers[quizIndex] == null) return;
              if (quizIndex < QUIZ_QUESTIONS.length - 1) {
                setQuizIndex((i) => i + 1);
                return;
              }
              persist({ ...draft, quizTaken: true });
              setPhase('result');
            },
            continueLabel: 'Continue',
            continueDisabled: draft.quizAnswers[quizIndex] == null,
          };

  return (
    <ApplicationFlowShell
      stepId="project-fit"
      hideFooter
      lockViewport={phase === 'ranking'}
    >
      {phase === 'interests' && (
        <InterestsPhase
          selected={draft.interests}
          onChange={(interests) => persist({ ...draft, interests })}
          onBack={footer.onBack}
          onContinue={footer.onContinue}
          continueDisabled={footer.continueDisabled}
        />
      )}
      {phase === 'ranking' && (
        <RankingPhase
          displayName={displayName}
          rankedIds={draft.rankedProjectIds}
          onChange={(rankedProjectIds) => persist({ ...draft, rankedProjectIds })}
          onBack={footer.onBack}
          onContinue={footer.onContinue}
          continueDisabled={footer.continueDisabled}
        />
      )}
      {phase === 'result' && (
        <ArchetypeResultPhase
          archetype={resolveArchetype(draft.quizAnswers)}
          onBack={footer.onBack}
          onContinue={footer.onContinue}
        />
      )}
      {phase === 'quiz' && (
        <QuizPhase
          quizIndex={quizIndex}
          answers={draft.quizAnswers}
          onSelect={(optionIndex) => {
            const quizAnswers = Array.from(
              { length: QUIZ_QUESTIONS.length },
              (_, i) => draft.quizAnswers[i] ?? null,
            );
            quizAnswers[quizIndex] = optionIndex;
            persist({ ...draft, quizAnswers, quizTaken: true });
          }}
          onBack={footer.onBack}
          onContinue={footer.onContinue}
          continueDisabled={footer.continueDisabled}
        />
      )}

      {showArchetype && (
        <ArchetypeModal
          onTakeQuiz={() => {
            setShowArchetype(false);
            setPhase('quiz');
            setQuizIndex(0);
          }}
          onSkip={() => {
            setShowArchetype(false);
            setPhase('ranking');
          }}
        />
      )}

      {showSession3 && (
        <ChapterIntro
          session="session-3"
          onDone={() => {
            setShowSession3(false);
            if (session3Next === 'ranking') {
              setPhase('ranking');
              return;
            }
            /* Intro already played here (fig 7) — land on Additional Details */
            router.push('/apply/additional-details');
          }}
        />
      )}
    </ApplicationFlowShell>
  );
}

/* ── Interests ───────────────────────────────────────────────────────────── */

function InterestsPhase({
  selected,
  onChange,
  onBack,
  onContinue,
  continueDisabled,
}: {
  selected: string[];
  onChange: (next: string[]) => void;
  onBack?: () => void;
  onContinue?: () => void;
  continueDisabled?: boolean;
}) {
  function toggle(tag: string) {
    if (selected.includes(tag)) onChange(selected.filter((t) => t !== tag));
    else onChange([...selected, tag]);
  }

  return (
    <>
      <header className="mb-5">
        <h1 className="text-[1.375rem] font-bold leading-snug tracking-tight text-fg md:text-[1.5rem]">
          What are you into?
        </h1>
      </header>
      <section className="rounded-xl border border-border bg-surface p-4 shadow-sm md:p-6">
        <p className="text-[13px] text-fg-muted">
          Tap the areas that excite you — we’ll factor these into your project matches.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {INTEREST_OPTIONS.map((tag) => {
            const on = selected.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggle(tag)}
                className={cn(
                  'rounded-full border px-3.5 py-2 text-[13px] font-medium transition-colors',
                  on
                    ? 'border-accent/30 bg-accent/10 text-accent'
                    : 'border-border bg-surface text-fg hover:border-border-strong',
                )}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </section>

      <div className="mt-[18px] flex justify-end gap-2 lg:mt-3">
        <Button
          type="button"
          variant="outline"
          className="rounded-md bg-surface"
          onClick={onBack}
          disabled={!onBack}
        >
          Back
        </Button>
        <Button
          type="button"
          className="rounded-md font-semibold"
          onClick={onContinue}
          disabled={continueDisabled || !onContinue}
        >
          Continue
        </Button>
      </div>
    </>
  );
}

/* ── Archetype modal ─────────────────────────────────────────────────────── */
/* TODO: add bottom-right BG art via `bg-[url(/images/defender-archetype-bg.png)] bg-[length:min(72%,340px)] bg-bottom-right bg-no-repeat` */

function ArchetypeModal({
  onTakeQuiz,
  onSkip,
}: {
  onTakeQuiz: () => void;
  onSkip: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-fg/40 p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="archetypeTitle"
    >
      <div className="relative w-full max-w-[520px] overflow-hidden rounded-2xl bg-surface shadow-xl">
        <div className="flex flex-col p-6 pb-8 md:p-8">
          <h2
            id="archetypeTitle"
            className="max-w-[18ch] text-[1.35rem] font-bold leading-snug text-fg md:text-[1.5rem]"
          >
            Discover Your Defender Archetype
          </h2>
          <p className="mt-5 max-w-[28ch] text-[14px] leading-relaxed text-fg-muted md:mt-6 md:max-w-[32ch]">
            Take a short quiz to discover your defender archetype and explore projects that may
            suit you. This step is optional—you can skip it and continue with your selected
            interests.
          </p>

          <div className="mt-12 flex w-fit flex-col items-stretch gap-3 md:mt-14">
            <Button
              type="button"
              className="h-11 rounded-md px-5 font-semibold"
              onClick={onTakeQuiz}
            >
              Let’s Go
              <ArrowRight className="h-4 w-4" />
            </Button>
            <button
              type="button"
              onClick={onSkip}
              className="px-1 text-left text-[14px] font-semibold text-fg hover:underline"
            >
              Skip for Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Ranking ─────────────────────────────────────────────────────────────── */

function RankingPhase({
  displayName,
  rankedIds,
  onChange,
  onBack,
  onContinue,
  continueDisabled,
}: {
  displayName: string;
  rankedIds: string[];
  onChange: (ids: string[]) => void;
  onBack?: () => void;
  onContinue?: () => void;
  continueDisabled?: boolean;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const rankedSet = useMemo(() => new Set(rankedIds), [rankedIds]);

  function add(id: string) {
    if (rankedSet.has(id) || rankedIds.length >= MAX_RANKED) return;
    onChange([...rankedIds, id]);
  }

  function remove(id: string) {
    onChange(rankedIds.filter((x) => x !== id));
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = rankedIds.indexOf(String(active.id));
    const newIndex = rankedIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    onChange(arrayMove(rankedIds, oldIndex, newIndex));
  }

  return (
    /* Fills shell lockViewport area — page itself must not scroll */
    <div className="flex h-full min-h-0 flex-col">
      <header className="mb-3 shrink-0">
        <h1 className="text-[1.375rem] font-bold leading-snug tracking-tight text-fg md:text-[1.5rem]">
          Rank your projects, {displayName}.
        </h1>
        <p className="mt-1 text-[13px] text-fg-muted">
          Based on your interests, we’ve flagged your best matches. Select up to {MAX_RANKED} in
          order of preference.
        </p>
      </header>

      {/* One white panel: left scroll (no scrollbar) · divider · right ranking */}
      <section
        className={cn(
          'min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-surface shadow-sm',
          'grid max-lg:grid-rows-[minmax(0,1fr)_180px] lg:grid-cols-[minmax(0,1fr)_260px]',
        )}
      >
        <div
          className={cn(
            'min-h-0 space-y-3 overflow-y-auto p-4 md:p-5',
            '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
          )}
        >
          {PROJECT_MATCHES.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              added={rankedSet.has(p.id)}
              onAdd={() => add(p.id)}
            />
          ))}
        </div>

        <aside className="flex min-h-0 flex-col border-t border-border p-4 md:p-5 lg:border-l lg:border-t-0">
          <h2 className="shrink-0 text-[14px] font-bold text-fg">
            Your project ranking · {rankedIds.length} / {MAX_RANKED}
          </h2>
          <div className="mt-3 min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {rankedIds.length === 0 ? (
              <div className="rounded-lg bg-bg px-3 py-4 text-[13px] leading-relaxed text-fg-muted">
                Tap Add to ranking to build your list. 1st is your top choice.
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={rankedIds} strategy={verticalListSortingStrategy}>
                  <ul className="space-y-2">
                    {rankedIds.map((id, index) => {
                      const p = PROJECT_MATCHES.find((x) => x.id === id);
                      if (!p) return null;
                      return (
                        <SortableRankItem
                          key={id}
                          id={id}
                          rank={index + 1}
                          title={p.name}
                          onRemove={() => remove(id)}
                        />
                      );
                    })}
                  </ul>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </aside>
      </section>

      {/* Below the card, flush with its right edge */}
      <div className="mt-[18px] flex shrink-0 justify-end gap-2 lg:mt-3">
        <Button
          type="button"
          variant="outline"
          className="rounded-md bg-surface"
          onClick={onBack}
          disabled={!onBack}
        >
          Back
        </Button>
        <Button
          type="button"
          className="rounded-md font-semibold"
          onClick={onContinue}
          disabled={continueDisabled || !onContinue}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}

function ProjectCard({
  project,
  added,
  onAdd,
}: {
  project: ProjectMatch;
  added: boolean;
  onAdd: () => void;
}) {
  return (
    <article className="rounded-xl border border-border bg-surface p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[15px] font-bold text-fg">{project.name}</h3>
          <p className="mt-0.5 text-[12px] text-fg-muted">
            {project.area} · {project.lead}
          </p>
        </div>
        {project.greatMatch && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-[11px] font-semibold text-accent">
            <Star className="h-3 w-3 fill-accent" strokeWidth={0} />
            Great match
          </span>
        )}
      </div>
      <p className="mt-2 text-[13px] text-fg">{project.description}</p>
      <div className="mt-3">
        {added ? (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-bg-muted px-3 py-1.5 text-[13px] font-medium text-fg-muted">
            <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> Added
          </span>
        ) : (
          <Button type="button" variant="outline" size="sm" className="rounded-md" onClick={onAdd}>
            + Add To Ranking
          </Button>
        )}
      </div>
    </article>
  );
}

function SortableRankItem({
  id,
  rank,
  title,
  onRemove,
}: {
  id: string;
  rank: number;
  title: string;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex items-center gap-2 rounded-lg border border-border bg-surface px-2 py-2 shadow-sm',
        isDragging && 'opacity-60 shadow-md',
      )}
    >
      <button
        type="button"
        className="cursor-grab touch-none p-1 text-fg-subtle hover:text-fg active:cursor-grabbing"
        aria-label="Drag to reorder"
        {...listeners}
        {...attributes}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bg text-[12px] font-semibold text-fg">
        {rank}
      </span>
      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-fg">{title}</span>
      <button
        type="button"
        onClick={onRemove}
        className="p-1 text-fg-muted hover:text-danger"
        aria-label={`Remove ${title}`}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}

/* ── Quiz (Q1–Q3) ────────────────────────────────────────────────────────── */

function QuizPhase({
  quizIndex,
  answers,
  onSelect,
  onBack,
  onContinue,
  continueDisabled,
}: {
  quizIndex: number;
  answers: (number | null)[];
  onSelect: (optionIndex: number) => void;
  onBack?: () => void;
  onContinue?: () => void;
  continueDisabled?: boolean;
}) {
  const q = QUIZ_QUESTIONS[quizIndex];
  const total = QUIZ_QUESTIONS.length;
  const progress = ((quizIndex + 1) / total) * 100;
  const selected = answers[quizIndex];

  return (
    <>
      <header className="mb-4">
        <h1 className="text-[1.375rem] font-bold leading-snug tracking-tight text-fg md:text-[1.5rem]">
          About you
        </h1>
        <p className="mt-1 text-[13px] text-fg-muted">Discover your archetype.</p>
      </header>

      <div className="mb-4">
        <p className="text-[12px] font-medium text-fg-muted">
          Question {quizIndex + 1} of {total}
        </p>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <section className="rounded-xl border border-border bg-surface p-4 shadow-sm md:p-6">
        <h2 className="text-[15px] font-bold leading-snug text-fg md:text-[1.05rem]">{q.question}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {q.options.map((opt, i) => {
            const on = selected === i;
            return (
              <button
                key={opt.title + i}
                type="button"
                onClick={() => onSelect(i)}
                className={cn(
                  'relative rounded-xl border p-4 text-left transition-colors',
                  on ? 'border-accent bg-accent/5' : 'border-border bg-surface hover:border-border-strong',
                )}
              >
                <span className="absolute right-3 top-3">
                  <Checkbox checked={on} tabIndex={-1} aria-hidden className="pointer-events-none" />
                </span>
                <p className="pr-8 text-[14px] font-bold text-fg">{opt.title}</p>
                <p className="mt-1 pr-6 text-[12px] leading-relaxed text-fg-muted">{opt.detail}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Below the card, flush with its right edge — same as ranking */}
      <div className="mt-[18px] flex justify-end gap-2 lg:mt-3">
        <Button
          type="button"
          variant="outline"
          className="rounded-md bg-surface"
          onClick={onBack}
          disabled={!onBack}
        >
          Back
        </Button>
        <Button
          type="button"
          className="rounded-md font-semibold"
          onClick={onContinue}
          disabled={continueDisabled || !onContinue}
        >
          Continue
        </Button>
      </div>
    </>
  );
}

/* ── Archetype result (after quiz Q6) ─────────────────────────────────────── */

function ArchetypeResultPhase({
  archetype,
  onBack,
  onContinue,
}: {
  archetype: ArchetypeInfo;
  onBack?: () => void;
  onContinue?: () => void;
}) {
  return (
    <>
      <p className="mb-3 text-[15px] font-semibold text-fg-muted">Your defender archetype</p>

      <section className="rounded-xl border border-border bg-surface px-5 py-6 shadow-sm md:px-7 md:py-7">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/pioneer-archetype-illustration.png"
          alt=""
          className="mx-auto mb-2 h-[200px] w-full max-w-[360px] object-contain md:h-[240px]"
          aria-hidden
        />
        <h1 className="text-[clamp(1.875rem,4.5vw,2.625rem)] font-bold tracking-[-0.03em] text-accent">
          {archetype.name}
        </h1>
        <p className="mt-1 text-[16px] leading-snug text-fg-muted md:text-[17px]">
          {archetype.tagline}
        </p>
        <p className="mt-6 max-w-[36rem] text-[15px] leading-relaxed text-fg-muted">
          {archetype.description}
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {archetype.fits.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-accent/10 px-3.5 py-1.5 text-[13px] font-medium text-accent"
            >
              {tag}
            </span>
          ))}
        </div>
      </section>

      <div className="mt-4 text-[13px] leading-relaxed text-fg-muted">
        <p>Next:</p>
        <p>We’ll use this to recommend projects that fit how you think.</p>
      </div>

      <div className="mt-[18px] flex justify-end gap-2 lg:mt-3">
        <Button
          type="button"
          variant="outline"
          className="rounded-md bg-surface"
          onClick={onBack}
          disabled={!onBack}
        >
          Back
        </Button>
        <Button
          type="button"
          className="rounded-md font-semibold"
          onClick={onContinue}
          disabled={!onContinue}
        >
          Continue
        </Button>
      </div>
    </>
  );
}
