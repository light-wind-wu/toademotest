'use client';

/* Dropdown list management — admin-maintained list values used across the portal
   (departments, rejection reasons, internship categories…). Persisted to
   localStorage (demo). Part of the Admin Settings console. */
import { useState, useEffect } from 'react';
import { Plus, List, History, X } from 'lucide-react';
import Button from '@/components/ui-legacy/button';
import { cn } from '@/lib/utils';

const KEY = 'dsta_dropdown_lists';

interface ManagedList { id: string; label: string; desc: string; values: string[] }
const SEED: ManagedList[] = [
  { id: 'departments', label: 'Departments', desc: 'Hosting departments shown when creating projects.', values: ['C2 Systems', 'Cyber Security', 'Sensors', 'Data Science', 'Networks', 'Robotics & Autonomous Systems'] },
  { id: 'reject-reasons', label: 'Rejection reasons', desc: 'Selectable reasons when rejecting an applicant.', values: ['Did not meet eligibility', 'Stronger candidates available', 'No suitable project match', 'Withdrew from process'] },
  { id: 'intern-categories', label: 'Internship categories', desc: 'Categories used for placement and reporting.', values: ['University', 'Polytechnic', 'Junior College', 'Pre-enlistee', 'Scholar'] },
];

export default function DropdownLists() {
  const [lists, setLists] = useState<ManagedList[]>(SEED);
  const [activeId, setActiveId] = useState(SEED[0].id);
  const [draft, setDraft] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try { const raw = localStorage.getItem(KEY); if (raw) setLists(JSON.parse(raw)); } catch {}
  }, []);

  const active = lists.find(l => l.id === activeId) ?? lists[0];

  function persist(next: ManagedList[]) {
    setLists(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  }
  function addValue() {
    const v = draft.trim();
    if (!v || active.values.includes(v)) return;
    persist(lists.map(l => l.id === active.id ? { ...l, values: [...l.values, v] } : l));
    setDraft('');
  }
  function removeValue(v: string) {
    persist(lists.map(l => l.id === active.id ? { ...l, values: l.values.filter(x => x !== v) } : l));
  }

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-5">
        <span className="grid place-items-center w-8 h-8 rounded-lg bg-accent/10 text-accent shrink-0"><List size={16} /></span>
        <div>
          <h2 className="text-headline-md text-fg">Dropdown lists</h2>
          <p className="text-body-sm text-fg-muted">Managed list values used across the portal. Changes apply on next use.</p>
        </div>
        {saved && <span className="ml-auto text-body-sm text-success font-medium">Saved.</span>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] gap-5 items-start">
        {/* List picker */}
        <div className="space-y-1">
          {lists.map(l => (
            <button key={l.id} onClick={() => { setActiveId(l.id); setDraft(''); }}
              className={cn('w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left transition-colors',
                l.id === active.id ? 'bg-accent/10 text-accent font-semibold' : 'text-fg hover:bg-bg-subtle')}>
              <span className="text-body-sm truncate">{l.label}</span>
              <span className="text-[11px] font-semibold text-fg-subtle tabular-nums shrink-0">{l.values.length}</span>
            </button>
          ))}
        </div>

        {/* Active list editor */}
        <div className="min-w-0">
          <p className="text-body-sm text-fg-muted mb-3">{active.desc}</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {active.values.map(v => (
              <span key={v} className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full bg-bg-subtle border border-border text-body-sm text-fg">
                {v}
                <button onClick={() => removeValue(v)} aria-label={`Remove ${v}`} className="grid place-items-center w-4 h-4 rounded-full text-fg-subtle hover:text-danger hover:bg-danger-bg transition-colors">
                  <X size={11} />
                </button>
              </span>
            ))}
            {active.values.length === 0 && <span className="text-body-sm text-fg-subtle italic">No values yet.</span>}
          </div>
          <div className="flex items-center gap-2">
            <input
              value={draft} onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addValue(); }}
              placeholder={`Add a value to ${active.label}…`}
              aria-label={`Add value to ${active.label}`}
              className="flex-1 px-3 py-2 text-body-sm border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
            <Button onClick={addValue} disabled={!draft.trim()}><Plus size={15} />Add</Button>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-[13px] text-fg-subtle">
            <History size={12} />Version history is retained on save (production: full audit of who changed what).
          </p>
        </div>
      </div>
    </div>
  );
}
