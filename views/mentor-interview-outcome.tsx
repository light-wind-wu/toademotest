'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import Shell from '@/components/layout/shell';
import Button from '@/components/ui-legacy/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  ChevronLeft,
  FileText,
  Sparkles,
  X,
  Upload,
  CalendarClock,
  Check,
} from 'lucide-react';
import { cn, mentorIdMatches } from '@/lib/utils';
import { useRole } from '@/lib/role';
import { addNotification } from '@/lib/notifications';
import type { Application, ProjectEntry } from '@/lib/types';
import { loadProjects } from '@/lib/storage';
import { loadApplications, saveApplications } from '@/lib/ut-scenarios/utils';
import { getSchoolShort, formatSlot } from '@/lib/mentor-workspace';

type Recommendation = 'Accepted' | 'Rejected' | 'Referred';
type StructuredSummary = {
  strengths: string[];
  weaknesses: string[];
  roleFit: string[];
  nextSteps: string[];
};

const RECOMMENDATION_LABELS: Record<Recommendation, string> = {
  Accepted: 'Recommend for offer',
  Rejected: 'Do not recommend',
  Referred: 'Refer to another project',
};

/* ── Helpers ───────────────────────────────────────────────────────────────── */

function deriveTranscriptFileName(app: Application): string {
  return `Interview_Transcript_${app.name.replace(/\s+/g, '_')}.pdf`;
}

function getInterviewSlot(app: Application) {
  if (app.confirmedSlot != null && app.interviewSlots?.[app.confirmedSlot]) {
    return app.interviewSlots[app.confirmedSlot];
  }
  return null;
}

function generateStructuredSummary(
  notes: string,
  transcript: string,
  app: Application,
  project: ProjectEntry | null,
): StructuredSummary {
  const text = `${notes} ${transcript}`.toLowerCase();
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const roleFit: string[] = [];
  const nextSteps: string[] = [];

  const technical = /\b(technical|coding|algorithm|system|security|programming|depth|knowledge|software|development)\b/.test(text);
  const comm = /\b(communicat|clear|articulate|structured|confident|express)\b/.test(text);
  const initiative = /\b(initiative|drive|proactive|ownership|lead|leadership|motivat)\b/.test(text);
  const problem = /\b(problem|analytical|critical|reasoning|solution|thinking)\b/.test(text);
  const gaps = /\b(limited|gap|surface|shallow|lacks?|less|few|incomplete|example|exposure)\b/.test(text);
  const positive = /\b(strong|good|solid|excellent|impressive|clear|confident|recommend)\b/.test(text);

  if (technical) strengths.push('Solid technical fundamentals in software development, databases, and basic data security practices.');
  if (comm) strengths.push('Communicated clearly, structurally, and confidently.');
  if (initiative) strengths.push('Showed initiative and willingness to take ownership of tasks.');
  if (problem) strengths.push('Demonstrated analytical and problem-solving skills during scenario discussion.');
  if (strengths.length === 0) {
    strengths.push('Demonstrated enthusiasm and a foundational understanding of the subject area.');
    strengths.push('Engaged positively with the interview questions.');
  }

  if (gaps) weaknesses.push('Limited exposure to real-world or large-scale projects in the domain.');
  if (!gaps) weaknesses.push('Could provide more concrete examples to back up high-level answers.');
  if (!technical) weaknesses.push('Technical depth may need further validation against project-specific requirements.');

  roleFit.push('Suitable for an internship or entry-level role with structured mentorship.');
  if (project?.skills?.length) {
    roleFit.push(`Background aligns with the project's focus on ${project.skills.slice(0, 3).join(', ')}.`);
  }
  if (app.course) roleFit.push(`Academic background in ${app.course} supports the role requirements.`);

  if (positive) {
    nextSteps.push('Proceed with an internship offer; current gaps can be addressed through onboarding and project exposure.');
  } else {
    nextSteps.push('Consider additional screening or a short skills assessment before extending an offer.');
  }

  return { strengths, weaknesses, roleFit, nextSteps };
}

function isOverdue(dueDate?: string): boolean {
  if (!dueDate) return false;
  const due = new Date(`${dueDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

function overdueText(dueDate?: string): string | null {
  if (!dueDate || !isOverdue(dueDate)) return null;
  const due = new Date(`${dueDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  return diff === 1 ? '1 day overdue' : `${diff} days overdue`;
}

/* ── Page ───────────────────────────────────────────────────────────────────── */

export default function MentorInterviewOutcomePage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { profile } = useRole();

  const [apps, setApps] = useState<Application[]>([]);
  const [projects, setProjects] = useState<ProjectEntry[]>([]);

  useEffect(() => {
    setApps(loadApplications());
    setProjects(loadProjects());
  }, []);

  const app = apps.find(a => a.id === id) ?? null;
  const project = app?.shortlistedFor ? projects.find(p => p.id === app.shortlistedFor) : null;
  const projectId = app?.shortlistedFor;

  const [notes, setNotes] = useState('');
  const [transcript, setTranscript] = useState('');
  const [transcriptFileName, setTranscriptFileName] = useState('');
  const [summary, setSummary] = useState<StructuredSummary | null>(null);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!app) return;
    setNotes(app.mentorNotes ?? '');
    setTranscript(app.mentorTranscript ?? '');
    setTranscriptFileName(app.mentorTranscript ? deriveTranscriptFileName(app) : '');
    setSummary(app.mentorAiSummaryStructured ?? null);
    const initial: Recommendation | null = app.mentorDecision ?? app.mentorOutcomeRecommendation ?? null;
    setRecommendation(initial);
  }, [app?.id]);

  function saveApp(updated: Application) {
    const next = apps.map(a => (a.id === updated.id ? updated : a));
    setApps(next);
    saveApplications(next);
  }

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setTranscriptFileName(file.name);
    const reader = new FileReader();
    reader.onload = ev => {
      const text = (ev.target?.result as string) ?? '';
      setTranscript(text.slice(0, 12000));
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function currentSummary(): StructuredSummary {
    if (summary) return summary;
    return generateStructuredSummary(notes, transcript, app!, project ?? null);
  }

  function handleGenerate() {
    if (!app) return;
    setSummary(generateStructuredSummary(notes, transcript, app, project ?? null));
  }

  function buildUpdate(extra?: Partial<Application>): Application {
    if (!app) throw new Error('No app');
    return {
      ...app,
      mentorNotes: notes || undefined,
      mentorTranscript: transcript || undefined,
      mentorOutcomeRecommendation: recommendation,
      mentorAiSummaryStructured: currentSummary(),
      ...extra,
    };
  }

  function handleSaveDraft() {
    if (!app) return;
    saveApp(buildUpdate());
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function handleSendOutcome() {
    if (!app || !recommendation) return;
    setSending(true);
    const submittedAt = format(new Date(), 'yyyy-MM-dd');
    const updated = buildUpdate({
      mentorDecision: recommendation,
      mentorOutcomeSubmittedAt: submittedAt,
      mentorOutcomeRecommendation: undefined,
    });
    saveApp(updated);
    addNotification({
      forRole: 'io',
      title: `Interview outcome submitted for ${app.name}`,
      body: `${profile.name} has submitted an outcome for ${app.name}: ${RECOMMENDATION_LABELS[recommendation]}.`,
      href: '/applications',
      tier: 'action',
    });
    setSending(false);
    if (projectId) {
      router.push(`/mentor/projects/${projectId}`);
    } else {
      router.push('/mentor/projects');
    }
  }

  /* ── Guards ──────────────────────────────────────────────────────────────── */
  if (apps.length > 0 && !app) {
    return (
      <Shell activeRoute="/mentor/interviews">
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
          <p className="text-body-lg font-semibold text-fg">Interview not found</p>
          <Button variant="ghost" onClick={() => router.push('/mentor/projects')}>
            <ChevronLeft size={14} /> Back to workspace
          </Button>
        </div>
      </Shell>
    );
  }
  if (!app) return null;

  const myProjectIds = new Set(
    projects.filter(p => mentorIdMatches(p.mentorUserId, profile.email)).map(p => p.id),
  );
  if (app.shortlistedFor && !myProjectIds.has(app.shortlistedFor)) {
    router.push('/mentor/projects');
    return null;
  }

  const slot = getInterviewSlot(app);
  const interviewText = slot
    ? formatSlot(slot, { includeTime: true, includeDuration: false })
    : 'Not scheduled';

  const overdue = overdueText(app.interviewDueDate);
  const workspaceHref = projectId ? `/mentor/projects/${projectId}` : '/mentor/projects';
  const canSend = !!recommendation;

  const SectionBlock = ({
    title,
    items,
    iconColor = 'text-accent',
  }: {
    title: string;
    items: string[];
    iconColor?: string;
  }) => (
    <div className="mb-4">
      <h4 className="flex items-center gap-2 text-body-sm font-bold text-accent mb-2">
        <Sparkles size={14} className={iconColor} />
        {title}
      </h4>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-body-sm text-fg">
            <span className="mt-1.5 w-1 h-1 rounded-full bg-accent shrink-0" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <Shell activeRoute="/mentor/interviews">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-label-md mb-3">
        <button
          onClick={() => router.push('/mentor/projects')}
          className="text-fg-muted hover:text-accent transition-colors flex items-center gap-1"
        >
          <ChevronLeft size={14} /> My Projects
        </button>
        <span className="text-fg-subtle">/</span>
        <button
          onClick={() => router.push(workspaceHref)}
          className="text-fg-muted hover:text-accent transition-colors"
        >
          Interview workspace
        </button>
        <span className="text-fg-subtle">/</span>
        <span className="text-fg font-semibold">Interview outcome</span>
      </nav>

      {/* Header */}
      <div className="mb-5">
        <h1 className="text-headline-lg text-fg mb-1">Interview Outcome For {app.name}</h1>
        <p className="text-body-md text-fg-muted">
          Record evidence from the interview before sending your recommendation to IO.
        </p>
      </div>

      {/* Unified white card */}
      <div className="rounded-2xl border border-border bg-surface overflow-hidden">
        {/* Top summary row */}
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 border-b border-border">
          <div className="p-5">
            <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle mb-1">Project</p>
            <p className="text-body-sm font-semibold text-fg">{project?.title ?? '—'}</p>
          </div>
          <div className="relative p-5">
            <div className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 w-px h-8 bg-border" />
            <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle mb-1">Interview</p>
            <p className="text-body-sm font-semibold text-fg">{interviewText}</p>
          </div>
          <div className="relative p-5">
            <div className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 w-px h-8 bg-border" />
            <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle mb-1">Applicant</p>
            <p className="text-body-sm font-semibold text-fg">
              {app.name} · {getSchoolShort(app.school)} · Year {app.year}
            </p>
          </div>
        </div>

        {/* Main form */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-6 p-5 pb-24 items-start">
          {/* Left: transcript + notes */}
          <div className="space-y-6">
            <div>
              <h2 className="text-label-md font-semibold text-fg mb-1">Interview transcript</h2>
              <p className="text-[13px] text-fg-muted mb-4">
                Use the transcript as evidence when reviewing the AI-assisted summary.
              </p>

              {transcript ? (
                <div className="flex items-center gap-3 rounded-xl border border-border bg-bg-subtle p-3">
                  <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                    <FileText size={16} className="text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-body-sm font-semibold text-fg">{deriveTranscriptFileName(app)}</p>
                    <p className="text-[12px] text-fg-muted truncate">{transcriptFileName} · {(transcript.length / 1024).toFixed(1)} kB</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setTranscriptOpen(true)}>
                    View Transcript
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-bg-subtle p-6 cursor-pointer hover:bg-bg-subtle/80 transition-colors">
                  <Upload size={20} className="text-fg-muted" />
                  <span className="text-body-sm text-fg-muted">Upload transcript .txt</span>
                  <input type="file" accept=".txt" className="hidden" onChange={handleUpload} />
                </label>
              )}
            </div>

            <div>
              <h2 className="text-label-md font-semibold text-fg mb-3">Interview notes</h2>
              <textarea
                className="w-full rounded-xl border border-border bg-bg-subtle px-3 py-2.5 text-body-sm text-fg resize-none focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                rows={10}
                placeholder="Capture evidence, strengths, and areas to verify..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
              <p className="mt-2 text-[12px] text-fg-subtle">Notes can be saved as a draft before submission.</p>
            </div>
          </div>

          {/* Vertical divider */}
          <div className="hidden lg:block w-px bg-border self-stretch" />

          {/* Right: AI summary + recommendation */}
          <div className="space-y-6">
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h2 className="text-label-md font-semibold text-fg">AI-assisted summary</h2>
                  <p className="text-[13px] text-fg-muted mt-0.5">
                    Generated from interview. Please review before submitting.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={handleGenerate}>
                  Customize
                </Button>
              </div>

              <div className="rounded-xl border border-accent/20 bg-accent/5 p-4">
                {summary ? (
                  <>
                    <SectionBlock title="Strengths" items={summary.strengths} />
                    <SectionBlock title="Weaknesses" items={summary.weaknesses} />
                    <SectionBlock title="Role fit" items={summary.roleFit} />
                    <SectionBlock title="Recommended next steps" items={summary.nextSteps} />
                  </>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-body-sm text-fg-muted mb-3">
                      Generate a structured summary from your notes and transcript.
                    </p>
                    <Button variant="outline" size="sm" onClick={handleGenerate}>
                      <Sparkles size={13} className="mr-1.5" /> Generate summary
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-label-md font-semibold text-fg mb-3">Recommendation</label>
              <Select
                value={recommendation ?? ''}
                onValueChange={(value: string | null) => setRecommendation(value as Recommendation)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a recommendation" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(RECOMMENDATION_LABELS) as Recommendation[]).map(key => (
                    <SelectItem key={key} value={key}>
                      {RECOMMENDATION_LABELS[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky footer */}
      <div className="sticky bottom-0 z-30 -mx-[clamp(24px,2.6vw,40px)] -mb-8 mt-6 flex items-center justify-between border-t border-border bg-surface/95 px-[clamp(24px,2.6vw,40px)] py-3.5 backdrop-blur-sm">
        <Button variant="ghost" onClick={() => router.push(workspaceHref)}>
          <ChevronLeft size={14} /> Back to workspace
        </Button>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="text-body-sm text-success flex items-center gap-1">
              <Check size={14} /> Saved
            </span>
          )}
          <Button variant="outline" onClick={() => router.push(workspaceHref)}>
            Cancel
          </Button>
          <Button variant="outline" onClick={handleSaveDraft}>
            Save as Draft
          </Button>
          <Button onClick={handleSendOutcome} disabled={!canSend || sending}>
            {sending ? 'Sending…' : 'Send outcome to Internship Officer'}
          </Button>
        </div>
      </div>

      {/* Transcript viewer dialog */}
      <Dialog open={transcriptOpen} onOpenChange={setTranscriptOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Interview Transcript</DialogTitle>
            <DialogDescription>{deriveTranscriptFileName(app)}</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto rounded-xl border border-border bg-bg-subtle p-4 mt-2">
            <p className="text-body-sm text-fg whitespace-pre-wrap">{transcript || 'No transcript content.'}</p>
          </div>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}
