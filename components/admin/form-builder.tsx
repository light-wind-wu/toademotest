'use client';

/* Form builder — compose a new application form (sections + fields) and see a
   live preview of exactly what an applicant would fill in. Mirrors the field
   model used by data/app-form-templates.json (textbox / number / dropdown /
   radio / checkbox / calendar / upload). Nothing is persisted — this is a
   working mockup of the drag-and-drop builder slated for a later phase. */

import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import Button from '@/components/ui-legacy/button';
import {
  Wand2, Plus, Trash2, ChevronUp, ChevronDown, Pencil, X, Check,
  Type, Hash, ChevronDownCircle, CircleDot, CheckSquare, Calendar, Upload,
  Eye, Asterisk, ShieldCheck, GripVertical,
} from 'lucide-react';

/* ── Field model ───────────────────────────────────────────────────────── */
type FieldType = 'textbox' | 'number' | 'dropdown' | 'radio' | 'checkbox' | 'calendar' | 'upload';

interface BuilderField {
  id:        string;
  label:     string;
  type:      FieldType;
  required:  boolean;        // applicant must answer
  myInfo:    boolean;        // prefilled from Singpass MyInfo
  remarks?:  string;         // helper text under the field
  options:   string[];       // dropdown / radio / checkbox choices
}

interface BuilderSection {
  id:     string;
  title:  string;
  fields: BuilderField[];
}

const FIELD_TYPES: { type: FieldType; label: string; icon: typeof Type; hasOptions: boolean }[] = [
  { type: 'textbox',  label: 'Text',          icon: Type,              hasOptions: false },
  { type: 'number',   label: 'Number',        icon: Hash,              hasOptions: false },
  { type: 'dropdown', label: 'Dropdown',      icon: ChevronDownCircle, hasOptions: true  },
  { type: 'radio',    label: 'Single choice', icon: CircleDot,         hasOptions: true  },
  { type: 'checkbox', label: 'Multi choice',  icon: CheckSquare,       hasOptions: true  },
  { type: 'calendar', label: 'Date',          icon: Calendar,          hasOptions: false },
  { type: 'upload',   label: 'File upload',   icon: Upload,            hasOptions: false },
];

const typeMeta = (t: FieldType) => FIELD_TYPES.find(f => f.type === t)!;

/* ── Seed: a starter form referencing the existing templates ───────────── */
const STARTER: BuilderSection[] = [
  {
    id: 's1', title: 'Personal Particulars', fields: [
      { id: 'f1', label: 'Full Name',     type: 'textbox',  required: true,  myInfo: true,  options: [] },
      { id: 'f2', label: 'NRIC / FIN',     type: 'textbox',  required: true,  myInfo: true,  options: [] },
      { id: 'f3', label: 'Date of Birth',  type: 'calendar', required: true,  myInfo: true,  options: [] },
      { id: 'f4', label: 'Sex',            type: 'radio',    required: true,  myInfo: true,  options: ['Male', 'Female'] },
      { id: 'f5', label: 'Email',          type: 'textbox',  required: true,  myInfo: false, options: [], remarks: 'We use this to send your application updates.' },
    ],
  },
  {
    id: 's2', title: 'Programme Interest', fields: [
      { id: 'f6', label: 'Programme applying for', type: 'dropdown', required: true, myInfo: false, options: ['Undergraduate Internship', 'IP', 'Tech UP', 'Polytechnic Internship'] },
      { id: 'f7', label: 'Areas of interest',      type: 'checkbox', required: false, myInfo: false, options: ['Cybersecurity', 'Artificial Intelligence & Data', 'Robotics & Autonomous Systems', 'Sensors & Guided Weapons'] },
      { id: 'f8', label: 'Resume',                 type: 'upload',   required: true,  myInfo: false, options: [], remarks: 'PDF, max 5 MB.' },
    ],
  },
];

export default function FormBuilder() {
  const [formName, setFormName] = useState('New Application Form');
  const [formDesc, setFormDesc] = useState('Draft application form. Build sections and fields on the left; the preview shows what applicants see.');
  const [sections, setSections] = useState<BuilderSection[]>(STARTER);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'build' | 'preview'>('build');

  const counter = useRef(100);
  const uid = (p: string) => `${p}${counter.current++}`;

  /* ── Section ops ─────────────────────────────────────────────────────── */
  function addSection() {
    setSections(s => [...s, { id: uid('s'), title: 'New Section', fields: [] }]);
  }
  function removeSection(sid: string) {
    setSections(s => s.filter(sec => sec.id !== sid));
  }
  function renameSection(sid: string, title: string) {
    setSections(s => s.map(sec => sec.id === sid ? { ...sec, title } : sec));
  }
  function moveSection(sid: string, dir: -1 | 1) {
    setSections(s => {
      const i = s.findIndex(sec => sec.id === sid);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= s.length) return s;
      const next = [...s];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  /* ── Field ops ───────────────────────────────────────────────────────── */
  function addField(sid: string) {
    const id = uid('f');
    setSections(s => s.map(sec => sec.id === sid
      ? { ...sec, fields: [...sec.fields, { id, label: 'Untitled field', type: 'textbox', required: false, myInfo: false, options: [] }] }
      : sec));
    setEditingId(id);
  }
  function updateField(sid: string, fid: string, patch: Partial<BuilderField>) {
    setSections(s => s.map(sec => sec.id === sid
      ? { ...sec, fields: sec.fields.map(f => f.id === fid ? { ...f, ...patch } : f) }
      : sec));
  }
  function removeField(sid: string, fid: string) {
    setSections(s => s.map(sec => sec.id === sid
      ? { ...sec, fields: sec.fields.filter(f => f.id !== fid) }
      : sec));
  }
  function moveField(sid: string, fid: string, dir: -1 | 1) {
    setSections(s => s.map(sec => {
      if (sec.id !== sid) return sec;
      const i = sec.fields.findIndex(f => f.id === fid);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= sec.fields.length) return sec;
      const fields = [...sec.fields];
      [fields[i], fields[j]] = [fields[j], fields[i]];
      return { ...sec, fields };
    }));
  }

  const fieldCount = sections.reduce((n, s) => n + s.fields.length, 0);

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <span className="grid place-items-center w-8 h-8 rounded-lg bg-accent/10 text-accent shrink-0"><Wand2 size={16} /></span>
          <div>
            <h2 className="text-headline-md text-fg">Form builder</h2>
            <p className="text-body-sm text-fg-muted">Compose a new application form and preview it live. {sections.length} section{sections.length === 1 ? '' : 's'} · {fieldCount} field{fieldCount === 1 ? '' : 's'}.</p>
          </div>
        </div>
        {/* Mobile view toggle */}
        <div className="xl:hidden flex items-center border border-border rounded-lg overflow-hidden shrink-0">
          {(['build', 'preview'] as const).map(v => (
            <button key={v} onClick={() => setMobileView(v)}
              className={cn('px-3 py-1.5 text-body-sm font-semibold capitalize transition-colors', mobileView === v ? 'bg-accent text-accent-fg' : 'bg-surface text-fg-muted hover:bg-bg-subtle')}>
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,440px)] gap-5 items-start">

        {/* ── Builder column ──────────────────────────────────────────── */}
        <div className={cn('space-y-4 min-w-0', mobileView === 'preview' && 'hidden xl:block')}>
          {/* Form meta */}
          <div className="card p-4 space-y-3">
            <div>
              <label className="text-label-sm text-fg-muted block mb-1">Form name</label>
              <input value={formName} onChange={e => setFormName(e.target.value)}
                className="w-full px-3 py-2 text-body-md font-semibold border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30" />
            </div>
            <div>
              <label className="text-label-sm text-fg-muted block mb-1">Description</label>
              <textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} rows={2}
                className="w-full px-3 py-2 text-body-sm border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none" />
            </div>
          </div>

          {/* Sections */}
          {sections.map((sec, si) => (
            <div key={sec.id} className="card p-4">
              {/* Section header */}
              <div className="flex items-center gap-2 mb-3">
                <GripVertical size={15} className="text-fg-subtle shrink-0" />
                <input value={sec.title} onChange={e => renameSection(sec.id, e.target.value)}
                  className="flex-1 min-w-0 px-2 py-1 text-headline-sm font-bold text-fg bg-transparent rounded hover:bg-bg-subtle focus:bg-bg-subtle focus:outline-none focus:ring-2 focus:ring-accent/30" />
                <div className="flex items-center gap-0.5 shrink-0">
                  <button onClick={() => moveSection(sec.id, -1)} disabled={si === 0} title="Move up"
                    className="p-1.5 rounded text-fg-muted hover:bg-bg-subtle disabled:opacity-30 disabled:hover:bg-transparent"><ChevronUp size={14} /></button>
                  <button onClick={() => moveSection(sec.id, 1)} disabled={si === sections.length - 1} title="Move down"
                    className="p-1.5 rounded text-fg-muted hover:bg-bg-subtle disabled:opacity-30 disabled:hover:bg-transparent"><ChevronDown size={14} /></button>
                  <button onClick={() => removeSection(sec.id)} title="Delete section"
                    className="p-1.5 rounded text-fg-muted hover:text-danger hover:bg-danger-bg"><Trash2 size={14} /></button>
                </div>
              </div>

              {/* Fields */}
              <div className="space-y-2">
                {sec.fields.length === 0 && (
                  <p className="text-body-sm text-fg-subtle px-2 py-3 text-center border border-dashed border-border rounded-lg">No fields yet.</p>
                )}
                {sec.fields.map((f, fi) => {
                  const meta = typeMeta(f.type);
                  const FIcon = meta.icon;
                  const editing = editingId === f.id;
                  return (
                    <div key={f.id} className={cn('rounded-xl border transition-colors', editing ? 'border-accent/50 bg-accent/[0.03]' : 'border-border')}>
                      {/* Collapsed row */}
                      <div className="flex items-center gap-2.5 px-3 py-2.5">
                        <span className="grid place-items-center w-7 h-7 rounded-lg bg-bg-subtle text-fg-muted shrink-0"><FIcon size={14} /></span>
                        <div className="min-w-0 flex-1">
                          <p className="text-body-sm font-semibold text-fg truncate flex items-center gap-1.5">
                            {f.label || 'Untitled field'}
                            {f.required && <Asterisk size={11} className="text-danger shrink-0" />}
                          </p>
                          <p className="text-[12px] text-fg-subtle">{meta.label}{f.myInfo && ' · MyInfo'}</p>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button onClick={() => moveField(sec.id, f.id, -1)} disabled={fi === 0} title="Move up"
                            className="p-1.5 rounded text-fg-muted hover:bg-bg-subtle disabled:opacity-30 disabled:hover:bg-transparent"><ChevronUp size={13} /></button>
                          <button onClick={() => moveField(sec.id, f.id, 1)} disabled={fi === sec.fields.length - 1} title="Move down"
                            className="p-1.5 rounded text-fg-muted hover:bg-bg-subtle disabled:opacity-30 disabled:hover:bg-transparent"><ChevronDown size={13} /></button>
                          <button onClick={() => setEditingId(editing ? null : f.id)} title={editing ? 'Done' : 'Edit field'}
                            className={cn('p-1.5 rounded hover:bg-bg-subtle', editing ? 'text-accent' : 'text-fg-muted')}>{editing ? <Check size={13} /> : <Pencil size={13} />}</button>
                          <button onClick={() => removeField(sec.id, f.id)} title="Delete field"
                            className="p-1.5 rounded text-fg-muted hover:text-danger hover:bg-danger-bg"><Trash2 size={13} /></button>
                        </div>
                      </div>

                      {/* Editor */}
                      {editing && (
                        <div className="px-3 pb-3 pt-1 border-t border-border space-y-3">
                          <div>
                            <label className="text-label-sm text-fg-muted block mb-1">Label</label>
                            <input value={f.label} onChange={e => updateField(sec.id, f.id, { label: e.target.value })}
                              className="w-full px-3 py-1.5 text-body-sm border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30" />
                          </div>

                          {/* Type picker */}
                          <div>
                            <label className="text-label-sm text-fg-muted block mb-1">Field type</label>
                            <div className="flex flex-wrap gap-1.5">
                              {FIELD_TYPES.map(t => {
                                const TIcon = t.icon;
                                const on = f.type === t.type;
                                return (
                                  <button key={t.type} onClick={() => updateField(sec.id, f.id, { type: t.type, options: t.hasOptions && f.options.length === 0 ? ['Option 1', 'Option 2'] : f.options })}
                                    className={cn('inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[13px] font-medium transition-colors',
                                      on ? 'border-accent bg-accent/10 text-accent' : 'border-border text-fg-muted hover:bg-bg-subtle')}>
                                    <TIcon size={13} />{t.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Options editor */}
                          {meta.hasOptions && (
                            <div>
                              <label className="text-label-sm text-fg-muted block mb-1">Options</label>
                              <div className="space-y-1.5">
                                {f.options.map((opt, oi) => (
                                  <div key={oi} className="flex items-center gap-2">
                                    <input value={opt}
                                      onChange={e => updateField(sec.id, f.id, { options: f.options.map((o, k) => k === oi ? e.target.value : o) })}
                                      className="flex-1 px-3 py-1.5 text-body-sm border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30" />
                                    <button onClick={() => updateField(sec.id, f.id, { options: f.options.filter((_, k) => k !== oi) })}
                                      className="p-1.5 rounded text-fg-muted hover:text-danger hover:bg-danger-bg shrink-0"><X size={14} /></button>
                                  </div>
                                ))}
                                <button onClick={() => updateField(sec.id, f.id, { options: [...f.options, `Option ${f.options.length + 1}`] })}
                                  className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-accent hover:underline"><Plus size={13} />Add option</button>
                              </div>
                            </div>
                          )}

                          {/* Remarks */}
                          <div>
                            <label className="text-label-sm text-fg-muted block mb-1">Helper text <span className="text-fg-subtle font-normal">(optional)</span></label>
                            <input value={f.remarks ?? ''} onChange={e => updateField(sec.id, f.id, { remarks: e.target.value })}
                              placeholder="Shown in small text under the field"
                              className="w-full px-3 py-1.5 text-body-sm border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30" />
                          </div>

                          {/* Toggles */}
                          <div className="flex flex-wrap gap-4 pt-0.5">
                            <label className="inline-flex items-center gap-2 cursor-pointer text-body-sm text-fg">
                              <input type="checkbox" checked={f.required} onChange={e => updateField(sec.id, f.id, { required: e.target.checked })}
                                className="w-4 h-4 rounded border-border text-accent focus:ring-accent/30" />
                              Required
                            </label>
                            <label className="inline-flex items-center gap-2 cursor-pointer text-body-sm text-fg">
                              <input type="checkbox" checked={f.myInfo} onChange={e => updateField(sec.id, f.id, { myInfo: e.target.checked })}
                                className="w-4 h-4 rounded border-border text-accent focus:ring-accent/30" />
                              Prefill from MyInfo
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <button onClick={() => addField(sec.id)}
                className="mt-2.5 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-border text-body-sm font-semibold text-fg-muted hover:text-accent hover:border-accent transition-colors">
                <Plus size={14} />Add field
              </button>
            </div>
          ))}

          <Button variant="outline" onClick={addSection} className="w-full"><Plus size={15} />Add section</Button>
        </div>

        {/* ── Live preview column ─────────────────────────────────────── */}
        <div className={cn('xl:sticky xl:top-[80px]', mobileView === 'build' && 'hidden xl:block')}>
          <div className="flex items-center gap-2 mb-2 px-1">
            <Eye size={14} className="text-fg-subtle" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-fg-subtle">Live preview</span>
          </div>
          <div className="card p-6 max-h-[calc(100vh-140px)] overflow-y-auto">
            <FormPreview name={formName} desc={formDesc} sections={sections} />
          </div>
        </div>

      </div>
    </div>
  );
}

/* ── Preview: renders the form as an applicant sees it ─────────────────── */
function FormPreview({ name, desc, sections }: { name: string; desc: string; sections: BuilderSection[] }) {
  const empty = sections.every(s => s.fields.length === 0);
  return (
    <div>
      <h1 className="text-headline-lg font-bold text-fg">{name || 'Untitled form'}</h1>
      {desc && <p className="text-body-sm text-fg-muted mt-1 mb-5">{desc}</p>}

      {empty && <p className="text-body-sm text-fg-subtle py-6 text-center">Add a field to see the preview.</p>}

      <div className="space-y-7">
        {sections.filter(s => s.fields.length > 0).map(sec => (
          <section key={sec.id}>
            <h2 className="text-headline-sm font-bold text-fg pb-1.5 mb-4 border-b border-border">{sec.title}</h2>
            <div className="space-y-4">
              {sec.fields.map(f => <PreviewField key={f.id} field={f} />)}
            </div>
          </section>
        ))}
      </div>

      {!empty && (
        <button type="button" disabled
          className="mt-7 w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-accent text-accent-fg font-semibold opacity-90 cursor-default">
          Submit application
        </button>
      )}
    </div>
  );
}

function PreviewField({ field: f }: { field: BuilderField }) {
  const inputCls = 'w-full px-3 py-2 text-body-sm border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30';
  return (
    <div>
      <label className="flex items-center gap-1.5 text-body-sm font-semibold text-fg mb-1.5">
        {f.label || 'Untitled field'}
        {f.required && <span className="text-danger">*</span>}
        {f.myInfo && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent bg-accent/10 border border-accent/20 px-1.5 py-0.5 rounded">
            <ShieldCheck size={10} />MyInfo
          </span>
        )}
      </label>

      {f.type === 'textbox'  && <input type="text" placeholder="Your answer" className={inputCls} />}
      {f.type === 'number'   && <input type="number" placeholder="0" className={inputCls} />}
      {f.type === 'calendar' && <input type="date" className={inputCls} />}

      {f.type === 'dropdown' && (
        <select className={cn(inputCls, 'cursor-pointer')} defaultValue="">
          <option value="" disabled>Select an option…</option>
          {f.options.map((o, i) => <option key={i} value={o}>{o}</option>)}
        </select>
      )}

      {f.type === 'radio' && (
        <div className="space-y-1.5">
          {f.options.map((o, i) => (
            <label key={i} className="flex items-center gap-2 text-body-sm text-fg cursor-pointer">
              <input type="radio" name={f.id} className="w-4 h-4 border-border text-accent focus:ring-accent/30" />{o}
            </label>
          ))}
        </div>
      )}

      {f.type === 'checkbox' && (
        <div className="space-y-1.5">
          {f.options.map((o, i) => (
            <label key={i} className="flex items-center gap-2 text-body-sm text-fg cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded border-border text-accent focus:ring-accent/30" />{o}
            </label>
          ))}
        </div>
      )}

      {f.type === 'upload' && (
        <div className="flex items-center gap-2 px-3 py-2 border border-dashed border-border rounded-lg text-body-sm text-fg-muted">
          <Upload size={15} className="text-fg-subtle" />Choose file…
        </div>
      )}

      {f.remarks && <p className="text-[12px] text-fg-subtle mt-1">{f.remarks}</p>}
    </div>
  );
}
