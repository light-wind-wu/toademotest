'use client';

/* Application forms — the forms applicants fill in. Lists the existing form templates
   (from the app-form-templates store) with field counts; a starting point for the
   full form builder. Read-only list for now. */
import { useState, useEffect } from 'react';
import { ClipboardList, Pencil, FileText } from 'lucide-react';
import seed from '@/data/app-form-templates.json';

const AFT_KEY      = 'dsta_app_form_templates';
const AFT_VER_KEY  = 'dsta_app_form_templates_seed_v';
const AFT_SEED_VER = '23';

interface FormTemplate { id: string; name: string; description?: string; updatedAt?: string; fields?: unknown[] }

export default function ApplicationForms() {
  const [forms, setForms] = useState<FormTemplate[]>(seed as FormTemplate[]);

  useEffect(() => {
    try {
      // Re-seed when the bundled templates change (keeps a stale localStorage from
      // showing forms that have since been removed from the seed).
      if (localStorage.getItem(AFT_VER_KEY) !== AFT_SEED_VER) {
        localStorage.setItem(AFT_KEY, JSON.stringify(seed));
        localStorage.setItem(AFT_VER_KEY, AFT_SEED_VER);
        setForms(seed as FormTemplate[]);
        return;
      }
      const raw = localStorage.getItem(AFT_KEY);
      if (raw) setForms(JSON.parse(raw));
    } catch {}
  }, []);

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-5">
        <span className="grid place-items-center w-8 h-8 rounded-lg bg-accent/10 text-accent shrink-0"><ClipboardList size={16} /></span>
        <div>
          <h2 className="text-headline-md text-fg">Application forms</h2>
          <p className="text-body-sm text-fg-muted">The forms applicants complete when applying. {forms.length} form{forms.length === 1 ? '' : 's'}.</p>
        </div>
      </div>

      <div className="divide-y divide-border border border-border rounded-xl overflow-hidden">
        {forms.map(f => (
          <div key={f.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-bg-subtle/40">
            <span className="grid place-items-center w-9 h-9 rounded-lg bg-bg-subtle text-fg-muted shrink-0"><FileText size={16} /></span>
            <div className="min-w-0 flex-1">
              <p className="text-body-md font-semibold text-fg truncate">{f.name}</p>
              {f.description && <p className="text-body-sm text-fg-muted truncate">{f.description}</p>}
            </div>
            <div className="hidden sm:flex items-center gap-4 shrink-0">
              <span className="text-body-sm text-fg-muted tabular-nums">{f.fields?.length ?? 0} field{(f.fields?.length ?? 0) === 1 ? '' : 's'}</span>
              {f.updatedAt && <span className="text-[13px] text-fg-subtle">Updated {f.updatedAt}</span>}
            </div>
            <button className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border text-body-sm font-semibold text-fg-muted hover:text-accent hover:border-accent transition-colors" title="Edit form (form builder — coming soon)">
              <Pencil size={13} />Edit
            </button>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[13px] text-fg-subtle">The drag-and-drop field builder arrives in a later phase; forms above are the configured templates.</p>
    </div>
  );
}
