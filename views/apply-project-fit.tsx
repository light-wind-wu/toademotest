'use client';

/* Session 2 — Find Your Project Fit:
   chapter intro → interests → Next opens archetype modal → ranking | quiz. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
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
  BarChart3,
  Bot,
  Bug,
  Check,
  Crosshair,
  FileSearch,
  Filter,
  GripVertical,
  Info,
  Layers,
  Network,
  Package,
  PenLine,
  Radar,
  RefreshCw,
  Rocket,
  Search,
  Send,
  Share2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Star,
  Swords,
  Trash2,
  Workflow,
  AppWindow,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import ApplicationFlowShell from '@/components/apply/application-flow-shell';
import ChapterIntro from '@/components/apply/chapter-intro';
import { Input } from '@/components/ui-legacy/input';
import {
  clearChapterIntro,
  loadApplyDraft,
  markChapterIntro,
  peekChapterIntro,
  saveApplyDraft,
  type ApplySessionDraft,
} from '@/lib/apply-application';
import {
  INTEREST_OPTIONS,
  INTEREST_OTHERS_LABEL,
  INTEREST_OTHERS_MAX,
  MAX_RANKED,
  PROJECT_MATCHES,
  QUIZ_QUESTIONS,
  resolveArchetype,
  type ArchetypeInfo,
  type ProjectMatch,
  type QuizOption,
} from '@/lib/apply-project-fit';
import { loadApplicantProfile } from '@/lib/myinfo';
import { isSignedIn } from '@/lib/session';
import { cn } from '@/lib/utils';

type Phase = 'interests' | 'ranking' | 'quiz' | 'result';

function shouldShowSession2Intro(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  if (params.get('from') === 'review') return false;
  const fromQuery = params.get('intro');
  return fromQuery === 'session-2' || peekChapterIntro() === 'session-2';
}

function initialPhase(): Phase {
  if (typeof window === 'undefined') return 'interests';
  const phase = new URLSearchParams(window.location.search).get('phase');
  if (phase === 'ranking' || phase === 'interests' || phase === 'quiz' || phase === 'result') {
    return phase;
  }
  return 'interests';
}

function isFromReview(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('from') === 'review';
}

export default function ApplyProjectFitPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [fromReview, setFromReview] = useState(false);
  const [draft, setDraft] = useState<ApplySessionDraft | null>(null);
  const [phase, setPhase] = useState<Phase>('interests');
  const [showArchetype, setShowArchetype] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [displayName, setDisplayName] = useState('there');

  useEffect(() => {
    if (!isSignedIn()) {
      router.replace('/login');
      return;
    }
    setFromReview(isFromReview());
    setPhase(initialPhase());
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
          onContinue: () => setShowArchetype(true),
          continueLabel: 'Next',
          continueDisabled:
            draft.interests.length === 0 ||
            (draft.interests.includes(INTEREST_OTHERS_LABEL) &&
              !draft.interestsOther.trim()),
        }
      : phase === 'result'
        ? {
            onBack: () => {
              setQuizIndex(QUIZ_QUESTIONS.length - 1);
              setPhase('quiz');
            },
            onContinue: () => setPhase('ranking'),
            continueLabel: 'Next',
            continueDisabled: false,
          }
      : phase === 'ranking'
        ? {
            onBack: () => {
              if (fromReview) {
                router.push('/apply/review');
                return;
              }
              setPhase(draft.quizTaken ? 'result' : 'interests');
            },
            onContinue: () => {
              if (fromReview) {
                router.push('/apply/review');
                return;
              }
              markChapterIntro('session-3');
              router.push('/apply/additional-details?intro=session-3');
            },
            continueLabel: fromReview ? 'Save' : 'Next',
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
      lockViewport={phase === 'ranking' || phase === 'result'}
    >
      {phase === 'interests' && (
        <InterestsPhase
          selected={draft.interests}
          otherText={draft.interestsOther}
          onChange={(interests) =>
            persist({
              ...draft,
              interests,
              interestsOther: interests.includes(INTEREST_OTHERS_LABEL)
                ? draft.interestsOther
                : '',
            })
          }
          onOtherChange={(interestsOther) => persist({ ...draft, interestsOther })}
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
          continueLabel={footer.continueLabel}
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
          onContinueWithInterests={() => {
            setShowArchetype(false);
            setPhase('ranking');
          }}
        />
      )}
    </ApplicationFlowShell>
  );
}

/* ── Interests ───────────────────────────────────────────────────────────── */

const TAG_SELECTED_BG = 'rgba(0, 166, 244, 0.15)';
const TAG_SELECTED_FG = 'rgba(0, 105, 168, 1)';
const TAG_IDLE_FG = 'rgba(15, 23, 43, 1)';
const TAG_IDLE_BORDER = 'rgba(231, 228, 221, 1)';

function InterestsPhase({
  selected,
  otherText,
  onChange,
  onOtherChange,
  onBack,
  onContinue,
  continueDisabled,
}: {
  selected: string[];
  otherText: string;
  onChange: (next: string[]) => void;
  onOtherChange: (next: string) => void;
  onBack?: () => void;
  onContinue?: () => void;
  continueDisabled?: boolean;
}) {
  const othersSelected = selected.includes(INTEREST_OTHERS_LABEL);
  const atLimit = otherText.length >= INTEREST_OTHERS_MAX;

  function toggle(tag: string) {
    if (selected.includes(tag)) onChange(selected.filter((t) => t !== tag));
    else onChange([...selected, tag]);
  }

  return (
    <>
      <header className="mb-5">
        <h1 className="text-[1.375rem] font-bold leading-snug tracking-tight text-fg md:text-[1.5rem]">
          Choose your interests
        </h1>
      </header>
      <section className="rounded-xl border border-border bg-surface p-4 shadow-sm md:p-6">
        <p className="text-[13px] text-fg-muted">
          Select the areas that interest you. We&apos;ll use them to personalize your project
          recommendations.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3 lg:gap-2">
          {INTEREST_OPTIONS.map((tag) => {
            const on = selected.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggle(tag)}
                className="inline-flex h-9 cursor-pointer items-center rounded-full border border-solid px-3.5 transition-colors"
                style={{
                  background: on ? TAG_SELECTED_BG : 'transparent',
                  borderColor: on ? 'transparent' : TAG_IDLE_BORDER,
                  fontWeight: 400,
                  fontSize: 14,
                  lineHeight: '20px',
                  color: on ? TAG_SELECTED_FG : TAG_IDLE_FG,
                }}
              >
                {tag}
              </button>
            );
          })}
          {othersSelected && (
            <div className="flex w-full basis-full flex-col gap-1 lg:w-[384px] lg:basis-auto lg:max-w-[384px]">
              <Input
                value={otherText}
                onChange={(e) => {
                  const next = e.target.value;
                  if (next.length <= INTEREST_OTHERS_MAX) onOtherChange(next);
                  else onOtherChange(next.slice(0, INTEREST_OTHERS_MAX));
                }}
                maxLength={INTEREST_OTHERS_MAX}
                placeholder="Enter your interest (max. 50 characters)"
                aria-label="Other interest"
                aria-invalid={atLimit}
                className={cn(
                  'h-9 w-full lg:max-w-[384px]',
                  atLimit && 'border-danger focus-visible:outline-danger',
                )}
              />
              {atLimit && (
                <p className="text-[12px] leading-4 text-danger">
                  Maximum limit of 50 characters
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Spacer so content clears the fixed footer */}
      <div className="h-[68px] shrink-0" aria-hidden />

      {/* Fixed bottom actions — same pattern as account-setup; PC offset for 220 sidebar */}
      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-30 flex h-[68px] items-center border-t border-border bg-surface px-4',
          'lg:left-[220px] lg:px-8',
        )}
      >
        <div className="flex w-full items-center justify-between gap-3">
          <button
            type="button"
            className="cursor-pointer bg-transparent p-0"
            style={{
              fontWeight: 500,
              fontSize: 14,
              lineHeight: '20px',
              color: 'rgba(15, 23, 42, 1)',
            }}
            onClick={onBack}
            disabled={!onBack}
          >
            Back
          </button>
          <button
            type="button"
            className="h-9 cursor-pointer rounded-md px-5 disabled:opacity-50 lg:h-10"
            style={{
              background: 'rgba(37, 99, 235, 1)',
              fontWeight: 400,
              fontSize: 14,
              lineHeight: '20px',
              color: 'rgba(255, 255, 255, 1)',
            }}
            onClick={onContinue}
            disabled={continueDisabled || !onContinue}
          >
            Next
          </button>
        </div>
      </div>
    </>
  );
}

/* ── Archetype modal ─────────────────────────────────────────────────────── */

function ArchetypeModal({
  onTakeQuiz,
  onContinueWithInterests,
}: {
  onTakeQuiz: () => void;
  onContinueWithInterests: () => void;
}) {
  const shadow =
    '0px 4px 6px -4px rgba(0, 0, 0, 0.05), 0px 10px 15px -3px rgba(0, 0, 0, 0.1)';

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6"
      style={{
        background: 'rgba(251, 250, 246, 0.6)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="archetypeTitle"
    >
      <div
        className={cn(
          'flex w-full flex-col items-stretch',
          'max-lg:max-w-[360px]',
          'lg:w-[672px] lg:max-w-[672px]',
        )}
      >
        <div
          className="relative w-full overflow-hidden rounded-2xl bg-surface"
          style={{ boxShadow: shadow }}
        >
          {/* PC — copy left, art right; height hugs content */}
          <div className="relative hidden lg:flex">
            <div className="relative z-[1] flex min-w-0 flex-1 flex-col py-8 pl-8 pr-4">
              <h2
                id="archetypeTitle"
                style={{
                  fontWeight: 600,
                  fontSize: 28,
                  lineHeight: '40px',
                  letterSpacing: '-0.48px',
                  color: 'rgba(10, 22, 40, 1)',
                }}
              >
                Take a 3-minute quiz
              </h2>
              <p
                style={{
                  marginTop: 24,
                  fontWeight: 400,
                  fontSize: 16,
                  lineHeight: '24px',
                  color: 'rgba(69, 85, 108, 1)',
                  maxWidth: '34ch',
                }}
              >
                Learn more about your working style and archetype. You can retake the quiz anytime
              </p>
              <div className="flex items-center gap-4" style={{ marginTop: 48 }}>
                <button
                  type="button"
                  onClick={onTakeQuiz}
                  className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md px-4"
                  style={{
                    background: 'rgba(26, 101, 248, 1)',
                    fontWeight: 400,
                    fontSize: 14,
                    lineHeight: '20px',
                    color: 'rgba(255, 255, 255, 1)',
                  }}
                >
                  Take a Short Quiz
                  <ArrowRight className="size-4 shrink-0" strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  onClick={onContinueWithInterests}
                  className="cursor-pointer bg-transparent p-0"
                  style={{
                    fontWeight: 400,
                    fontSize: 14,
                    lineHeight: '20px',
                    color: 'rgba(15, 23, 43, 1)',
                  }}
                >
                  Continue with Interests
                </button>
              </div>
            </div>
            <div className="relative min-h-[200px] w-[280px] shrink-0 self-stretch">
              <Image
                src="/images/quiz-pc.png"
                alt=""
                fill
                className="object-contain object-right-bottom"
                sizes="280px"
                priority
              />
            </div>
          </div>

          {/* Mobile — left copy + buttons, right art (comps) */}
          <div className="relative flex min-h-[220px] flex-col p-5 lg:hidden">
            <h2
              id="archetypeTitleMobile"
              style={{
                fontWeight: 600,
                fontSize: 22,
                lineHeight: '30px',
                letterSpacing: '-0.48px',
                color: 'rgba(10, 22, 40, 1)',
              }}
            >
              Take a 3-minute quiz
            </h2>
            <p
              style={{
                marginTop: 12,
                fontWeight: 400,
                fontSize: 14,
                lineHeight: '20px',
                color: 'rgba(69, 85, 108, 1)',
                whiteSpace: 'nowrap',
              }}
            >
              Learn more about your working
              <br />
              style and archetype. You can
              <br />
              retake the quiz anytime
            </p>
            <div className="relative z-[1] flex w-[168px] flex-col items-stretch gap-3" style={{ marginTop: 40 }}>
              <button
                type="button"
                onClick={onTakeQuiz}
                className="inline-flex h-9 w-[168px] cursor-pointer items-center justify-center gap-2 rounded-md"
                style={{
                  background: 'rgba(26, 101, 248, 1)',
                  fontWeight: 400,
                  fontSize: 14,
                  lineHeight: '20px',
                  color: 'rgba(255, 255, 255, 1)',
                }}
              >
                Take a Short Quiz
                <ArrowRight className="size-4 shrink-0" strokeWidth={1.5} />
              </button>
              <button
                type="button"
                onClick={onContinueWithInterests}
                className="cursor-pointer bg-transparent py-1 text-left"
                style={{
                  fontWeight: 400,
                  fontSize: 14,
                  lineHeight: '20px',
                  color: 'rgba(15, 23, 43, 1)',
                }}
              >
                Continue with Interests
              </button>
            </div>
            <div className="pointer-events-none absolute bottom-0 right-0 h-[160px] w-[160px]">
              <Image
                src="/images/quiz-m.png"
                alt=""
                fill
                className="object-contain object-right-bottom"
                sizes="160px"
              />
            </div>
          </div>
        </div>

        {/* Tip sits below the card, not inside it */}
        <p
          className="mt-4 flex items-center gap-2"
          style={{
            fontWeight: 400,
            fontSize: 14,
            lineHeight: '20px',
            color: 'rgba(69, 85, 108, 1)',
          }}
        >
          <Info size={14} className="shrink-0" strokeWidth={1.5} aria-hidden />
          <span>You can update your interests anytime.</span>
        </p>
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
  continueLabel = 'Next',
}: {
  displayName: string;
  rankedIds: string[];
  onChange: (ids: string[]) => void;
  onBack?: () => void;
  onContinue?: () => void;
  continueDisabled?: boolean;
  continueLabel?: string;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const rankedSet = useMemo(() => new Set(rankedIds), [rankedIds]);
  const highlight = { color: 'rgba(26, 101, 248, 1)', fontWeight: 600 as const };
  const [showMaxReached, setShowMaxReached] = useState(false);

  function add(id: string) {
    if (rankedSet.has(id)) return;
    if (rankedIds.length >= MAX_RANKED) {
      setShowMaxReached(true);
      return;
    }
    onChange([...rankedIds, id]);
  }

  function remove(id: string) {
    setShowMaxReached(false);
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

  const isEmpty = rankedIds.length === 0;

  return (
    /* Fills shell lockViewport area — page itself must not scroll */
    <div className="flex h-full min-h-0 flex-col">
      <header className="mb-8 shrink-0 lg:mb-6">
        <h1 className="text-[1.375rem] font-bold leading-snug tracking-tight text-fg md:text-[1.5rem]">
          Rank your projects, {displayName}.
        </h1>
        <p className="mt-1 text-[13px] text-fg-muted">
          Based on your{' '}
          <span style={highlight}>selected interests</span> profile and interests, we&apos;ve flagged
          your best matches. Pick up to {MAX_RANKED} in order of preference.
        </p>
      </header>

      {/* One white panel: left scroll (no scrollbar) · divider · right ranking */}
      <section
        className={cn(
          'min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-surface shadow-sm',
          'grid lg:grid-cols-[minmax(0,1fr)_369px]',
          /* Mobile: empty ranking hugs content; with items keep fixed height + scroll */
          isEmpty
            ? 'max-lg:grid-rows-[minmax(0,1fr)_auto]'
            : 'max-lg:grid-rows-[minmax(0,1fr)_180px]',
        )}
      >
        <div
          className={cn(
            'min-h-0 space-y-4 overflow-y-auto p-4 md:p-5',
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

        <aside
          className={cn(
            'flex flex-col border-t border-border px-4 pt-4 md:px-5 md:pt-5 lg:border-l lg:border-t-0 lg:pb-5',
            /* Mobile empty: hug tip + 16px below; with items fill fixed row and scroll */
            isEmpty ? 'max-lg:pb-4' : 'min-h-0 max-lg:pb-4',
            'lg:min-h-0',
          )}
        >
          <h2
            className="shrink-0"
            style={{
              fontWeight: 500,
              fontSize: 12,
              lineHeight: '16px',
              color: 'rgba(15, 23, 43, 1)',
            }}
          >
            Your project ranking · {rankedIds.length} / {MAX_RANKED}
          </h2>
          <div
            className={cn(
              'mt-3',
              !isEmpty &&
                'min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
              isEmpty &&
                'lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:[scrollbar-width:none] lg:[-ms-overflow-style:none] lg:[&::-webkit-scrollbar]:hidden',
            )}
          >
            {isEmpty ? (
              <div
                className="rounded-lg px-3 py-4 text-[13px] leading-relaxed text-fg-muted"
                style={{
                  background: 'rgba(247, 247, 247, 1)',
                  border: '1px solid rgba(231, 228, 221, 1)',
                }}
              >
                Tap <span style={highlight}>Add to ranking</span> to build your list. 1st is your top
                choice.
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
          {showMaxReached && (
            <div className="mt-3 flex shrink-0 items-center gap-2 text-body-sm text-warning">
              <Info size={14} className="shrink-0" strokeWidth={1.5} aria-hidden />
              Maximum of 5 projects reached. Remove one to add another.
            </div>
          )}
        </aside>
      </section>

      {/* Spacer for fixed footer */}
      <div className="h-[68px] shrink-0" aria-hidden />

      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-30 flex h-[68px] items-center border-t border-border bg-surface px-4',
          'lg:left-[220px] lg:px-8',
        )}
      >
        <div className="flex w-full items-center justify-between gap-3">
          <button
            type="button"
            className="cursor-pointer bg-transparent p-0"
            style={{
              fontWeight: 500,
              fontSize: 14,
              lineHeight: '20px',
              color: 'rgba(15, 23, 42, 1)',
            }}
            onClick={onBack}
            disabled={!onBack}
          >
            Back
          </button>
          <button
            type="button"
            className="h-9 cursor-pointer rounded-md px-5 disabled:opacity-50 lg:h-10"
            style={{
              background: 'rgba(37, 99, 235, 1)',
              fontWeight: 400,
              fontSize: 14,
              lineHeight: '20px',
              color: 'rgba(255, 255, 255, 1)',
            }}
            onClick={onContinue}
            disabled={continueDisabled || !onContinue}
          >
            {continueLabel}
          </button>
        </div>
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
          <span
            className="inline-flex h-[22px] shrink-0 items-center gap-1 rounded-full px-2"
            style={{
              background: 'rgba(0, 166, 244, 0.15)',
              fontWeight: 600,
              fontSize: 12,
              lineHeight: '16px',
              color: 'rgba(0, 105, 168, 1)',
            }}
          >
            <Star
              className="h-3 w-3"
              style={{ fill: 'rgba(0, 105, 168, 1)', color: 'rgba(0, 105, 168, 1)' }}
              strokeWidth={0}
            />
            Great match
          </span>
        )}
      </div>
      <p
        className="mt-2"
        style={{
          fontWeight: 400,
          fontSize: 14,
          lineHeight: '20px',
          color: 'rgba(69, 85, 108, 1)',
        }}
      >
        {project.description}
      </p>
      <div className="mt-3">
        {added ? (
          <span
            className="inline-flex items-center gap-1.5"
            style={{
              height: 32,
              borderRadius: 6,
              padding: '6.5px 12px',
              background: 'rgba(247, 247, 247, 1)',
              border: '1px solid rgba(231, 228, 221, 1)',
              fontWeight: 500,
              fontSize: 12,
              lineHeight: '16px',
              color: 'rgba(15, 23, 43, 1)',
            }}
          >
            <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> Added
          </span>
        ) : (
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex h-8 cursor-pointer items-center border border-border px-3"
            style={{
              borderRadius: 6,
              background: 'rgba(251, 250, 246, 1)',
              fontWeight: 400,
              fontSize: 14,
              lineHeight: '20px',
              color: 'rgba(15, 23, 43, 1)',
            }}
          >
            + Add To Ranking
          </button>
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
        className="cursor-grab touch-none p-1 active:cursor-grabbing"
        style={{ color: 'rgba(0, 0, 0, 1)' }}
        aria-label="Drag to reorder"
        {...listeners}
        {...attributes}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span
        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
        style={{
          background: 'rgba(243, 239, 229, 1)',
          border: '1px solid rgba(231, 228, 221, 1)',
          fontWeight: 600,
          fontSize: 14,
          lineHeight: '18px',
          color: 'rgba(15, 23, 43, 1)',
        }}
      >
        {rank}
      </span>
      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-fg">{title}</span>
      <button
        type="button"
        onClick={onRemove}
        className="p-1 hover:opacity-70"
        style={{ color: 'rgba(15, 23, 43, 1)' }}
        aria-label={`Remove ${title}`}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}

/* ── Quiz (Q1–Q6) ────────────────────────────────────────────────────────── */

const QUIZ_ICONS: Record<QuizOption['icon'], LucideIcon> = {
  radar: Radar,
  logs: RefreshCw,
  window: AppWindow,
  'shield-check': ShieldCheck,
  'shield-alert': ShieldAlert,
  chart: BarChart3,
  layers: Layers,
  bot: Bot,
  shield: Shield,
  search: Search,
  network: Network,
  rocket: Rocket,
  crosshair: Crosshair,
  'bar-chart': BarChart3,
  pen: PenLine,
  package: Package,
  swords: Swords,
  'file-search': FileSearch,
  share: Share2,
  zap: Zap,
  bug: Bug,
  filter: Filter,
  workflow: Workflow,
  send: Send,
};

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

      {/* Progress — PC: bar + “1 of 6”; mobile: “Question 1 of 6” above bar */}
      <div className="mb-4">
        <p className="mb-2 text-[12px] font-medium text-fg-muted lg:hidden">
          Question {quizIndex + 1} of {total}
        </p>
        <div className="flex items-center gap-3">
          <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progress}%`, background: 'rgba(26, 101, 248, 1)' }}
            />
          </div>
          <p
            className="hidden shrink-0 text-[12px] font-medium lg:block"
            style={{ color: 'rgba(69, 85, 108, 1)' }}
          >
            {quizIndex + 1} of {total}
          </p>
        </div>
      </div>

      <section className="rounded-xl border border-border bg-surface p-4 shadow-sm md:p-6">
        <h2 className="text-[15px] font-bold leading-snug text-fg md:text-[1.05rem]">
          Q{quizIndex + 1}. {q.question}
        </h2>
        {/* Mobile: 1 col · PC: 2×2 */}
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
          {q.options.map((opt, i) => {
            const on = selected === i;
            const Icon = QUIZ_ICONS[opt.icon];
            return (
              <button
                key={opt.title + i}
                type="button"
                onClick={() => onSelect(i)}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition-colors',
                  on
                    ? 'border-[rgba(74,164,129,1)] bg-[rgba(74,164,129,0.07)]'
                    : 'border-border bg-surface hover:border-border-strong',
                )}
              >
                <span
                  className={cn(
                    'inline-flex size-10 shrink-0 items-center justify-center rounded-lg',
                    on
                      ? 'bg-[rgba(74,164,129,0.15)] text-[rgba(74,164,129,1)]'
                      : 'bg-bg text-fg-muted',
                  )}
                >
                  <Icon className="size-5" strokeWidth={1.5} aria-hidden />
                </span>
                <span
                  className="min-w-0 flex-1"
                  style={{
                    fontWeight: 500,
                    fontSize: 14,
                    lineHeight: '20px',
                    color: 'rgba(15, 23, 43, 1)',
                  }}
                >
                  {opt.title}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="h-[68px] shrink-0" aria-hidden />

      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-30 flex h-[68px] items-center border-t border-border bg-surface px-4',
          'lg:left-[220px] lg:px-8',
        )}
      >
        <div className="flex w-full items-center justify-between gap-3">
          <button
            type="button"
            className="cursor-pointer bg-transparent p-0"
            style={{
              fontWeight: 500,
              fontSize: 14,
              lineHeight: '20px',
              color: 'rgba(15, 23, 42, 1)',
            }}
            onClick={onBack}
            disabled={!onBack}
          >
            Back
          </button>
          <button
            type="button"
            className="h-9 cursor-pointer rounded-md px-5 disabled:opacity-50 lg:h-10"
            style={{
              background: 'rgba(37, 99, 235, 1)',
              fontWeight: 400,
              fontSize: 14,
              lineHeight: '20px',
              color: 'rgba(255, 255, 255, 1)',
            }}
            onClick={onContinue}
            disabled={continueDisabled || !onContinue}
          >
            Next
          </button>
        </div>
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
  const accent = archetype.color;
  const pcImg = `/images/${archetype.id}-pc.png`;
  const mobileImg = `/images/${archetype.id}-m.png`;
  const tagStyle = {
    height: 22,
    padding: '2px 10px',
    background: 'rgba(0, 166, 244, 0.15)',
    borderRadius: 9999,
    fontWeight: 400 as const,
    fontSize: 12,
    lineHeight: '16px',
    color: 'rgba(0, 105, 168, 1)',
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-0 flex-1 flex-col justify-start overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden lg:justify-center">
      <div className="mx-auto w-full lg:w-[740px] lg:max-w-[740px]">
        <header className="mb-5 w-full">
          <h1
            className="w-full break-words max-lg:text-[20px] max-lg:leading-8 lg:text-[24px] lg:leading-8"
            style={{
              fontWeight: 600,
              color: 'rgba(15, 23, 43, 1)',
              textAlign: 'left',
              overflowWrap: 'break-word',
              wordBreak: 'normal',
            }}
          >
            Meet Your Defender Archetype
          </h1>
          <p
            style={{
              marginTop: 4,
              fontWeight: 400,
              fontSize: 14,
              lineHeight: '100%',
              color: 'rgba(74, 85, 104, 1)',
            }}
          >
            Based on your quiz responses
          </p>
        </header>

        <section className="relative w-full overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
          {/* Art sits on the card background — flush to edges, no inset gap */}
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[48%] lg:block">
            <Image
              src={pcImg}
              alt=""
              fill
              className="object-contain object-right-bottom"
              sizes="360px"
              priority
            />
          </div>
          <div className="pointer-events-none absolute bottom-0 right-0 h-[180px] w-[160px] lg:hidden">
            <Image
              src={mobileImg}
              alt=""
              fill
              className="object-contain object-right-bottom"
              sizes="160px"
            />
          </div>

          <div
            className="relative z-[1] p-6 lg:p-8"
          >
            {/* PC copy */}
            <div className="hidden max-w-[52%] lg:block">
              <h2
                style={{
                  fontWeight: 600,
                  fontSize: 36,
                  lineHeight: '40px',
                  letterSpacing: '-0.9px',
                  color: accent,
                }}
              >
                {archetype.name}
              </h2>
              <p
                style={{
                  marginTop: 4,
                  fontWeight: 400,
                  fontSize: 14,
                  lineHeight: '100%',
                  color: accent,
                }}
              >
                {archetype.tagline}
              </p>
              <p
                style={{
                  marginTop: 24,
                  fontWeight: 400,
                  fontSize: 16,
                  lineHeight: '24px',
                  color: 'rgba(69, 85, 108, 1)',
                }}
              >
                {archetype.description}
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {archetype.fits.map((tag) => (
                  <span key={tag} className="inline-flex items-center" style={tagStyle}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Mobile copy — fixed line breaks so body clears corner art */}
            <div className="relative z-[1] w-full lg:hidden">
              <h2
                className="w-full break-words"
                style={{
                  fontWeight: 600,
                  fontSize: 24,
                  lineHeight: '32px',
                  letterSpacing: '-0.48px',
                  color: accent,
                  overflowWrap: 'break-word',
                  wordBreak: 'normal',
                }}
              >
                {archetype.name}
              </h2>
              <p
                className="whitespace-pre-line"
                style={{
                  marginTop: 4,
                  fontWeight: 400,
                  fontSize: 14,
                  lineHeight: '20px',
                  color: accent,
                }}
              >
                {archetype.taglineMobile ?? archetype.tagline}
              </p>
              <p
                className="whitespace-pre-line"
                style={{
                  marginTop: 24,
                  fontWeight: 400,
                  fontSize: 14,
                  lineHeight: '22px',
                  color: 'rgba(69, 85, 108, 1)',
                }}
              >
                {archetype.descriptionMobile}
              </p>
              <div className="mt-6 flex w-full flex-col items-start gap-2">
                {archetype.fits.map((tag) => (
                  <span key={tag} className="inline-flex items-center" style={tagStyle}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

      <p
        className="mt-4 flex items-center gap-2"
        style={{
          fontWeight: 400,
          fontSize: 14,
          lineHeight: '20px',
          color: 'rgba(69, 85, 108, 1)',
        }}
      >
        <Info size={14} className="shrink-0" strokeWidth={1.5} aria-hidden />
        <span>You can update your interests anytime.</span>
      </p>
      </div>
      </div>

      <div className="h-[68px] shrink-0" aria-hidden />

      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-30 flex h-[68px] items-center border-t border-border bg-surface px-4',
          'lg:left-[220px] lg:px-8',
        )}
      >
        <div className="flex w-full items-center justify-between gap-3">
          <button
            type="button"
            className="cursor-pointer bg-transparent p-0"
            style={{
              fontWeight: 500,
              fontSize: 14,
              lineHeight: '20px',
              color: 'rgba(15, 23, 42, 1)',
            }}
            onClick={onBack}
            disabled={!onBack}
          >
            Back
          </button>
          <button
            type="button"
            className="h-9 cursor-pointer rounded-md px-5 disabled:opacity-50 lg:h-10"
            style={{
              background: 'rgba(37, 99, 235, 1)',
              fontWeight: 400,
              fontSize: 14,
              lineHeight: '20px',
              color: 'rgba(255, 255, 255, 1)',
            }}
            onClick={onContinue}
            disabled={!onContinue}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
