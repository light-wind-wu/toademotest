'use client';

/* Recognised-subject taxonomy management (TOA-068) — DSTA admins add/remove the
   recognised subjects per qualification without NTT. Backed by localStorage,
   defaulting to the hardcoded REQ_TYPES options; every change is written to the
   access log (AUG-151). The eligibility rule builder reads the live lists. */
import { useState, useEffect } from 'react';
import { Plus, BookOpen, History, X, RotateCcw } from 'lucide-react';
import Button from '@/components/ui-legacy/button';
import { cn } from '@/lib/utils';
import { useRole } from '@/lib/role';
import { logAccess } from '@/lib/audit';
import {
  SUBJECT_TAXONOMY_DEFS, loadSubjectTaxonomy, saveSubjectTaxonomy, defaultSubjectOpts,
} from '@/lib/data';

const SUBJECT_AUDIT_ID = 'admin:recognised-subjects';

export default function SubjectTaxonomy() {
  const { profile } = useRole();
  const [tax, setTax] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(SUBJECT_TAXONOMY_DEFS.map(d => [d.key, defaultSubjectOpts(d.key)])));
  const [activeKey, setActiveKey] = useState(SUBJECT_TAXONOMY_DEFS[0].key);
  const [draft, setDraft] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => { setTax(loadSubjectTaxonomy()); }, []);

  const activeDef = SUBJECT_TAXONOMY_DEFS.find(d => d.key === activeKey) ?? SUBJECT_TAXONOMY_DEFS[0];
  const values = tax[activeDef.key] ?? [];

  function persist(next: Record<string, string[]>, auditDetail: string) {
    setTax(next);
    saveSubjectTaxonomy(next);
    logAccess({ actor: profile.name, action: 'decision', detail: auditDetail, subjectId: SUBJECT_AUDIT_ID });
    setSaved(true); setTimeout(() => setSaved(false), 6000);
  }
  function addValue() {
    const v = draft.trim();
    if (!v || values.includes(v)) return;
    persist({ ...tax, [activeDef.key]: [...values, v] }, `Added recognised subject "${v}" to ${activeDef.label}`);
    setDraft('');
  }
  function removeValue(v: string) {
    persist({ ...tax, [activeDef.key]: values.filter(x => x !== v) }, `Removed recognised subject "${v}" from ${activeDef.label}`);
  }
  function resetActive() {
    const def = defaultSubjectOpts(activeDef.key);
    persist({ ...tax, [activeDef.key]: def }, `Reset ${activeDef.label} to the default recognised-subject list`);
  }

  const isCustomised = JSON.stringify(values) !== JSON.stringify(defaultSubjectOpts(activeDef.key));

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-5">
        <span className="grid place-items-center w-8 h-8 rounded-lg bg-accent/10 text-accent shrink-0"><BookOpen size={16} /></span>
        <div>
          <h2 className="text-headline-md text-fg">Recognised subjects</h2>
          <p className="text-body-sm text-fg-muted">Subjects available per qualification when building eligibility criteria. Edits apply immediately and are logged.</p>
        </div>
        {saved && <span className="ml-auto text-body-sm text-success font-medium">Saved.</span>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] gap-5 items-start">
        {/* Qualification picker */}
        <div className="space-y-1">
          {SUBJECT_TAXONOMY_DEFS.map(d => (
            <button key={d.key} onClick={() => { setActiveKey(d.key); setDraft(''); }}
              className={cn('w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left transition-colors',
                d.key === activeDef.key ? 'bg-accent/10 text-accent font-semibold' : 'text-fg hover:bg-bg-subtle')}>
              <span className="text-body-sm truncate">{d.label}</span>
              <span className="text-[11px] font-semibold text-fg-subtle tabular-nums shrink-0">{(tax[d.key] ?? []).length}</span>
            </button>
          ))}
        </div>

        {/* Active qualification editor */}
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-2 mb-3">
            <p className="text-body-sm text-fg-muted">Recognised subjects for <span className="font-semibold text-fg">{activeDef.label}</span>.</p>
            {isCustomised && (
              <button onClick={resetActive} className="inline-flex items-center gap-1 text-[13px] font-semibold text-accent hover:underline shrink-0">
                <RotateCcw size={12} />Reset to default
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {values.map(v => (
              <span key={v} className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full bg-bg-subtle border border-border text-body-sm text-fg">
                {v}
                <button onClick={() => removeValue(v)} aria-label={`Remove ${v}`} className="grid place-items-center w-4 h-4 rounded-full text-fg-subtle hover:text-danger hover:bg-danger-bg transition-colors">
                  <X size={11} />
                </button>
              </span>
            ))}
            {values.length === 0 && <span className="text-body-sm text-fg-subtle italic">No subjects yet.</span>}
          </div>
          <div className="flex items-center gap-2">
            <input
              value={draft} onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addValue(); }}
              placeholder={`Add a subject to ${activeDef.label}…`}
              aria-label={`Add subject to ${activeDef.label}`}
              className="flex-1 px-3 py-2 text-body-sm border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
            <Button onClick={addValue} disabled={!draft.trim() || values.includes(draft.trim())}><Plus size={15} />Add</Button>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-[13px] text-fg-subtle">
            <History size={12} />Every add, remove and reset is written to the access log with your name and a timestamp.
          </p>
        </div>
      </div>
    </div>
  );
}
