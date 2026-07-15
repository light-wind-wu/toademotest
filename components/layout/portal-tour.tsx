'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  X, ChevronLeft, ChevronRight, LayoutDashboard, GraduationCap,
  Send, Briefcase, ClipboardList, Map, ArrowRight,
  ShieldCheck, Users, Download, Upload, CheckCircle2, ArrowLeftRight, Rocket,
  Target, Cpu,
} from 'lucide-react';
import AiSparkleIcon from '@/components/ui-legacy/ai-sparkle-icon';

const TOUR_KEY = 'dsta_portal_tour';

interface TourStep {
  icon: React.ElementType;
  title: string;
  route: string | null;
  nav?: string;
  body: string;
  tip?: string;
  roleHint?: { action: string; detail: string };
}

const STEPS: TourStep[] = [
  {
    icon: Map,
    title: "Hey, I'm Youzheng — your guide today",
    route: null,
    body: "Nice to have you here. You might know me from the workshops we've done together. Today I'll walk you through the core project collection flow — IO creates a programme, sends a request to Shu Qi, she uploads her projects, and IO reviews them with AI quality checks before approving. The portal navigates for you at each step. Let's go.",
  },
  {
    icon: GraduationCap,
    title: 'IO: Create a Programme',
    route: '/programmes',
    nav: 'Programmes',
    body: "This is where the cycle starts. A programme is the container for everything — it sets the cohort category (e.g. UG Intern, IP), the application window, and the eligibility criteria that auto-screen applicants. Click 'New Programme' at the top right to create one. The category field is important — it drives which application form template gets linked and which AI level-checks apply to submitted projects.",
    tip: "Set status to 'Draft' during creation if the programme isn't ready to go live yet. You can flip it to Active once finalized.",
  },
  {
    icon: ShieldCheck,
    title: 'Setting Up Eligibility Criteria',
    route: '/programmes',
    nav: 'Programmes',
    body: "Inside each programme, the Criteria Builder lets you define who is eligible. Groups can be set to 'Must match ALL rules' or 'Match ANY pathway'. Any group marked Mandatory will auto-reject applicants who fail it — no human review needed, it happens instantly on submission. Non-mandatory groups flag the applicant for manual review instead.",
    tip: "Don't over-engineer this. One clear mandatory group — say, minimum GPA or citizenship — is usually enough. You can always tighten it after the first cohort.",
  },
  {
    icon: Send,
    title: 'IO: Send a Project Request',
    route: '/requests',
    nav: 'Proj Requests',
    body: "Click 'New Request'. You pick the PC, set a submission deadline, and specify how many intern placements are needed per programme. One request batch can cover multiple programmes at once. In this demo, the request goes to Shu Qi at shuqi.ng@dsta.gov.sg. The request table tracks live status — Pending, Overdue, Partial, or Submitted — so you always know where things stand.",
    tip: "The placement number is the total intern slots needed, not the number of projects. Shu Qi will submit multiple projects, each with their own slot count, until the total is met.",
  },
  {
    icon: Users,
    title: "Switch to AD(P&C) View",
    route: '/submissions',
    nav: 'Submissions',
    body: "Let's step into Shu Qi's shoes. Click the role chip in the top-right corner of the portal and select 'AD (P&C)'. The portal reloads with Shu Qi's view — only one tab is visible: Project Submission Requests. She'll see the open requests sent by the IO, with the deadline, programme name, and placement count.",
    roleHint: { action: 'Action: Switch role to AD (P&C)', detail: 'Top-right corner → click the role chip → select AD (P&C)' },
  },
  {
    icon: Download,
    title: 'AD(P&C): Download the Template',
    route: '/submissions',
    nav: 'Submissions',
    body: "Step 1 on this page: click 'Download Template'. This generates a pre-configured Excel file (.xlsx) with all required columns — the column list is defined by the IO in Templates and baked into the file. The Programme column is a dropdown pre-loaded with only the programmes in the request, so there's no room for typos or wrong programme names. Each header row includes a hint below it.",
    tip: "If the IO has updated the project template columns since last time, re-download the template to get the latest version. Old templates may be missing new required fields.",
  },
  {
    icon: Upload,
    title: 'AD(P&C): Upload the Filled Template',
    route: '/submissions',
    nav: 'Submissions',
    body: "Once the Excel is filled — one row per project — drag it back into the upload zone or click to browse. The system parses each row into an accordion form so Shu Qi can review and correct before submitting. Required fields are highlighted red if missing. The total number of missing fields across all rows is shown at the bottom — the Submit button stays disabled until everything is resolved.",
    tip: "The upload accepts Excel files (.xlsx, .xls). If a row has no Project Title it's skipped entirely, so blank rows in Excel won't cause issues.",
  },
  {
    icon: CheckCircle2,
    title: 'AD(P&C): Submit to IO',
    route: '/submissions',
    nav: 'Submissions',
    body: "When all rows pass validation, click 'Submit N Projects to IO'. The system groups them by programme, updates the submission count against each request, and marks the request as Submitted (matched) or Partially Submitted (partial). At this point the AI runs a quality check on every project — covering grammar, level-appropriateness for the internship category, and scope structure — and stores the results ready for IO to review.",
  },
  {
    icon: ArrowLeftRight,
    title: 'Switch Back to IO View',
    route: '/requests',
    nav: 'Proj Requests',
    body: "Role-switch back to IO Admin. Head to Proj Requests — the request row Shu Qi just responded to is now marked Submitted, and the Submissions tab shows the incoming batch. Click on any project row to open the full review page. The IO can review, approve, or reject each project individually.",
    roleHint: { action: 'Action: Switch role back to IO Admin', detail: 'Top-right corner → click the role chip → select IO Admin' },
  },
  {
    icon: ClipboardList,
    title: 'IO: Review the Submission',
    route: '/requests',
    nav: 'Proj Requests',
    body: "The review page shows everything in one view. Left column: AI Quality Checks at the top, then full project details, then mentor info. Right column: submission metadata and the approve / reject actions. Three AI checks run automatically on every submission: Grammar & Professional Tone, Language Level / Readability, and Scope–Category Alignment. Each check shows pass, warning, or fail with specific notes.",
  },
  {
    icon: AiSparkleIcon,
    title: 'AI Quality Checks — What They Catch',
    route: '/requests',
    nav: 'Proj Requests',
    body: "Grammar & Tone checks title formatting (capitalisation, length, articles), scope brevity, intern-facing language, and whether deliverables are mentioned. Language Level detects advanced terms that don't suit the internship category — for example, 'stochastic' or 'eigenvalue' in a IP scope would flag. Scope–Category Alignment checks whether the scope complexity and framing match what's expected for JC, Poly, or UG interns.",
    tip: "For JC/IP categories, the AI expects guided, introductory framing. For UG/Uni, it expects technical depth and research-oriented language. The check uses the Intern Category field set in the submission.",
  },
  {
    icon: Rocket,
    title: 'AI Suggestions — Apply or Ignore',
    route: '/requests',
    nav: 'Proj Requests',
    body: "Below the current title and scope, you'll see AI-suggested rewrites pre-filled in editable fields. These are structured for the internship level — JC suggestions use introductory framing, UG ones go deeper. Edit the suggestion as needed, then click Apply to overwrite the submission before approving. Once you're satisfied, hit Approve — the project is published to the Projects list. Reject with a remark if there are fundamental issues, and it goes back to Shu Qi.",
    tip: "Applying a suggestion updates the submission in place. The IO can still edit further after applying, or apply neither and approve the original as-is.",
  },
  {
    icon: Target,
    title: "'About You' — Getting to Know the Applicant",
    route: '/apply',
    nav: 'Apply',
    body: "Between the application form and project preferences, every applicant completes a 6-question scenario quiz. Each question presents a work-style scenario — how they'd respond to a threat, what they'd build in a free week, how they make decisions under pressure. Answers map to one of four Defender types: Sentinel (cybersecurity-leaning), Pathfinder (data and AI-leaning), Architect (systems integration-leaning), or Pioneer (robotics and unmanned systems-leaning). The type with the most answers wins. The applicant sees this as a fun self-discovery step — it surfaces their Defender Profile at the end. Internally, this profile feeds the project recommendation engine in the next step.",
    tip: "The 4 archetypes are deliberately broad — they're designed to produce a meaningful sort even when the applicant hasn't formed a strong preference yet. They are not shown to IO or used in any evaluation; they exist solely to personalise the project list ordering.",
  },
  {
    icon: Cpu,
    title: "Project Recommendation Engine — How Matching Works",
    route: '/apply',
    nav: 'Apply',
    body: "Each available project is scored against two signals. Signal 1 — Area of Interest (60% weight): taken from the applicant's 3 stated preferences in the form (1st × 0.5, 2nd × 0.3, 3rd × 0.2). Each interest choice is mapped to DSTA's actual tech domain strings — e.g. 'Air Systems' scores Sensors & Guided Weapons at 0.8 and Robotics at 0.7; 'Artificial Intelligence' scores AI & Data Analytics at 1.0; 'Cybersecurity' scores Cybersecurity at 1.0. Signal 2 — Defender Profile (40% weight): each archetype maps to domain weights — Sentinel: Cybersecurity 1.0, C3 0.5; Pathfinder: AI & Data 1.0; Architect: C3 Systems 1.0, AI 0.5; Pioneer: Robotics 1.0, Sensors 0.9. EmergingArea on the project is also checked as a secondary signal (capped at ×0.9 of its weight). Final score = Interest × 0.6 + Archetype × 0.4. If no interests are filled, score falls back to archetype only. Projects are sorted descending by final score. Those scoring ≥ 0.5 receive a ★ Match badge.",
    tip: "This mapping is hardcoded in apply-form.tsx under ARCHETYPE_DOMAIN_WEIGHTS, ARCHETYPE_EMERGING_WEIGHTS, INTEREST_DOMAIN_SCORE, and INTEREST_EMERGING_SCORE. To add new tech domains or refine weights, update those four tables and ensure the domain strings match exactly what is stored on the project (from projects.json or the submission flow).",
  },
];

type TourState = { open: boolean; step: number };

function loadState(): TourState {
  try {
    const raw = localStorage.getItem(TOUR_KEY);
    return raw ? JSON.parse(raw) : { open: false, step: 0 };
  } catch { return { open: false, step: 0 }; }
}

function saveState(s: TourState) {
  try { localStorage.setItem(TOUR_KEY, JSON.stringify(s)); } catch {}
}

export default function PortalTour() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [navigating, setNavigating] = useState(false);

  useEffect(() => {
    const s = loadState();
    setOpen(s.open);
    setStep(s.step);
  }, []);

  const persist = useCallback((nextOpen: boolean, nextStep: number) => {
    setOpen(nextOpen);
    setStep(nextStep);
    saveState({ open: nextOpen, step: nextStep });
  }, []);

  const goToStep = useCallback((nextStep: number) => {
    const target = STEPS[nextStep];
    persist(true, nextStep);
    if (target.route) {
      setNavigating(true);
      router.push(target.route);
      setTimeout(() => setNavigating(false), 600);
    }
  }, [persist, router]);

  function openTour() { persist(true, 0); }
  function close() { persist(false, 0); router.push('/dashboard'); }
  function handleDone() { persist(false, 0); router.push('/dashboard'); }

  const current = STEPS[step];
  const Icon    = current.icon;
  const isFirst = step === 0;
  const isLast  = step === STEPS.length - 1;

  return (
    <>
      {/* ── Trigger tab ──────────────────────────────────────────────────── */}
      {!open && (
        <button
          onClick={openTour}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-[300] flex items-center gap-2 bg-accent text-white text-[13px] font-bold uppercase tracking-widest px-2.5 py-3 rounded-l-xl shadow-lg hover:bg-accent/90 transition-colors"
          style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
          title="Portal Tour"
        >
          <Map size={13} className="shrink-0 rotate-90" />
          Portal Tour
        </button>
      )}

      {/* ── Tour panel ───────────────────────────────────────────────────── */}
      {open && (
        <div className="fixed right-0 top-1/2 -translate-y-1/2 z-[300] w-[340px] bg-surface border border-border rounded-l-2xl shadow-2xl flex flex-col overflow-hidden max-h-[85vh]">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-bg-subtle shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center shrink-0">
                <span className="text-[12px] font-black text-white">YL</span>
              </div>
              <div>
                <p className="text-[12px] font-bold text-accent uppercase tracking-wider leading-none">Portal Tour</p>
                <p className="text-[12px] text-fg-muted leading-none mt-0.5">Guide: Youzheng</p>
              </div>
            </div>
            <button onClick={close} className="p-1.5 rounded-full hover:bg-bg-muted text-fg-muted transition-colors" title="Exit tour">
              <X size={15} />
            </button>
          </div>

          {/* Progress dots */}
          <div className="flex gap-1 px-5 pt-3.5 pb-1 shrink-0">
            {STEPS.map((s, i) => (
              <button
                key={i}
                onClick={() => goToStep(i)}
                title={s.title}
                className={`h-1.5 rounded-full flex-1 transition-all duration-300 ${
                  i < step   ? 'bg-accent/40' :
                  i === step ? 'bg-accent' :
                  'bg-border hover:bg-border-strong'
                }`}
              />
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 px-5 py-4 overflow-y-auto">
            {/* Navigation chip */}
            {current.route && (
              <div className="flex items-center gap-1.5 mb-4 px-2.5 py-1.5 rounded-lg bg-accent/8 w-fit">
                <ArrowRight size={11} className="text-accent" />
                <span className="text-[13px] font-bold text-accent">{current.nav}</span>
              </div>
            )}

            <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center mb-3">
              {navigating
                ? <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                : <Icon size={18} className="text-accent" />
              }
            </div>

            <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle mb-1.5">
              Step {step + 1} of {STEPS.length}
            </p>
            <h3 className="text-headline-sm text-fg font-semibold mb-3 leading-snug">{current.title}</h3>
            <p className="text-body-sm text-fg-muted leading-relaxed">{current.body}</p>

            {/* Role switch callout */}
            {current.roleHint && (
              <div className="mt-3 flex items-start gap-2.5 px-3 py-2.5 bg-accent/5 border border-accent/20 rounded-lg">
                <Users size={13} className="text-accent mt-0.5 shrink-0" />
                <div>
                  <p className="text-[13px] font-bold text-accent leading-tight">{current.roleHint.action}</p>
                  <p className="text-[13px] text-fg-muted mt-0.5">{current.roleHint.detail}</p>
                </div>
              </div>
            )}

            {/* Tip callout */}
            {current.tip && (
              <div className="mt-3 flex items-start gap-2.5 px-3 py-2.5 bg-warning-bg border border-warning/20 rounded-lg">
                <span className="text-[12px] font-black text-warning uppercase shrink-0 mt-0.5">Tip</span>
                <p className="text-[13px] text-fg-muted leading-snug">{current.tip}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-border bg-bg-subtle shrink-0">
            <button
              onClick={() => goToStep(step - 1)}
              disabled={isFirst}
              className="flex items-center gap-1 text-body-sm font-medium text-fg-muted hover:text-fg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={15} />Back
            </button>
            <span className="text-caption text-fg-subtle">{step + 1} / {STEPS.length}</span>
            {isLast ? (
              <button
                onClick={handleDone}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-accent text-white text-body-sm font-semibold hover:bg-accent/90 transition-colors"
              >
                Done <ArrowRight size={13} />
              </button>
            ) : (
              <button
                onClick={() => goToStep(step + 1)}
                className="flex items-center gap-1 text-body-sm font-medium text-accent hover:text-accent/80 transition-colors"
              >
                Next<ChevronRight size={15} />
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
