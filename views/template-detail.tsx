'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Shell from '@/components/layout/shell';
import {
  ChevronLeft, ChevronRight, Shield, Plus, X, Eye,
  Pencil, Trash2, Check, Info, Calendar, Upload,
  ChevronDown, Maximize2, Columns2,
  Lock, Settings2, GripVertical,
} from 'lucide-react';
import {
  DndContext, DragOverlay, closestCenter,
  useSensor, useSensors, PointerSensor, KeyboardSensor,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, rectSortingStrategy,
  useSortable, arrayMove, sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Modal from '@/components/ui-legacy/modal';
import Button from '@/components/ui-legacy/button';
import { Toast, useToast } from '@/components/ui-legacy/toast';
import type { AppFormTemplate, FormField, FormFieldType, FormSection } from '@/lib/types';
import { TECH_DOMAINS } from '@/lib/data';
import { useRole } from '@/lib/role';
import { useUnsavedChanges } from '@/lib/unsaved-changes';
import appFormSeed from '@/data/app-form-templates.json';

/* ─── constants ──────────────────────────────────────────────────────────── */

const AFT_KEY      = 'dsta_app_form_templates';
const AFT_SEED_VER = '23';
const AFT_VER_KEY  = 'dsta_app_form_templates_seed_v';

const CANONICAL_ORDER = ['Personal Particulars', 'Academic Information', 'Programme Preferences'];


const FIELD_TYPES: { value: FormFieldType; label: string }[] = [
  { value: 'textbox',  label: 'Short Text'    },
  { value: 'dropdown', label: 'Dropdown'      },
  { value: 'radio',    label: 'Single Choice' },
  { value: 'checkbox', label: 'Multi-Select'  },
  { value: 'calendar', label: 'Date Picker'   },
  { value: 'upload',   label: 'File Upload'   },
];

const AOI_OPTIONS = [
  'Advanced Systems', 'Air Systems', 'Artificial Intelligence', 'Building & Infrastructure',
  'Cloud', 'Command & Control Systems', 'Cybersecurity', 'Data Science/Data Analytics',
  'Infosecurity', 'Land Systems', 'Naval Systems', 'Networks & Infrastructure',
  'Simulation & Training Systems', 'Software Development', 'UI/UX', 'Others',
];

type LibField = {
  id: string; group: string; section: FormSection; label: string;
  type: FormFieldType; mandatory: boolean;
  options?: string[]; maxChars?: number;
};

const FIELD_CATALOG: LibField[] = [
  { id: 'name',               group: 'Identity',        section: 'Personal Particulars', label: 'Full Name',                     type: 'textbox',  mandatory: true,  maxChars: 255 },
  { id: 'nric',               group: 'Identity',        section: 'Personal Particulars', label: 'NRIC',                          type: 'textbox',  mandatory: true   },
  { id: 'photo',              group: 'Identity',        section: 'Personal Particulars', label: 'Photo',                         type: 'upload',   mandatory: false  },
  { id: 'nationality',        group: 'Identity',        section: 'Personal Particulars', label: 'Nationality',                   type: 'dropdown', mandatory: true   },
  { id: 'country_of_birth',   group: 'Identity',        section: 'Personal Particulars', label: 'Country of Birth',              type: 'dropdown', mandatory: true   },
  { id: 'date_of_birth',      group: 'Identity',        section: 'Personal Particulars', label: 'Date of Birth',                 type: 'calendar', mandatory: true   },
  { id: 'sex',                group: 'Identity',        section: 'Personal Particulars', label: 'Sex',                           type: 'radio',    mandatory: true,  options: ['Male', 'Female'] },
  { id: 'mobile',             group: 'Contact',         section: 'Personal Particulars', label: 'Mobile',                        type: 'textbox',  mandatory: true   },
  { id: 'email',              group: 'Contact',         section: 'Personal Particulars', label: 'Email',                         type: 'textbox',  mandatory: true   },
  { id: 'internship_category',group: 'Internship',      section: 'Personal Particulars', label: 'Education Level',           type: 'dropdown', mandatory: true   },
  { id: 'preferred_start_date',group:'Internship',      section: 'Personal Particulars', label: 'Preferred Start Date',          type: 'calendar', mandatory: true   },
  { id: 'preferred_end_date', group: 'Internship',      section: 'Personal Particulars', label: 'Preferred End Date',            type: 'calendar', mandatory: true   },
  { id: 'name_of_institution',group: 'Academic',        section: 'Academic Information', label: 'Name of Institution',           type: 'textbox',  mandatory: true   },
  { id: 'year_of_study',      group: 'Academic',        section: 'Academic Information', label: 'Year of Study',                 type: 'dropdown', mandatory: true,  options: ['N/A','Year 1','Year 2','Year 3','Year 4','Year 5','Year 6','JC1','JC2'] },
  { id: 'expected_graduation',group: 'Academic',        section: 'Academic Information', label: 'Expected Graduation',           type: 'calendar', mandatory: true   },
  { id: 'course_of_study',    group: 'Academic',        section: 'Academic Information', label: 'Course of Study',               type: 'textbox',  mandatory: true   },
  { id: 'gpa_cap_rank_points',group: 'Academic',        section: 'Academic Information', label: 'GPA / CAP / Rank Points',       type: 'textbox',  mandatory: true   },
  { id: 'bonded_scholarship',        group: 'Scholarship',      section: 'Programme Preferences', label: 'Bonded Scholarship Recipient?',    type: 'radio',    mandatory: true,  options: ['Yes','No'] },
  { id: 'scholarship_name',          group: 'Scholarship',      section: 'Programme Preferences', label: 'Name of Scholarship',              type: 'textbox',  mandatory: false },
  { id: 'dsta_scholarship_interest', group: 'Scholarship',      section: 'Programme Preferences', label: 'Interested in DSTA Scholarships?', type: 'radio',    mandatory: true,  options: ['Yes','No'] },
  { id: 'tech_domain',         group: 'Tech Domain',      section: 'Additional Information', label: 'Tech Domain',               type: 'checkbox', mandatory: false, options: TECH_DOMAINS },
  { id: 'achievements',        group: 'Academic',         section: 'Academic Information', label: 'Achievements & Activities', type: 'textbox',  mandatory: false },
];

const PERSONAL_ORDER: Record<string, number> = {
  name: 0, photo: 1, nric: 2,
  nationality: 3, country_of_birth: 4, date_of_birth: 5, sex: 6,
  mobile: 7, email: 8,
  preferred_start_date: 9, preferred_end_date: 10,
  internship_category: 11,
};

/* ─── types & helpers ────────────────────────────────────────────────────── */

const FULL_WIDTH_IDS = new Set(['name', 'internship_category', 'tech_domain', 'achievements']);

type SectionEntry = { id: string; name: string; fields: FormField[] };

function fullWidth(f: FormField): boolean {
  if (f.fullWidth !== undefined) return f.fullWidth;
  return FULL_WIDTH_IDS.has(f.id) || f.type === 'checkbox';
}

/* A field renders full-width if it's explicitly marked OR it's alone in its visual row. */
function renderFullWidth(fields: FormField[], index: number): boolean {
  if (fullWidth(fields[index])) return true;
  // compute which column this field lands in after accounting for full-width predecessors
  let col = 0;
  for (let i = 0; i < index; i++) {
    if (fullWidth(fields[i])) { col = 0; }
    else { col = col === 0 ? 1 : 0; }
  }
  // field starts a new row (col=0) and has no half-width partner following it
  if (col === 0) {
    const next = fields[index + 1];
    return !next || fullWidth(next);
  }
  return false;
}

function sectionsFromFields(fields: FormField[]): SectionEntry[] {
  const byName: Record<string, FormField[]> = {};
  const seenOrder: string[] = [];
  for (const f of fields) {
    if (!byName[f.section]) { byName[f.section] = []; seenOrder.push(f.section); }
    byName[f.section].push(f);
  }
  const canonical = CANONICAL_ORDER.filter(s => byName[s]);
  const extras     = seenOrder.filter(s => !CANONICAL_ORDER.includes(s));
  return [...canonical, ...extras].map(name => ({
    id: name,
    name,
    fields: name === 'Personal Particulars'
      ? [...byName[name]].sort((a, b) => (PERSONAL_ORDER[a.id] ?? 99) - (PERSONAL_ORDER[b.id] ?? 99))
      : byName[name],
  }));
}

function flattenSections(sections: SectionEntry[]): FormField[] {
  return sections.flatMap(s => s.fields.map(f => ({ ...f, section: s.name })));
}

function loadAll(): AppFormTemplate[] {
  const seed = appFormSeed as AppFormTemplate[];
  const ver  = localStorage.getItem(AFT_VER_KEY);
  if (ver !== AFT_SEED_VER) {
    localStorage.setItem(AFT_KEY, JSON.stringify(seed));
    localStorage.setItem(AFT_VER_KEY, AFT_SEED_VER);
    return seed;
  }
  const raw = localStorage.getItem(AFT_KEY);
  return raw ? JSON.parse(raw) : seed;
}

/* ─── FieldPreview ───────────────────────────────────────────────────────── */

function FieldPreview({ field }: { field: FormField }) {
  switch (field.type) {
    case 'textbox': return (
      <div className="h-10 px-3 rounded-xl border border-border bg-bg-subtle flex items-center">
        <span className="text-body-sm text-fg-subtle">{field.maxChars ? `max ${field.maxChars} chars` : 'Type here…'}</span>
      </div>
    );
    case 'dropdown': return (
      <div className="h-10 px-3 rounded-xl border border-border bg-bg-subtle flex items-center justify-between gap-2">
        <span className="text-body-sm text-fg-subtle">{field.options ? `${field.options.length} options` : 'Select…'}</span>
        <ChevronDown size={14} className="text-fg-subtle shrink-0" />
      </div>
    );
    case 'calendar': return (
      <div className="h-10 px-3 rounded-xl border border-border bg-bg-subtle flex items-center gap-2">
        <Calendar size={13} className="text-fg-subtle shrink-0" />
        <span className="text-body-sm text-fg-subtle">DD / MM / YYYY</span>
      </div>
    );
    case 'radio': return (
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 py-2 min-h-[40px]">
        {(field.options?.slice(0, 4) ?? ['Yes', 'No']).map(o => (
          <label key={o} className="flex items-center gap-1.5 cursor-default select-none">
            <div className="w-4 h-4 rounded-full border-2 border-border shrink-0" />
            <span className="text-body-sm text-fg-muted">{o}</span>
          </label>
        ))}
        {(field.options?.length ?? 0) > 4 && <span className="text-body-sm text-fg-subtle">+{(field.options?.length ?? 0) - 4} more</span>}
      </div>
    );
    case 'checkbox': return (
      <div className="flex flex-wrap gap-x-5 gap-y-2 py-2">
        {(field.options?.slice(0, 3) ?? ['Option A', 'Option B']).map(o => (
          <label key={o} className="flex items-center gap-1.5 cursor-default select-none">
            <div className="w-4 h-4 rounded border-2 border-border shrink-0" />
            <span className="text-body-sm text-fg-muted">{o}</span>
          </label>
        ))}
        {(field.options?.length ?? 0) > 3 && <span className="text-body-sm text-fg-subtle">…and {(field.options?.length ?? 0) - 3} more</span>}
      </div>
    );
    case 'upload': return (
      <div className="h-10 px-3 rounded-xl border border-dashed border-border bg-bg-subtle flex items-center gap-2">
        <Upload size={13} className="text-fg-subtle shrink-0" />
        <span className="text-body-sm text-fg-subtle">Click to upload</span>
      </div>
    );
    default: return <div className="h-10 rounded-xl border border-border bg-bg-subtle" />;
  }
}

/* ─── FieldCard ──────────────────────────────────────────────────────────── */

function FieldCard({ field, onEdit, onRemove, onToggleWidth, isFull, dragHandle }: {
  field: FormField;
  onEdit: () => void;
  onRemove: () => void;
  onToggleWidth: () => void;
  isFull: boolean;
  dragHandle: React.ReactNode;
}) {
  const typeLabel = FIELD_TYPES.find(t => t.value === field.type)?.label ?? field.type;
  return (
    <div className="group rounded-xl border border-border bg-surface hover:border-accent/30 hover:shadow-sm transition-all">
      <div className="flex items-center gap-1.5 px-3 pt-3 pb-1.5">
        {dragHandle}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap leading-snug">
            <span className="text-label-md text-fg">{field.label}</span>
            {field.mandatory && <span className="text-danger">*</span>}
            {field.isCustom && (
              <span className="px-1.5 py-px rounded bg-warning-bg text-warning text-[12px] font-bold shrink-0">Custom</span>
            )}
          </div>
          <span className="text-[13px] text-fg-subtle">{typeLabel}</span>
        </div>
        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onToggleWidth} title={isFull ? 'Split to half-width' : 'Expand to full row'}
            className="p-1.5 rounded-lg text-fg-subtle hover:text-fg hover:bg-bg-subtle transition-colors">
            {isFull ? <Columns2 size={12} /> : <Maximize2 size={12} />}
          </button>
          <button onClick={onEdit} title="Configure field"
            className="p-1.5 rounded-lg text-fg-subtle hover:text-fg hover:bg-bg-subtle transition-colors">
            <Settings2 size={12} />
          </button>
          <button onClick={onRemove} title="Remove field"
            className="p-1.5 rounded-lg text-fg-subtle hover:text-danger transition-colors">
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      <div className="px-3 pb-3"><FieldPreview field={field} /></div>
    </div>
  );
}

/* ─── SortableFieldCard ──────────────────────────────────────────────────── */

function SortableFieldCard({ field, allFields, fieldIndex, onEdit, onRemove, onToggleWidth }: {
  field: FormField;
  allFields: FormField[];
  fieldIndex: number;
  onEdit: () => void;
  onRemove: () => void;
  onToggleWidth: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const isFull = renderFullWidth(allFields, fieldIndex);
  return (
    <div ref={setNodeRef} style={style} className={`${isFull ? 'sm:col-span-2' : ''} ${isDragging ? 'opacity-30' : ''}`}>
      <FieldCard
        field={field}
        onEdit={onEdit}
        onRemove={onRemove}
        onToggleWidth={onToggleWidth}
        isFull={isFull}
        dragHandle={
          <button
            {...listeners}
            {...attributes}
            className="p-1 rounded-md text-fg-subtle hover:text-fg hover:bg-bg-subtle transition-colors cursor-grab active:cursor-grabbing touch-none shrink-0"
            title="Drag to reorder"
          >
            <GripVertical size={13} />
          </button>
        }
      />
    </div>
  );
}

/* ─── SectionAccordion ───────────────────────────────────────────────────── */

function SectionAccordion({ entry, index, open, onToggle, onRename, onDelete, onEditField, onRemoveField, onReorderField, onToggleFieldWidth, onAddField, autoRename, dragHandle }: {
  entry: SectionEntry; index: number; open: boolean;
  onToggle: () => void; onRename: (name: string) => void; onDelete: () => void;
  onEditField: (fid: string) => void;
  onRemoveField: (fid: string) => void;
  onReorderField: (activeId: string, overId: string) => void;
  onToggleFieldWidth: (fid: string) => void;
  onAddField: () => void;
  autoRename?: boolean;
  dragHandle: React.ReactNode;
}) {
  const [renaming,         setRenaming]         = useState(autoRename ?? false);
  const [nameInput,        setNameInput]        = useState(entry.name);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [activeFieldId,    setActiveFieldId]    = useState<string | null>(null);
  const inputRef                                = useRef<HTMLInputElement>(null);
  const fieldSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleFieldDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveFieldId(null);
    if (!over || active.id === over.id) return;
    onReorderField(String(active.id), String(over.id));
  }

  useEffect(() => {
    if (renaming) inputRef.current?.select();
  }, [renaming]);

  function startRename(e: React.MouseEvent) {
    e.stopPropagation();
    setNameInput(entry.name);
    setRenaming(true);
  }

  function confirmRename() {
    const n = nameInput.trim();
    if (n && n !== entry.name) onRename(n);
    else setNameInput(entry.name);
    setRenaming(false);
  }

  function handleRenameKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') confirmRename();
    if (e.key === 'Escape') { setNameInput(entry.name); setRenaming(false); }
  }

  return (
    <div className="card mb-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-4">
        {/* Drag handle */}
        <div onClick={e => e.stopPropagation()} className="shrink-0">{dragHandle}</div>

        {/* Toggle zone */}
        <button
          type="button"
          onClick={renaming ? undefined : onToggle}
          disabled={renaming}
          className="flex items-center gap-3 flex-1 text-left min-w-0"
        >
          <div className="flex-1 min-w-0">
            {renaming ? (
              <input
                ref={inputRef}
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onBlur={confirmRename}
                onKeyDown={handleRenameKey}
                onClick={e => e.stopPropagation()}
                className="input w-full text-headline-sm font-semibold py-1 h-auto"
                placeholder="Section name"
              />
            ) : (
              <h2 className="text-headline-sm text-fg font-semibold">{index + 1}. {entry.name}</h2>
            )}
          </div>
          {!renaming && <ChevronDown size={16} className={`text-fg-subtle shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />}
        </button>

        {/* Section actions */}
        <div className="flex items-center gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
          {renaming ? (
            <button onClick={confirmRename}
              className="px-3 py-1.5 rounded-lg bg-accent text-white text-body-sm font-medium hover:bg-accent/90 transition-colors">
              Save
            </button>
          ) : (
            <>
              <button onClick={startRename} title="Rename section"
                className="p-1.5 rounded-lg text-fg-subtle hover:text-fg hover:bg-bg-subtle transition-colors">
                <Pencil size={13} />
              </button>
              <button onClick={() => setConfirmingDelete(true)} title="Delete section"
                className="p-1.5 rounded-lg text-fg-subtle hover:text-danger transition-colors">
                <Trash2 size={13} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      {confirmingDelete && (
        <div className="px-6 py-3 border-t border-border bg-danger-bg/20 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-body-sm text-fg">
            Delete <strong>"{entry.name}"</strong>?
            {entry.fields.length > 0 && (
              <span className="text-danger ml-1">
                This removes {entry.fields.length} field{entry.fields.length !== 1 ? 's' : ''}.
              </span>
            )}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => { onDelete(); setConfirmingDelete(false); }}
              className="px-3 py-1.5 rounded-lg bg-danger text-white text-body-sm font-medium hover:bg-danger/90 transition-colors">
              Delete
            </button>
            <button onClick={() => setConfirmingDelete(false)} className="btn-outline text-body-sm py-1 px-3">Cancel</button>
          </div>
        </div>
      )}

      {/* Body */}
      {open && !confirmingDelete && (
        <div className="border-t border-border px-6 py-5">
          {entry.name === 'Academic Information' && (
            <div className="flex items-start gap-2.5 px-3.5 py-3 bg-bg-subtle border border-border rounded-xl text-body-sm text-fg-muted mb-4">
              <Info size={13} className="text-fg-subtle mt-0.5 shrink-0" />
              <span>Education history (institution, year, course, GPA) is collected as a structured multi-entry block. Fields below control which columns are visible in that block.</span>
            </div>
          )}
          {entry.fields.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-border rounded-xl text-center gap-2">
              <p className="text-body-sm text-fg-muted">No fields yet</p>
              <button onClick={onAddField} className="flex items-center gap-1.5 text-body-sm font-medium text-accent hover:text-accent/80 transition-colors">
                <Plus size={13} />Add first field
              </button>
            </div>
          ) : (
            <>
              <DndContext
                sensors={fieldSensors}
                collisionDetection={closestCenter}
                onDragStart={e => setActiveFieldId(String(e.active.id))}
                onDragEnd={handleFieldDragEnd}
              >
                <SortableContext items={entry.fields.map(f => f.id)} strategy={rectSortingStrategy}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    {entry.fields.map((f, fi) => (
                      <SortableFieldCard
                        key={f.id}
                        field={f}
                        allFields={entry.fields}
                        fieldIndex={fi}
                        onEdit={() => onEditField(f.id)}
                        onRemove={() => onRemoveField(f.id)}
                        onToggleWidth={() => onToggleFieldWidth(f.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
                <DragOverlay>
                  {activeFieldId && (() => {
                    const f = entry.fields.find(ff => ff.id === activeFieldId);
                    if (!f) return null;
                    const typeLabel = FIELD_TYPES.find(t => t.value === f.type)?.label ?? f.type;
                    return (
                      <div className="rounded-xl border border-accent/40 bg-surface shadow-xl opacity-95 pointer-events-none">
                        <div className="flex items-center gap-1.5 px-3 pt-3 pb-1.5">
                          <GripVertical size={13} className="text-accent shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-label-md text-fg">{f.label}</span>
                              {f.mandatory && <span className="text-danger">*</span>}
                            </div>
                            <span className="text-[13px] text-fg-subtle">{typeLabel}</span>
                          </div>
                        </div>
                        <div className="px-3 pb-3"><FieldPreview field={f} /></div>
                      </div>
                    );
                  })()}
                </DragOverlay>
              </DndContext>
              <button onClick={onAddField}
                className="flex items-center gap-1.5 text-body-sm font-medium text-accent hover:text-accent/80 transition-colors">
                <Plus size={13} />Add field
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── SortableSectionAccordion ───────────────────────────────────────────── */

type SectionAccordionBaseProps = Omit<Parameters<typeof SectionAccordion>[0], 'dragHandle'>;

function SortableSectionAccordion(props: SectionAccordionBaseProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.entry.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} className={isDragging ? 'opacity-30' : ''}>
      <SectionAccordion
        {...props}
        dragHandle={
          <button
            {...listeners}
            {...attributes}
            className="p-1.5 rounded-lg text-fg-subtle hover:text-fg hover:bg-bg-subtle transition-colors cursor-grab active:cursor-grabbing touch-none"
            title="Drag to reorder section"
          >
            <GripVertical size={15} />
          </button>
        }
      />
    </div>
  );
}

/* ─── InterestsSectionReadOnly ───────────────────────────────────────────── */

function InterestsSectionReadOnly({ index }: { index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card mb-4 overflow-hidden opacity-70">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-6 py-4 hover:bg-bg-subtle/40 transition-colors text-left">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-headline-sm text-fg font-semibold">{index + 1}. Project Interests</h2>
            <Lock size={12} className="text-fg-subtle" />
            <span className="text-caption-bold bg-bg-muted text-fg-muted px-2.5 py-0.5 rounded-full">2 fixed</span>
          </div>
        </div>
        <ChevronDown size={16} className={`text-fg-subtle shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="border-t border-border px-6 py-5">
          <div className="flex items-start gap-2.5 px-3.5 py-3 bg-accent/5 border border-accent/15 rounded-xl text-body-sm text-fg mb-4">
            <Info size={13} className="text-accent mt-0.5 shrink-0" />
            <span>These questions are asked to every applicant regardless of category and cannot be removed. They power the AI project matching engine.</span>
          </div>
          <div className="space-y-3">
            {['Technology & Real-World Problems', 'Technical Interests & Career Direction'].map(q => (
              <div key={q} className="rounded-xl border border-border p-4 bg-bg-subtle/30">
                <p className="text-label-md text-fg mb-0.5">{q}</p>
                <p className="text-body-sm text-fg-muted mb-2.5">Open-ended · Not mandatory · Analysed by AI</p>
                <div className="h-10 rounded-lg border border-border bg-bg-subtle flex items-center px-3">
                  <span className="text-body-sm text-fg-subtle">Long answer…</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── FieldLibraryDrawer ─────────────────────────────────────────────────── */

function FieldLibraryDrawer({ sectionName, existingIds, onClose, onAdd }: {
  sectionName: string; existingIds: Set<string>; onClose: () => void;
  onAdd: (f: FormField) => void;
}) {
  const [mode,          setMode]          = useState<'library' | 'custom'>('library');
  const [expandedId,    setExpandedId]    = useState<string | null>(null);
  const [expandedOpts,  setExpandedOpts]  = useState('');
  const [label,         setLabel]         = useState('');
  const [type,          setType]          = useState<FormFieldType>('textbox');
  const [mandatory,     setMandatory]     = useState(false);
  const [optionsRaw,    setOptionsRaw]    = useState('');
  const needsOptions = type === 'dropdown' || type === 'radio' || type === 'checkbox';

  const groups = Array.from(new Set(FIELD_CATALOG.map(f => f.group)));

  function handleLibraryClick(lf: LibField) {
    const hasOpts = lf.type === 'dropdown' || lf.type === 'radio' || lf.type === 'checkbox';
    if (hasOpts) {
      if (expandedId === lf.id) { setExpandedId(null); return; }
      setExpandedId(lf.id);
      setExpandedOpts(lf.options?.join('\n') ?? '');
    } else {
      commitLibrary(lf, undefined);
    }
  }

  function commitLibrary(lf: LibField, opts: string[] | undefined) {
    const newId = existingIds.has(lf.id) ? `${lf.id}_${Date.now()}` : lf.id;
    onAdd({
      id: newId, section: sectionName, label: lf.label, type: lf.type,
      required: true, mandatory: lf.mandatory,
      ...(opts !== undefined ? { options: opts } : lf.options ? { options: lf.options } : {}),
      ...(lf.maxChars ? { maxChars: lf.maxChars } : {}),
    });
    setExpandedId(null);
  }

  function addCustom() {
    if (!label.trim()) return;
    const opts = needsOptions && optionsRaw.trim()
      ? optionsRaw.split('\n').map(s => s.trim()).filter(Boolean) : undefined;
    onAdd({
      id: `custom_${Date.now()}`, section: sectionName, label: label.trim(), type,
      required: true, mandatory, isCustom: true,
      ...(opts ? { options: opts } : {}),
    });
  }

  return (
    <>
      <div className="fixed inset-0 bg-fg/30 z-[210]" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full bg-surface border-l border-border shadow-2xl z-[220] w-full max-w-md flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0">
          <div>
            <p className="text-[13px] font-bold uppercase tracking-wider text-fg-muted mb-0.5">{sectionName}</p>
            <h2 className="text-headline-sm text-fg">Add Field</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-bg-subtle text-fg-muted"><X size={20} /></button>
        </div>
        {/* Tabs */}
        <div className="flex border-b border-border shrink-0">
          {(['library', 'custom'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setExpandedId(null); }}
              className={`flex-1 py-2.5 text-body-sm font-semibold transition-colors ${
                mode === m ? 'text-accent border-b-2 border-accent' : 'text-fg-muted hover:text-fg'
              }`}>
              {m === 'library' ? 'Field Library' : 'Custom Question'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {mode === 'library' ? (
            <div className="px-6 py-4 space-y-5">
              {groups.map(group => (
                <div key={group}>
                  <p className="text-[13px] font-bold uppercase tracking-wider text-fg-muted mb-2">{group}</p>
                  <div className="space-y-1.5">
                    {FIELD_CATALOG.filter(f => f.group === group).map(lf => {
                      const hasOpts = lf.type === 'dropdown' || lf.type === 'radio' || lf.type === 'checkbox';
                      const isExpanded = expandedId === lf.id;
                      const alreadyIn  = existingIds.has(lf.id);
                      return (
                        <div key={lf.id} className={`rounded-xl border transition-colors ${isExpanded ? 'border-accent/40 bg-accent/5' : 'border-border'}`}>
                          {/* Row */}
                          <button onClick={() => handleLibraryClick(lf)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-xl hover:bg-accent/5 transition-colors">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-body-md font-medium text-fg">{lf.label}</span>
                                {alreadyIn && (
                                  <span className="px-1.5 py-px rounded bg-bg-subtle border border-border text-[12px] text-fg-muted font-medium shrink-0">
                                    In template
                                  </span>
                                )}
                              </div>
                              <p className="text-body-sm text-fg-muted">{FIELD_TYPES.find(t => t.value === lf.type)?.label}</p>
                            </div>
                            {hasOpts
                              ? <ChevronDown size={14} className={`text-accent shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                              : <Plus size={15} className="text-accent shrink-0" />
                            }
                          </button>

                          {/* Inline options editor */}
                          {isExpanded && (
                            <div className="px-3 pb-3 border-t border-accent/20 pt-3 space-y-3">
                              <div>
                                <label className="block text-label-sm text-fg-muted mb-1.5">
                                  Options <span className="font-normal">(one per line)</span>
                                </label>
                                <textarea
                                  value={expandedOpts}
                                  onChange={e => setExpandedOpts(e.target.value)}
                                  rows={Math.max(3, expandedOpts.split('\n').length + 1)}
                                  className="input w-full resize-none font-mono text-body-sm"
                                  placeholder={'Option A\nOption B\nOption C'}
                                  autoFocus
                                />
                              </div>
                              <div className="flex justify-end gap-2">
                                <button onClick={() => setExpandedId(null)} className="btn-outline text-body-sm py-1.5 px-3">
                                  Cancel
                                </button>
                                <button
                                  onClick={() => {
                                    const opts = expandedOpts.split('\n').map(s => s.trim()).filter(Boolean);
                                    commitLibrary(lf, opts.length ? opts : undefined);
                                  }}
                                  className="btn-primary text-body-sm py-1.5 px-3"
                                >
                                  <Check size={13} />Add Field
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-5 space-y-5">
              <div>
                <label className="block text-label-md text-fg mb-1.5">Question label <span className="text-danger">*</span></label>
                <input value={label} onChange={e => setLabel(e.target.value)} className="input w-full"
                  placeholder="e.g. What motivates you to join DSTA?" autoFocus />
              </div>
              <div>
                <label className="block text-label-md text-fg mb-2">Answer type</label>
                <div className="grid grid-cols-2 gap-2">
                  {FIELD_TYPES.map(t => (
                    <button key={t.value} onClick={() => setType(t.value)}
                      className={`px-3 py-2.5 rounded-xl border text-body-sm font-medium text-left transition-colors ${
                        type === t.value ? 'border-accent bg-accent/5 text-accent' : 'border-border text-fg-muted hover:border-fg-muted hover:text-fg'
                      }`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              {needsOptions && (
                <div>
                  <label className="block text-label-md text-fg mb-1.5">Options <span className="text-fg-muted text-body-sm font-normal">(one per line)</span></label>
                  <textarea value={optionsRaw} onChange={e => setOptionsRaw(e.target.value)}
                    rows={5} className="input w-full resize-none font-mono text-body-sm"
                    placeholder={'Option A\nOption B\nOption C'} />
                </div>
              )}
              <div className="flex items-center justify-between px-4 py-3.5 bg-bg-subtle rounded-xl border border-border">
                <div>
                  <p className="text-body-md font-medium text-fg">Required to submit</p>
                  <p className="text-body-sm text-fg-muted">Applicant must answer this question</p>
                </div>
                <button onClick={() => setMandatory(v => !v)}
                  className={`relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors ${mandatory ? 'bg-accent' : 'bg-border'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${mandatory ? 'translate-x-5' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
          )}
        </div>

        {mode === 'custom' && (
          <div className="px-6 py-4 border-t border-border bg-bg-subtle shrink-0 flex justify-end gap-3">
            <button onClick={addCustom} disabled={!label.trim()} className="btn-primary">
              <Check size={15} />Add Question
            </button>
            <button onClick={onClose} className="btn-outline">Cancel</button>
          </div>
        )}
      </div>
    </>
  );
}

/* ─── FieldConfigDrawer ──────────────────────────────────────────────────── */

function FieldConfigDrawer({ field, onClose, onSave }: {
  field: FormField; onClose: () => void; onSave: (updated: FormField) => void;
}) {
  const [label,      setLabel]      = useState(field.label);
  const [type,       setType]       = useState<FormFieldType>(field.type);
  const [mandatory,  setMandatory]  = useState(field.mandatory ?? false);
  const [optionsRaw, setOptionsRaw] = useState(field.options?.join('\n') ?? '');
  const [maxChars,   setMaxChars]   = useState(field.maxChars?.toString() ?? '');

  const isCustom     = field.isCustom ?? false;
  const needsOptions = type === 'dropdown' || type === 'radio' || type === 'checkbox';
  const typeLabel    = FIELD_TYPES.find(t => t.value === field.type)?.label ?? field.type;

  function handleSave() {
    const opts = needsOptions && optionsRaw.trim()
      ? optionsRaw.split('\n').map(s => s.trim()).filter(Boolean) : field.options;
    const mc = maxChars.trim() && !isNaN(Number(maxChars)) ? parseInt(maxChars) : undefined;
    onSave({ ...field, label: isCustom ? label.trim() : field.label, type: isCustom ? type : field.type, mandatory, options: opts, maxChars: mc });
  }

  return (
    <>
      <div className="fixed inset-0 bg-fg/30 z-[210]" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full bg-surface border-l border-border shadow-2xl z-[220] w-full max-w-md flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0">
          <div>
            <p className="text-[13px] font-bold uppercase tracking-wider text-fg-muted mb-0.5">Field Configuration</p>
            <h2 className="text-headline-sm text-fg truncate max-w-[300px]">{field.label}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-bg-subtle text-fg-muted"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div className="flex items-center gap-2 flex-wrap">
            {!isCustom && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-bg-muted border border-border text-body-sm text-fg-muted">
                <Lock size={11} />Standard field
              </span>
            )}
            {isCustom && <span className="px-2.5 py-1 rounded-full bg-warning-bg text-warning text-body-sm font-medium">Custom field</span>}
            <span className="px-2.5 py-1 rounded-full bg-bg-muted border border-border text-body-sm text-fg-muted">
              {isCustom ? FIELD_TYPES.find(t => t.value === type)?.label : typeLabel}
            </span>
          </div>

          <div>
            <label className="block text-label-md text-fg mb-1.5">Question label</label>
            {isCustom ? (
              <input value={label} onChange={e => setLabel(e.target.value)} className="input w-full" />
            ) : (
              <p className="text-body-md text-fg-muted px-3 py-2.5 bg-bg-subtle rounded-xl border border-border">{field.label}</p>
            )}
          </div>

          {isCustom && (
            <div>
              <label className="block text-label-md text-fg mb-2">Answer type</label>
              <div className="grid grid-cols-2 gap-2">
                {FIELD_TYPES.map(t => (
                  <button key={t.value} onClick={() => setType(t.value)}
                    className={`px-3 py-2.5 rounded-xl border text-body-sm font-medium text-left transition-colors ${
                      type === t.value ? 'border-accent bg-accent/5 text-accent' : 'border-border text-fg-muted hover:border-fg-muted hover:text-fg'
                    }`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {needsOptions && (
            <div>
              <label className="block text-label-md text-fg mb-1.5">Options {isCustom && <span className="text-fg-muted text-body-sm font-normal">(one per line)</span>}</label>
              {isCustom ? (
                <textarea value={optionsRaw} onChange={e => setOptionsRaw(e.target.value)}
                  rows={5} className="input w-full resize-none font-mono text-body-sm" placeholder={'Option A\nOption B\nOption C'} />
              ) : (
                <div className="px-3 py-2.5 bg-bg-subtle rounded-xl border border-border max-h-40 overflow-y-auto space-y-0.5">
                  {(field.options ?? []).map(o => <p key={o} className="text-body-sm text-fg-muted">{o}</p>)}
                </div>
              )}
            </div>
          )}

          {(isCustom || field.maxChars) && field.type === 'textbox' && (
            <div>
              <label className="block text-label-md text-fg mb-1.5">Max characters <span className="text-fg-muted text-body-sm font-normal">(optional)</span></label>
              {isCustom ? (
                <input value={maxChars} onChange={e => setMaxChars(e.target.value)} type="number" min="1" className="input w-full" placeholder="e.g. 500" />
              ) : (
                <p className="text-body-md text-fg-muted">{field.maxChars}</p>
              )}
            </div>
          )}

          <div className="space-y-3">
            {([
              { label: 'Required to submit', desc: 'Applicant must answer this question', val: mandatory, set: setMandatory },
            ] as const).map(row => (
              <div key={row.label} className="flex items-center justify-between px-4 py-3.5 bg-bg-subtle rounded-xl border border-border">
                <div>
                  <p className="text-body-md font-medium text-fg">{row.label}</p>
                  <p className="text-body-sm text-fg-muted">{row.desc}</p>
                </div>
                <button onClick={() => row.set(v => !v)}
                  className={`relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors ${row.val ? 'bg-accent' : 'bg-border'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${row.val ? 'translate-x-5' : 'translate-x-1'}`} />
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="px-6 py-4 border-t border-border bg-bg-subtle shrink-0 flex justify-end gap-3">
          <button onClick={handleSave} className="btn-primary"><Check size={15} />Apply Changes</button>
          <button onClick={onClose} className="btn-outline">Cancel</button>
        </div>
      </div>
    </>
  );
}

/* ─── EditMetaDrawer ─────────────────────────────────────────────────────── */

function EditMetaDrawer({ template, onClose, onSave }: {
  template: AppFormTemplate; onClose: () => void;
  onSave: (name: string, desc: string) => void;
}) {
  const [name, setName] = useState(template.name);
  const [desc, setDesc] = useState(template.description);
  return (
    <>
      <div className="fixed inset-0 bg-fg/30 z-[210]" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full bg-surface border-l border-border shadow-2xl z-[220] w-full max-w-md flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0">
          <div>
            <p className="text-[13px] font-bold uppercase tracking-wider text-fg-muted mb-0.5">Application Form Template</p>
            <h2 className="text-headline-sm text-fg">Edit Template Details</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-bg-subtle text-fg-muted"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div>
            <label className="block text-label-md text-fg mb-1.5">Template Name <span className="text-danger">*</span></label>
            <input value={name} onChange={e => setName(e.target.value)} className="input w-full" />
          </div>
          <div>
            <label className="block text-label-md text-fg mb-1.5">Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={4} className="input w-full resize-none" placeholder="Describe when this form is used…" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-border bg-bg-subtle shrink-0 flex justify-end gap-3">
          <button onClick={() => onSave(name.trim(), desc)} disabled={!name.trim()} className="btn-primary">Save Changes</button>
          <button onClick={onClose} className="btn-outline">Cancel</button>
        </div>
      </div>
    </>
  );
}

/* ─── Preview mode ───────────────────────────────────────────────────────── */

function PreviewSection({ entry }: { entry: SectionEntry }) {
  const visible = entry.fields.filter(f => !f.hidden);
  if (visible.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="mb-5 pb-3 border-b border-border">
        <h2 className="text-headline-sm text-fg font-semibold">{entry.name}</h2>
      </div>

      {entry.name === 'Academic Information' ? (
        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-surface overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <p className="text-body-md font-semibold text-fg">Education History</p>
              <p className="text-body-sm text-fg-muted mt-0.5">Add one entry per education level, most recent first.</p>
            </div>
            <div className="p-5 space-y-3">
              <div className="rounded-xl border border-border bg-bg-subtle/40 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[13px] font-bold uppercase tracking-wider text-fg-muted">Entry 1</span>
                  <span className="text-body-sm text-fg-subtle italic">Most recent</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Education Level', required: true, placeholder: 'e.g. University', dropdown: true },
                    { label: 'Institution Name', required: true, placeholder: 'e.g. NUS, NTU, SMU…', dropdown: false },
                    { label: 'Start Year', required: false, placeholder: 'e.g. 2022', dropdown: false },
                    { label: 'Graduation Year', required: false, placeholder: 'e.g. 2026', dropdown: false },
                  ].map(col => (
                    <div key={col.label}>
                      <p className="text-label-sm text-fg-muted mb-1.5">{col.label}{col.required && <span className="text-danger">*</span>}</p>
                      <div className="h-9 px-3 rounded-lg border border-border bg-surface flex items-center justify-between">
                        <span className="text-body-sm text-fg-subtle">{col.placeholder}</span>
                        {col.dropdown && <ChevronDown size={13} className="text-fg-subtle shrink-0" />}
                      </div>
                    </div>
                  ))}
                  {['Course / Specialisation', 'Results / GPA / Grade'].map(col => (
                    <div key={col} className="col-span-2">
                      <p className="text-label-sm text-fg-muted mb-1.5">{col}</p>
                      <div className="h-9 px-3 rounded-lg border border-border bg-surface flex items-center">
                        <span className="text-body-sm text-fg-subtle">Enter here…</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-border text-body-sm text-fg-muted">
                <Plus size={14} />Add another education level
              </div>
            </div>
          </div>
          {(() => {
            const CORE = new Set(['name_of_institution', 'year_of_study']);
            const extra = visible.filter(f => !CORE.has(f.id));
            return extra.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {extra.map((f, fi) => (
                  <div key={f.id} className={renderFullWidth(extra, fi) ? 'sm:col-span-2' : ''}>
                    <label className="block text-label-md text-fg mb-1.5">
                      {f.label}{f.mandatory && <span className="text-danger">*</span>}
                    </label>
                    <FieldPreview field={f} />
                  </div>
                ))}
              </div>
            ) : null;
          })()}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {visible.map((f, fi) => (
            <div key={f.id} className={renderFullWidth(visible, fi) ? 'sm:col-span-2' : ''}>
              <label className="block text-label-md text-fg mb-1.5">
                {f.label}
                {f.mandatory && <span className="text-danger">*</span>}
              </label>
              <FieldPreview field={f} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PreviewInterests() {
  return (
    <div className="mb-8">
      <div className="mb-5 pb-3 border-b border-border">
        <h2 className="text-headline-sm text-fg font-semibold">Project Interests</h2>
      </div>
      <div className="space-y-4">
        {[
          { label: 'Technology & Real-World Problems', hint: 'Describe a real-world problem you\'d love to tackle using technology…' },
          { label: 'Technical Interests & Career Direction', hint: 'Which technology domain interests you most, and what impact would you hope to make…' },
        ].map(q => (
          <div key={q.label}>
            <label className="block text-label-md text-fg mb-1.5">{q.label}
              <span className="ml-2 text-body-sm text-fg-muted font-normal">Analysed by AI</span>
            </label>
            <div className="rounded-xl border border-border bg-bg-subtle px-4 py-3 min-h-[90px]">
              <span className="text-body-sm text-fg-subtle">{q.hint}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Create template page ───────────────────────────────────────────────── */


function CreateTemplatePage({ allTemplates, onCreated, onCancel }: {
  allTemplates: AppFormTemplate[];
  onCreated: (id: string) => void;
  onCancel: () => void;
}) {
  const [name, setName]       = useState('');
  const [desc, setDesc]       = useState('');
  const [nameErr, setNameErr] = useState('');

  function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) { setNameErr('Template name is required'); return; }
    if (allTemplates.some(t => t.name.toLowerCase() === trimmed.toLowerCase())) {
      setNameErr('A template with this name already exists'); return;
    }
    const newId = `AFT-${Date.now()}`;
    const newTmpl: AppFormTemplate = {
      id: newId, name: trimmed, description: desc.trim(),
      updatedAt: new Date().toISOString().split('T')[0], fields: [],
    };
    const next = [...allTemplates, newTmpl];
    localStorage.setItem(AFT_KEY, JSON.stringify(next));
    onCreated(newId);
  }

  return (
    <Shell activeRoute="/templates">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 mb-6 text-label-md">
        <button onClick={onCancel} className="text-fg-muted hover:text-accent transition-colors">Templates</button>
        <ChevronRight size={14} className="text-fg-subtle" />
        <span className="text-fg">New Application Form</span>
      </nav>

      <div className="max-w-xl">
        <div className="card p-8">
          <div className="mb-6">
            <h1 className="text-headline-md text-fg mb-1">New Application Form Template</h1>
            <p className="text-body-md text-fg-muted">Set the template name and description, then add sections and fields in the editor.</p>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-label-md text-fg mb-1.5">
                Template Name <span className="text-danger">*</span>
              </label>
              <input
                value={name}
                onChange={e => { setName(e.target.value); if (nameErr) setNameErr(''); }}
                placeholder="e.g. UG Intern Application Form"
                className={`input w-full ${nameErr ? 'border-danger' : ''}`}
                autoFocus
              />
              {nameErr && <p className="text-caption text-danger mt-1">{nameErr}</p>}
            </div>

            <div>
              <label className="block text-label-md text-fg mb-1.5">Description</label>
              <textarea
                value={desc}
                onChange={e => setDesc(e.target.value)}
                rows={3}
                placeholder="Describe when this form is used…"
                className="input w-full resize-none"
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end mt-8 pt-6 border-t border-border">
            <button onClick={handleCreate} className="btn-primary">
              <Check size={15} />Create Template
            </button>
            <button onClick={onCancel} className="btn-outline">Cancel</button>
          </div>
        </div>
      </div>
    </Shell>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function TemplateDetailPage() {
  const { id: templateId } = useParams<{ id: string }>();
  const router   = useRouter();
  const { role } = useRole();
  const { setDirty, safeNavigate } = useUnsavedChanges();

  const sectionSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  const [template,     setTemplate]     = useState<AppFormTemplate | null>(null);
  const [allTemplates, setAllTemplates] = useState<AppFormTemplate[]>([]);
  const [sections,     setSections]     = useState<SectionEntry[]>([]);
  const [openIds,      setOpenIds]      = useState<Set<string>>(new Set<string>());
  const [previewMode,  setPreviewMode]  = useState(false);
  const [hasChanges,   setHasChanges]   = useState(false);
  const [editOpen,     setEditOpen]     = useState(false);
  const [delOpen,      setDelOpen]      = useState(false);
  const [libraryFor,   setLibraryFor]   = useState<SectionEntry | null>(null);
  const [configTarget, setConfigTarget] = useState<{ field: FormField; sectionId: string } | null>(null);
  const [autoRenameId, setAutoRenameId] = useState<string | null>(null);
  const { toast, showToast } = useToast();

  useEffect(() => {
    if (role !== 'io-admin') { router.replace('/dashboard'); return; }
    const all   = loadAll();
    setAllTemplates(all);
    const found = all.find(t => t.id === templateId) ?? null;
    setTemplate(found);
    if (found?.fields && found.fields.length > 0) {
      const loaded = sectionsFromFields(found.fields);
      setSections(loaded);
      setOpenIds(new Set<string>(loaded.map(s => s.id)));
    }
    return () => setDirty(false);
  }, [templateId, role, router, setDirty]);

  useEffect(() => { setDirty(hasChanges); }, [hasChanges, setDirty]);

  /* ── section CRUD ── */
  function addSection() {
    const newId = `sect_${Date.now()}`;
    const entry: SectionEntry = { id: newId, name: 'New Section', fields: [] };
    setSections(prev => [...prev, entry]);
    setOpenIds(prev => new Set([...Array.from(prev), newId]));
    setAutoRenameId(newId);
    setHasChanges(true);
  }

  function renameSection(id: string, name: string) {
    setSections(prev => prev.map(s => s.id !== id ? s : { ...s, name }));
    if (autoRenameId === id) setAutoRenameId(null);
    setHasChanges(true);
  }

  function deleteSection(id: string) {
    setSections(prev => prev.filter(s => s.id !== id));
    setOpenIds(prev => { const n = new Set(Array.from(prev)); n.delete(id); return n; });
    setHasChanges(true);
  }

  function handleSectionDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveSectionId(null);
    if (!over || active.id === over.id) return;
    setSections(prev => {
      const oldIdx = prev.findIndex(s => s.id === active.id);
      const newIdx = prev.findIndex(s => s.id === over.id);
      return arrayMove(prev, oldIdx, newIdx);
    });
    setHasChanges(true);
  }

  function toggleOpen(id: string) {
    setOpenIds(prev => {
      const n = new Set(Array.from(prev));
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  /* ── field CRUD ── */
  function removeField(sectionId: string, fid: string) {
    setSections(prev => prev.map(s => s.id !== sectionId ? s : {
      ...s, fields: s.fields.filter(f => f.id !== fid),
    }));
    setHasChanges(true);
  }

  function reorderField(sectionId: string, activeId: string, overId: string) {
    setSections(prev => prev.map(s => {
      if (s.id !== sectionId) return s;
      const oldIdx = s.fields.findIndex(f => f.id === activeId);
      const newIdx = s.fields.findIndex(f => f.id === overId);
      return { ...s, fields: arrayMove(s.fields, oldIdx, newIdx) };
    }));
    setHasChanges(true);
  }


  function toggleFieldWidth(sectionId: string, fid: string) {
    setSections(prev => prev.map(s => {
      if (s.id !== sectionId) return s;
      return { ...s, fields: s.fields.map((f, fi) =>
        f.id !== fid ? f : { ...f, fullWidth: !renderFullWidth(s.fields, fi) }
      )};
    }));
    setHasChanges(true);
  }

  function addField(sectionId: string, field: FormField) {
    setSections(prev => prev.map(s => s.id !== sectionId ? s : {
      ...s, fields: [...s.fields, { ...field, section: s.name }],
    }));
    setLibraryFor(null);
    setHasChanges(true);
  }

  function updateField(sectionId: string, updated: FormField) {
    setSections(prev => prev.map(s => s.id !== sectionId ? s : {
      ...s, fields: s.fields.map(f => f.id === updated.id ? updated : f),
    }));
    setConfigTarget(null);
    setHasChanges(true);
  }

  /* ── persist ── */
  function persist(updated: AppFormTemplate) {
    const next = allTemplates.map(t => t.id === updated.id ? updated : t);
    localStorage.setItem(AFT_KEY, JSON.stringify(next));
    setAllTemplates(next);
    setTemplate(updated);
  }

  function saveChanges() {
    if (!template) return;
    persist({ ...template, fields: flattenSections(sections), updatedAt: new Date().toISOString().split('T')[0] });
    setHasChanges(false);
    showToast('Form template saved.');
  }

  function saveMeta(name: string, desc: string) {
    if (!template) return;
    persist({ ...template, name, description: desc, updatedAt: new Date().toISOString().split('T')[0] });
    setEditOpen(false);
    showToast('Template updated.');
  }

  function doDelete() {
    if (!template) return;
    const next = allTemplates.filter(t => t.id !== template.id);
    localStorage.setItem(AFT_KEY, JSON.stringify(next));
    setDirty(false);
    router.push('/templates');
  }

  if (role !== 'io-admin') return null;

  /* ── Create new template flow ── */
  if (templateId === 'new') {
    return <CreateTemplatePage allTemplates={allTemplates} onCreated={id => router.replace(`/templates/${id}`)} onCancel={() => router.replace('/templates')} />;
  }

  if (!template) {
    return (
      <Shell activeRoute="/templates">
        <div className="flex flex-col items-center justify-center py-32 text-center gap-3">
          <p className="text-headline-sm text-fg font-semibold">Template not found</p>
          <p className="text-body-sm text-fg-muted">This template may have been deleted.</p>
          <button onClick={() => safeNavigate('/templates')} className="btn-outline mt-2"><ChevronLeft size={15} />Back</button>
        </div>
      </Shell>
    );
  }

  const allFields   = flattenSections(sections);
  const existingIds = new Set(allFields.map(f => f.id));
  const fieldTotal  = allFields.length;

  return (
    <Shell activeRoute="/templates">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => safeNavigate('/templates')}
            className="flex items-center gap-1 text-body-sm text-fg-muted hover:text-fg transition-colors shrink-0">
            <ChevronLeft size={16} />Templates
          </button>
          <span className="text-fg-subtle">/</span>
          <h1 className="text-headline-md text-fg truncate">{template.name}</h1>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[13px] font-bold uppercase shrink-0">
            <Shield size={10} />Admin
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          <button onClick={() => setPreviewMode(v => !v)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-body-sm font-medium transition-colors ${
              previewMode ? 'border-accent bg-accent/5 text-accent' : 'border-border text-fg-muted hover:text-fg hover:border-fg-muted'
            }`}>
            <Eye size={14} />{previewMode ? 'Exit Preview' : 'Preview'}
          </button>
          {!previewMode && (
            <>
              <button onClick={() => setEditOpen(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-body-sm font-medium text-fg-muted hover:text-fg hover:border-fg-muted transition-colors">
                <Pencil size={14} />Edit details
              </button>
              <button onClick={() => setDelOpen(true)} title="Delete"
                className="p-2 rounded-lg border border-border text-fg-subtle hover:text-danger hover:border-danger transition-colors">
                <Trash2 size={16} />
              </button>
              {hasChanges && (
                <button onClick={saveChanges} className="btn-primary"><Check size={15} />Save changes</button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Meta strip */}
      <div className="flex items-center gap-1.5 mb-5 flex-wrap">
        <span className="text-body-sm text-fg-muted">{sections.length} section{sections.length !== 1 ? 's' : ''} · {fieldTotal} field{fieldTotal !== 1 ? 's' : ''}</span>
        {!previewMode && hasChanges && (
          <span className="ml-2 flex items-center gap-1.5 text-body-sm text-warning">
            <span className="w-1.5 h-1.5 rounded-full bg-warning" />Unsaved changes
          </span>
        )}
        {previewMode && (
          <span className="ml-2 flex items-center gap-1.5 text-body-sm text-accent">
            <Eye size={12} />Applicant preview
          </span>
        )}
      </div>

      {/* Content */}
      {previewMode ? (
        <div>
          <div className="card p-8">
            <div className="mb-8 pb-5 border-b border-border">
              {/* h2 — the page h1 is the sticky header above; this is the preview body title */}
              <h2 className="text-headline-lg text-fg">{template.name}</h2>
              {template.description && <p className="text-body-md text-fg-muted mt-2">{template.description}</p>}
            </div>
            {sections.map(s => <PreviewSection key={s.id} entry={s} />)}
            <PreviewInterests />
            <div className="pt-5 border-t border-border flex justify-end">
              <div className="px-6 py-2.5 rounded-xl bg-accent text-white text-body-sm font-semibold cursor-default select-none">
                Submit Application
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <DndContext
            sensors={sectionSensors}
            collisionDetection={closestCenter}
            onDragStart={e => setActiveSectionId(String(e.active.id))}
            onDragEnd={handleSectionDragEnd}
          >
            <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
              {sections.map((s, i) => (
                <SortableSectionAccordion
                  key={s.id}
                  entry={s}
                  index={i}
                  open={openIds.has(s.id)}
                  autoRename={s.id === autoRenameId}
                  onToggle={() => toggleOpen(s.id)}
                  onRename={name => renameSection(s.id, name)}
                  onDelete={() => deleteSection(s.id)}
                  onEditField={fid => {
                    const f = s.fields.find(x => x.id === fid);
                    if (f) setConfigTarget({ field: f, sectionId: s.id });
                  }}
                  onRemoveField={fid => removeField(s.id, fid)}
                  onReorderField={(activeId, overId) => reorderField(s.id, activeId, overId)}
                  onToggleFieldWidth={fid => toggleFieldWidth(s.id, fid)}
                  onAddField={() => setLibraryFor(s)}
                />
              ))}
            </SortableContext>
            <DragOverlay>
              {activeSectionId && (() => {
                const s = sections.find(sec => sec.id === activeSectionId);
                if (!s) return null;
                const idx = sections.findIndex(sec => sec.id === activeSectionId);
                return (
                  <div className="card px-4 py-4 shadow-2xl border border-accent/30 bg-surface opacity-95 pointer-events-none">
                    <div className="flex items-center gap-2">
                      <GripVertical size={15} className="text-accent shrink-0" />
                      <h2 className="text-headline-sm text-fg font-semibold">{idx + 1}. {s.name}</h2>
                      <span className="text-body-sm text-fg-subtle ml-auto">{s.fields.length} field{s.fields.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                );
              })()}
            </DragOverlay>
          </DndContext>

          {/* Add Section */}
          <button onClick={addSection}
            className="w-full flex items-center justify-center gap-2 py-4 mb-4 rounded-2xl border-2 border-dashed border-border text-body-sm font-medium text-fg-muted hover:text-accent hover:border-accent/40 hover:bg-accent/3 transition-colors">
            <Plus size={15} />Add Section
          </button>

          <InterestsSectionReadOnly index={sections.length} />
        </>
      )}

      {/* Field Library */}
      {libraryFor && (
        <FieldLibraryDrawer
          sectionName={libraryFor.name}
          existingIds={existingIds}
          onClose={() => setLibraryFor(null)}
          onAdd={f => addField(libraryFor.id, f)}
        />
      )}

      {/* Field Config */}
      {configTarget && (
        <FieldConfigDrawer
          field={configTarget.field}
          onClose={() => setConfigTarget(null)}
          onSave={updated => updateField(configTarget.sectionId, updated)}
        />
      )}

      {/* Edit Meta */}
      {editOpen && (
        <EditMetaDrawer template={template} onClose={() => setEditOpen(false)} onSave={saveMeta} />
      )}

      {/* Delete Template */}
      <Modal open={delOpen} onClose={() => setDelOpen(false)} labelledBy="template-detail-delete-title">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-danger-bg flex items-center justify-center shrink-0">
            <Trash2 size={18} className="text-danger" />
          </div>
          <div>
            <h3 id="template-detail-delete-title" className="text-headline-sm text-fg font-semibold">Delete template?</h3>
            <p className="text-body-sm text-fg-muted mt-1">
              <span className="font-semibold text-fg">"{template.name}"</span> will be permanently removed.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="danger" onClick={doDelete}><Trash2 size={15} />Delete</Button>
          <Button variant="outline" onClick={() => setDelOpen(false)}>Cancel</Button>
        </div>
      </Modal>

      <Toast message={toast} />
    </Shell>
  );
}
