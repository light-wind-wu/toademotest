'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Upload, Plus, Trash2, CheckCircle2, AlertTriangle, FileSpreadsheet, ChevronDown, ChevronUp, Download, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PROJECT_SUBMISSION_COLUMNS } from '@/lib/data';
import { downloadRequestTemplateXLSX } from '@/lib/request-template';
import { loadRequests, loadSubmissions, saveSubmissions } from '@/lib/storage';
import Combobox from '@/components/ui-legacy/combobox';
import { DISCIPLINE_OPTIONS, parseDisciplines, toggleDiscipline } from '@/lib/disciplines';
import { parseSkills, removeSkill } from '@/lib/skills';
import type { ProjectRequest, SubmittedProject, ProjectSubmissionBatch, AiCheckResult } from '@/lib/types';
import KineticBounce from '@/components/layout/kinetic-bounce';

const PROGRAMMES_LABELS: Record<string, string> = {
  uni:    'University Internship',
  jc:     'Junior College Internship',
  postjc: 'Post-JC / Post-Poly Internship',
  poly:   'Polytechnic Internship',
  ydsp:   'IP',
};

const EDUCATION_OPTIONS = ['Any', 'Junior College', 'Polytechnic', 'University'];
const PROJECT_TYPE_OPTIONS = ['Technical', 'Non-Technical', 'Research'];

function runAiCheck(description: string, programme: string): AiCheckResult {
  const words = description.trim().split(/\s+/).filter(Boolean).length;
  const isJunior = ['jc', 'ydsp', 'integrated', 'postjc', 'poly'].some(k => programme.toLowerCase().includes(k));
  const notes: string[] = [];
  let grammar: 'pass' | 'warn' | 'fail' = 'pass';
  let level:   'pass' | 'warn' | 'fail' = 'pass';

  if (words < 20) {
    grammar = 'fail';
    notes.push(`Description is too brief (${words} words). Minimum 40 words recommended.`);
  } else if (words < 40) {
    grammar = 'warn';
    notes.push(`Description is short (${words} words). Consider adding specific tasks and expected outcomes.`);
  }
  const firstChar = description.trim()[0];
  if (firstChar && /[a-z]/.test(firstChar)) {
    if (grammar === 'pass') grammar = 'warn';
    notes.push('Description does not begin with a capital letter.');
  }

  const advancedTerms = ['stochastic', 'eigenvalue', 'cryptographic', 'electromagnetic', 'heterogeneous', 'asymptotic', 'propagation matrix', 'lagrangian'];
  const found = advancedTerms.filter(t => description.toLowerCase().includes(t));
  if (isJunior && found.length > 0) {
    level = 'warn';
    notes.push(`Advanced terminology detected (${found.slice(0, 2).join(', ')}) — may not be appropriate for ${PROGRAMMES_LABELS[programme] ?? programme} interns.`);
  }
  return { grammar, level, notes };
}

const MOCK_PROJECTS: Omit<SubmittedProject, 'id' | 'aiCheck' | 'status'>[] = [
  {
    title: 'Cybersecurity Threat Modelling',
    description: 'Interns will assist in building threat models for critical defence infrastructure. You will research known attack vectors, map them to MITRE ATT&CK, and help develop detection playbooks used by the SOC team.',
    mentor: 'Wong Kah Meng', mentorDept: 'Cyber Defence Group', mentorBio: 'Head of Cybersecurity Operations with 10 years in defence IT security.',
    skills: ['Python', 'MITRE ATT&CK', 'Network Security'], discipline: 'Computer Science / Information Security', slots: 2,
    preferredEducation: 'University', minGpa: '3.5', projectType: 'Technical', additionalRequirements: '',
  },
  {
    title: 'Predictive Maintenance using IoT Sensors',
    description: 'Working with engineers to design a predictive maintenance system for defence equipment using IoT sensor data. You will preprocess time-series data, train anomaly detection models, and build a simple dashboard to surface alerts.',
    mentor: 'Chua Jing Wen', mentorDept: 'Digital Engineering Division', mentorBio: 'Data Scientist specialising in industrial IoT and ML systems.',
    skills: ['Python', 'Pandas', 'Scikit-learn', 'IoT'], discipline: 'Data Science / Engineering', slots: 1,
    preferredEducation: 'University', minGpa: '3.0', projectType: 'Technical', additionalRequirements: '',
  },
  {
    title: 'Human-Machine Interface Research',
    description: 'Interns will evaluate and prototype user interface improvements for mission-critical command-and-control systems. The role involves user testing, UX research, and iterating on wireframe prototypes based on operator feedback.',
    mentor: 'Nur Aisyah Binte Rashid', mentorDept: 'Human Factors Lab', mentorBio: 'Senior UX Researcher with a background in human factors engineering.',
    skills: ['Figma', 'User Research', 'Usability Testing'], discipline: 'Human-Computer Interaction / Psychology', slots: 1,
    preferredEducation: 'Any', minGpa: '', projectType: 'Research', additionalRequirements: '',
  },
];

interface FormRow extends Omit<SubmittedProject, 'aiCheck' | 'status'> {
  skillsRaw: string;
}

function aiStatusLabel(result: 'pass' | 'warn' | 'fail') {
  if (result === 'pass') return 'Passed';
  if (result === 'fail') return 'Must fix';
  return 'Needs review';
}

function emptyRow(idx: number): FormRow {
  return {
    id: `new-${Date.now()}-${idx}`,
    title: '', description: '',
    mentor: '', mentorUserId: '', mentorDept: '', mentorBio: '',
    skills: [], skillsRaw: '', discipline: '', slots: 1,
    preferredEducation: 'Any', minGpa: '', projectType: 'Technical', additionalRequirements: '',
  };
}

function AiChip({ result, label }: { result: 'pass' | 'warn' | 'fail'; label: string }) {
  const cfg = {
    pass: 'bg-success-bg text-success border-success/20',
    warn: 'bg-warning-bg text-warning border-warning/20',
    fail: 'bg-danger-bg text-danger border-danger/20',
  }[result];
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-bold border', cfg)}>
      {result === 'pass' ? <CheckCircle2 size={10} /> : <AlertTriangle size={10} />}
      {label}: {aiStatusLabel(result)}
    </span>
  );
}

export default function ProjectUploadView() {
  const params  = useParams();
  const token   = typeof params?.token === 'string' ? params.token : '';

  const [request,  setRequest]  = useState<ProjectRequest | null | 'loading'>('loading');
  const [tokenReqs, setTokenReqs] = useState<ProjectRequest[]>([]);
  const [phase,    setPhase]    = useState<'idle' | 'parsing' | 'form' | 'done'>('idle');
  const [rows,     setRows]     = useState<FormRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const all: ProjectRequest[] = loadRequests();
    // All rows sharing this token = one request email (one row per intern category/period).
    const mine = all.filter(r => r.uploadToken === token);
    setTokenReqs(mine);
    setRequest(mine[0] ?? null);
  }, [token]);

  function handleFile(file: File) {
    setFileName(file.name);
    setPhase('parsing');
    setTimeout(() => {
      const populated = MOCK_PROJECTS.map((p, i) => ({ ...emptyRow(i), ...p, skillsRaw: p.skills.join(', ') }));
      setRows(populated);
      setExpanded(new Set<string>(populated.map(r => r.id)));
      setPhase('form');
    }, 1200);
  }

  function addRow() {
    const r = emptyRow(rows.length);
    setRows(prev => [...prev, r]);
    setExpanded(prev => { const n = new Set(prev); n.add(r.id); return n; });
  }

  function updateRow(id: string, patch: Partial<FormRow>) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
  }

  function removeRow(id: string) {
    setRows(prev => prev.filter(r => r.id !== id));
  }

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleSubmit() {
    const progKey = req.educationLevel;
    const projects: SubmittedProject[] = rows.map(r => ({
      id:                     r.id,
      title:                  r.title,
      description:            r.description,
      mentor:                 r.mentor,
      mentorUserId:           r.mentorUserId || undefined,
      mentorDept:             r.mentorDept,
      mentorBio:              r.mentorBio,
      skills:                 r.skillsRaw.split(',').map(s => s.trim()).filter(Boolean),
      discipline:             r.discipline,
      slots:                  r.slots,
      preferredEducation:     r.preferredEducation,
      minGpa:                 r.minGpa,
      projectType:            r.projectType,
      additionalRequirements: r.additionalRequirements,
      aiCheck:                runAiCheck(r.description, progKey),
      status:                 'pending' as const,
    }));

    const batch: ProjectSubmissionBatch = {
      id:          `batch-${Date.now()}`,
      uploadToken: token,
      pc:          req.pc,
      pcHead:      req.headName || req.pc,
      submittedBy: req.headName || req.pc,
      programme:   req.educationLevel,
      educationLevel: req.educationLevel,   // canonical link to the request's Intern Category
      placements:  req.placements,
      uploadedAt:  new Date().toISOString().split('T')[0],
      projects,
    };

    saveSubmissions([batch, ...loadSubmissions()]);

    setPhase('done');
  }

  if (request === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-subtle" data-zone="d-experience" data-mode="light">
        <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  if (request === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-subtle px-4" data-zone="d-experience" data-mode="light">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-danger-bg flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={24} className="text-danger" />
          </div>
          <h1 className="text-headline-md text-fg mb-2">Link not found</h1>
          <p className="text-body-md text-fg-muted">This upload link is invalid or has expired. Please contact the IO who sent you this link.</p>
        </div>
      </div>
    );
  }

  const req = request as import('@/lib/types').ProjectRequest;

  if (phase === 'done') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-subtle px-4" data-zone="d-experience" data-mode="light">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-success-bg flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={24} className="text-success" />
          </div>
          <h1 className="text-headline-md text-fg mb-2">Projects submitted</h1>
          <p className="text-body-md text-fg-muted mb-1">
            {rows.length} project{rows.length !== 1 ? 's' : ''} submitted for <strong>{PROGRAMMES_LABELS[req.educationLevel] ?? req.educationLevel}</strong>.
          </p>
          <p className="text-body-sm text-fg-subtle">The IO will review your submissions and be in touch. You may close this page.</p>
        </div>
      </div>
    );
  }

  return (
    <KineticBounce fullBleed>
    <div className="min-h-screen bg-bg-subtle" data-zone="d-experience" data-mode="light">
      {/* Top bar */}
      <div className="bg-surface border-b border-border px-4 md:px-8 py-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shrink-0">
          <span className="text-white text-[13px] font-black">DSTA</span>
        </div>
        <div>
          <p className="text-body-sm font-semibold text-fg leading-tight">Project Submission Portal</p>
          <p className="text-[13px] text-fg-muted">Talent Outreach &amp; Acquisition</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 md:px-8 py-8">

        {/* Request summary card */}
        <div className="bg-surface border border-border rounded-2xl p-5 mb-6 shadow-sm">
          <p className="text-[12px] font-black text-fg-subtle uppercase tracking-widest mb-3">Your Assignment</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-[12px] text-fg-muted uppercase tracking-wider mb-0.5">Programme</p>
              <p className="text-body-sm font-semibold text-fg">{PROGRAMMES_LABELS[req.educationLevel] ?? req.educationLevel}</p>
            </div>
            <div>
              <p className="text-[12px] text-fg-muted uppercase tracking-wider mb-0.5">Placements Needed</p>
              <p className="text-body-sm font-semibold text-fg">{req.placements}</p>
            </div>
            <div>
              <p className="text-[12px] text-fg-muted uppercase tracking-wider mb-0.5">Deadline</p>
              <p className="text-body-sm font-semibold text-fg">{req.deadline || '—'}</p>
            </div>
          </div>
        </div>

        {/* Upload flow */}
        {phase === 'idle' && (
          <>
            {/* Step 1: Download template */}
            <div className="bg-surface border border-border rounded-2xl p-5 mb-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-body-sm font-semibold text-fg mb-1">Step 1 — Download the project template</p>
                  <p className="text-body-sm text-fg-muted mb-3">
                    Fill in the Excel template with your project details. Each row is one project.
                    The template includes all required fields and matching criteria used by the system.
                  </p>
                  <div className="flex flex-wrap gap-1.5 mb-1">
                    {PROJECT_SUBMISSION_COLUMNS.map(col => (
                      <span
                        key={col.name}
                        className={col.usedForMatching
                          ? 'px-2 py-0.5 bg-accent/8 border border-accent/20 rounded text-[12px] text-accent font-medium'
                          : 'px-2 py-0.5 bg-bg-subtle border border-border rounded text-[12px] text-fg-muted font-medium'}
                      >{col.name}</span>
                    ))}
                  </div>
                  <p className="text-[13px] text-fg-subtle mt-1.5">
                    <span className="inline-block w-2 h-2 rounded-sm bg-accent/30 mr-1 align-middle" />
                    Highlighted fields are used for intern matching
                  </p>
                </div>
                <button
                  onClick={() => downloadRequestTemplateXLSX(tokenReqs)}
                  className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-accent text-white rounded-xl text-body-sm font-semibold hover:bg-accent/90 transition-colors shadow-sm whitespace-nowrap"
                >
                  <Download size={15} />Download Template
                </button>
              </div>
            </div>

            {/* Step 2: Upload */}
            <p className="text-body-sm font-semibold text-fg mb-2">Step 2 — Upload your completed file</p>
            <div
              className="bg-surface border-2 border-dashed border-border rounded-2xl p-10 flex flex-col items-center gap-3 cursor-pointer hover:border-accent hover:bg-accent/5 transition-all mb-4"
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            >
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <FileSpreadsheet size={22} className="text-accent" />
              </div>
              <div className="text-center">
                <p className="text-body-md font-semibold text-fg mb-1">Upload your completed template</p>
                <p className="text-body-sm text-fg-muted">Drag and drop your Excel file here, or click to browse</p>
                <p className="text-[13px] text-fg-subtle mt-1">Accepted format: Excel (.xlsx)</p>
              </div>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[13px] text-fg-subtle">or enter projects manually</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <button
              onClick={() => { setRows([emptyRow(0)]); setExpanded(new Set([`new-${Date.now()}-0`])); setPhase('form'); }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-border rounded-xl text-body-sm text-fg-muted hover:bg-bg-subtle hover:text-fg transition-colors"
            >
              <Plus size={15} />Add projects manually
            </button>
          </>
        )}

        {phase === 'parsing' && (
          <div className="bg-surface border border-border rounded-2xl p-10 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center animate-pulse">
              <FileSpreadsheet size={22} className="text-accent" />
            </div>
            <p className="text-body-md font-semibold text-fg">Parsing {fileName}…</p>
            <p className="text-body-sm text-fg-muted">Extracting project data from your spreadsheet</p>
          </div>
        )}

        {phase === 'form' && (
          <>
            <div className="flex items-center justify-between mb-3">
              <p className="text-body-sm font-semibold text-fg">
                {rows.length} project{rows.length !== 1 ? 's' : ''} {fileName ? 'extracted from file' : 'added'}
              </p>
              <button onClick={addRow} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-body-sm text-fg hover:bg-bg-subtle transition-colors">
                <Plus size={13} />Add another
              </button>
            </div>

            <div className="space-y-3 mb-6">
              {rows.map((row, idx) => {
                const isOpen = expanded.has(row.id);
                return (
                  <div key={row.id} className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
                    <button
                      type="button"
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-bg-subtle transition-colors text-left"
                      onClick={() => toggleExpand(row.id)}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                          <span className="text-accent text-[12px] font-black">{idx + 1}</span>
                        </div>
                        <div>
                          <p className="text-body-sm font-semibold text-fg leading-tight">{row.title || 'Untitled Project'}</p>
                          {row.mentor && (
                            <p className="text-[13px] text-fg-muted">
                              {row.mentor}{row.mentorDept ? ` · ${row.mentorDept}` : ''}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); removeRow(row.id); }}
                          className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-danger-bg hover:text-danger text-fg-muted transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                        {isOpen ? <ChevronUp size={14} className="text-fg-muted" /> : <ChevronDown size={14} className="text-fg-muted" />}
                      </div>
                    </button>

                    {isOpen && (
                      <div className="border-t border-border px-4 py-4 space-y-5">

                        {/* Project details */}
                        <div>
                          <p className="text-[12px] font-black text-fg-subtle uppercase tracking-widest mb-3">Project Details</p>
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[12px] font-bold text-fg-subtle uppercase tracking-wider mb-1">Project Title *</label>
                                <input value={row.title} onChange={e => updateRow(row.id, { title: e.target.value })} placeholder="e.g. Cybersecurity Threat Analysis" className="w-full border border-border rounded-lg px-3 py-2 text-body-sm bg-surface outline-none focus:border-accent focus:ring-1 focus:ring-accent/20" />
                              </div>
                              <div>
                                <label className="block text-[12px] font-bold text-fg-subtle uppercase tracking-wider mb-1">Discipline</label>
                                <Combobox
                                  selected={parseDisciplines(row.discipline)}
                                  onToggle={opt => setRows(prev => prev.map(r => r.id === row.id ? { ...r, discipline: toggleDiscipline(r.discipline, opt) } : r))}
                                  options={DISCIPLINE_OPTIONS}
                                  placeholder="Select disciplines…"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-[12px] font-bold text-fg-subtle uppercase tracking-wider mb-1">Project Description *</label>
                              <textarea value={row.description} onChange={e => updateRow(row.id, { description: e.target.value })} rows={3} placeholder="Describe what the intern will do, tools they will use, and expected deliverables…" className="w-full border border-border rounded-lg px-3 py-2 text-body-sm bg-surface outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 resize-none" />
                            </div>
                            <div>
                              <label className="block text-[12px] font-bold text-fg-subtle uppercase tracking-wider mb-1">Required Skills</label>
                              <input value={row.skillsRaw} onChange={e => updateRow(row.id, { skillsRaw: e.target.value })} placeholder="e.g. Python, Machine Learning, MATLAB (comma-separated)" className="w-full border border-border rounded-lg px-3 py-2 text-body-sm bg-surface outline-none focus:border-accent focus:ring-1 focus:ring-accent/20" />
                              {parseSkills(row.skillsRaw).length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {parseSkills(row.skillsRaw).map(s => (
                                    <span key={s} className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent/10 text-accent rounded text-[13px] font-medium max-w-[200px]">
                                      <span className="truncate">{s}</span>
                                      <button type="button" onClick={() => setRows(prev => prev.map(r => r.id === row.id ? { ...r, skillsRaw: removeSkill(r.skillsRaw, s) } : r))} className="hover:text-danger transition-colors shrink-0"><X size={10} /></button>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Mentor */}
                        <div>
                          <p className="text-[12px] font-black text-fg-subtle uppercase tracking-widest mb-3">Mentor</p>
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[12px] font-bold text-fg-subtle uppercase tracking-wider mb-1">Mentor Name *</label>
                                <input value={row.mentor} onChange={e => updateRow(row.id, { mentor: e.target.value })} placeholder="e.g. Dr James Tan" className="w-full border border-border rounded-lg px-3 py-2 text-body-sm bg-surface outline-none focus:border-accent focus:ring-1 focus:ring-accent/20" />
                              </div>
                              <div>
                                <label className="block text-[12px] font-bold text-fg-subtle uppercase tracking-wider mb-1">Main Mentor Email *</label>
                                <input value={row.mentorUserId ?? ''} onChange={e => updateRow(row.id, { mentorUserId: e.target.value })} placeholder="e.g. james_tan@dsta.gov.sg" className="w-full border border-border rounded-lg px-3 py-2 text-body-sm bg-surface outline-none focus:border-accent focus:ring-1 focus:ring-accent/20" />
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[12px] font-bold text-fg-subtle uppercase tracking-wider mb-1">Department</label>
                                <input value={row.mentorDept} onChange={e => updateRow(row.id, { mentorDept: e.target.value })} placeholder="e.g. Cyber Defence Group" className="w-full border border-border rounded-lg px-3 py-2 text-body-sm bg-surface outline-none focus:border-accent focus:ring-1 focus:ring-accent/20" />
                              </div>
                              <div>
                                <label className="block text-[12px] font-bold text-fg-subtle uppercase tracking-wider mb-1">Mentor Background</label>
                                <input value={row.mentorBio} onChange={e => updateRow(row.id, { mentorBio: e.target.value })} placeholder="Brief background of the mentor…" className="w-full border border-border rounded-lg px-3 py-2 text-body-sm bg-surface outline-none focus:border-accent focus:ring-1 focus:ring-accent/20" />
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[12px] font-bold text-fg-subtle uppercase tracking-wider mb-1">Number of Placements *</label>
                                <input type="number" min={1} max={10} value={row.slots} onChange={e => updateRow(row.id, { slots: parseInt(e.target.value) || 1 })} className="w-full border border-border rounded-lg px-3 py-2 text-body-sm bg-surface outline-none focus:border-accent focus:ring-1 focus:ring-accent/20" />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Intern matching criteria */}
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <p className="text-[12px] font-black text-fg-subtle uppercase tracking-widest">Intern Matching Criteria</p>
                            <span className="px-1.5 py-0.5 bg-accent/10 text-accent text-[12px] font-bold rounded uppercase tracking-wide">Used for AI Matching</span>
                          </div>
                          <div className="bg-bg-subtle/60 rounded-xl p-3 space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-[12px] font-bold text-fg-subtle uppercase tracking-wider mb-1">Preferred Education</label>
                                <select value={row.preferredEducation} onChange={e => updateRow(row.id, { preferredEducation: e.target.value })} className="w-full border border-border rounded-lg px-3 py-2 text-body-sm bg-surface outline-none focus:border-accent" style={{ backgroundImage: 'none' }}>
                                  {EDUCATION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className="block text-[12px] font-bold text-fg-subtle uppercase tracking-wider mb-1">Min GPA</label>
                                <input type="text" value={row.minGpa} onChange={e => updateRow(row.id, { minGpa: e.target.value })} placeholder="e.g. 3.5" className="w-full border border-border rounded-lg px-3 py-2 text-body-sm bg-surface outline-none focus:border-accent focus:ring-1 focus:ring-accent/20" />
                              </div>
                              <div>
                                <label className="block text-[12px] font-bold text-fg-subtle uppercase tracking-wider mb-1">Project Type</label>
                                <select value={row.projectType} onChange={e => updateRow(row.id, { projectType: e.target.value })} className="w-full border border-border rounded-lg px-3 py-2 text-body-sm bg-surface outline-none focus:border-accent" style={{ backgroundImage: 'none' }}>
                                  {PROJECT_TYPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                              </div>
                            </div>
                            <div>
                              <label className="block text-[12px] font-bold text-fg-subtle uppercase tracking-wider mb-1">Additional Requirements</label>
                              <input value={row.additionalRequirements} onChange={e => updateRow(row.id, { additionalRequirements: e.target.value })} placeholder="e.g. Singapore Citizen only, must have completed Year 2…" className="w-full border border-border rounded-lg px-3 py-2 text-body-sm bg-surface outline-none focus:border-accent focus:ring-1 focus:ring-accent/20" />
                            </div>
                          </div>
                        </div>

                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleSubmit}
              disabled={rows.length === 0 || rows.every(r => !r.title)}
              className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-accent text-white rounded-xl font-semibold text-body-md transition-all hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            >
              <Upload size={16} />
              Submit {rows.length} Project{rows.length !== 1 ? 's' : ''}
            </button>
          </>
        )}
      </div>
    </div>
    </KineticBounce>
  );
}
