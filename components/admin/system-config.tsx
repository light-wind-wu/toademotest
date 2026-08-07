'use client';

/* System configuration — global parameters + feature switches for the portal.
   Persisted to localStorage (demo). Part of the Admin Settings console. */
import { useState, useEffect } from 'react';
import { Save, Settings, ToggleLeft } from 'lucide-react';
import Button from '@/components/ui-legacy/button';
import { cn } from '@/lib/utils';
import { loadSystemConfig, saveSystemConfig, SYS_DEFAULTS as DEFAULTS, type SysConfig } from '@/lib/portal-config';

const FLAGS: { key: keyof SysConfig; label: string; desc: string }[] = [
  { key: 'aiSummary',     label: 'AI applicant summary',  desc: 'Generate the AI summary card on Candidate 360.' },
  { key: 'aiMatching',    label: 'AI project matching',   desc: 'Surface AI-assisted project-fit recommendations.' },
  { key: 'kineticScroll', label: 'Kinetic scroll motion', desc: 'The rubber-band overscroll effect across the app.' },
  { key: 'roleSwitcher',  label: 'Demo role switcher',    desc: 'Allow switching roles from the profile menu (demo only).' },
  { key: 'dceApproval',   label: 'DCE project approval',  desc: 'SCI flow: route reviewed project batches to the DCE for approval before the Approved List. Off = projects are approved after IO review.' },
  { key: 'categoryFormThumbnails', label: 'Category form preview thumbnails', desc: 'Programme form: show a thumbnail gallery of the assessment forms for the selected internship categories. Off = a Preview link sits beside each ticked category.' },
];
const PARAMS: { key: keyof SysConfig; label: string; desc: string; min: number; max: number; unit: string }[] = [
  { key: 'offerValidityDays', label: 'Default offer validity', desc: 'How long an extended offer stays open.',           min: 3,  max: 30, unit: 'days' },
  { key: 'maxProjectRanks',   label: 'Max project preferences', desc: 'Projects an applicant can rank in their application.', min: 1, max: 10, unit: 'projects' },
  { key: 'interviewMins',     label: 'Default interview length', desc: 'Pre-filled duration when scheduling interviews.',  min: 15, max: 90, unit: 'min' },
];

export default function SystemConfig() {
  const [cfg, setCfg] = useState<SysConfig>(DEFAULTS);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setCfg(loadSystemConfig()); }, []);

  function save() {
    saveSystemConfig(cfg);
    setSaved(true); setTimeout(() => setSaved(false), 6000);
  }

  return (
    <div className="space-y-5">
      {/* Feature switches */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="grid place-items-center w-8 h-8 rounded-lg bg-accent/10 text-accent shrink-0"><ToggleLeft size={16} /></span>
          <div>
            <h2 className="text-headline-md text-fg">Feature switches</h2>
            <p className="text-body-sm text-fg-muted">Turn portal capabilities on or off across all programmes.</p>
          </div>
        </div>
        <div className="divide-y divide-border border border-border rounded-xl overflow-hidden">
          {FLAGS.map(f => {
            const on = cfg[f.key] as boolean;
            return (
              <div key={f.key} className="flex items-center justify-between gap-4 px-4 py-3.5 hover:bg-bg-subtle/40">
                <div className="min-w-0">
                  <p className="text-body-md font-semibold text-fg">{f.label}</p>
                  <p className="text-body-sm text-fg-muted leading-snug">{f.desc}</p>
                </div>
                <button
                  role="switch" aria-checked={on} aria-label={f.label}
                  onClick={() => setCfg(c => ({ ...c, [f.key]: !on }))}
                  className={cn('relative w-11 h-6 rounded-full shrink-0 transition-colors', on ? 'bg-accent' : 'bg-border-strong')}
                >
                  <span className={cn('absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform', on && 'translate-x-5')} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Global parameters */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="grid place-items-center w-8 h-8 rounded-lg bg-accent/10 text-accent shrink-0"><Settings size={16} /></span>
          <div>
            <h2 className="text-headline-md text-fg">Global parameters</h2>
            <p className="text-body-sm text-fg-muted">Defaults applied across the lifecycle.</p>
          </div>
        </div>
        <div className="space-y-3">
          {PARAMS.map(p => {
            const val = cfg[p.key] as number;
            return (
              <div key={p.key} className="flex items-center justify-between gap-4 rounded-xl border border-border px-4 py-3">
                <div className="min-w-0">
                  <p className="text-body-md font-semibold text-fg">{p.label}</p>
                  <p className="text-body-sm text-fg-muted leading-snug">{p.desc}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="number" min={p.min} max={p.max} value={val}
                    aria-label={p.label}
                    onChange={e => setCfg(c => ({ ...c, [p.key]: Math.max(p.min, Math.min(p.max, Number(e.target.value) || p.min)) }))}
                    className="w-20 px-3 py-1.5 text-body-md font-semibold text-fg text-right border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                  <span className="text-body-sm text-fg-muted w-16">{p.unit}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        {saved && <span className="text-body-sm text-success font-medium">Configuration saved.</span>}
        <Button onClick={save}><Save size={16} />Save configuration</Button>
      </div>
    </div>
  );
}
