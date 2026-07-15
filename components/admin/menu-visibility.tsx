'use client';

/* Menu visibility — which rail sections each role sees. A role × section matrix,
   keyed by section id and persisted via the shared portal-config store, so the live
   rail (components/layout/ia-rail.tsx) reflects it immediately. */
import { useState, useEffect } from 'react';
import { Save, Check } from 'lucide-react';
import Button from '@/components/ui-legacy/button';
import { cn } from '@/lib/utils';
import { MENU_SECTIONS, MENU_ROLES, MENU_DEFAULTS, loadMenuVisibility, saveMenuVisibility } from '@/lib/portal-config';

export default function MenuVisibility() {
  const [vis, setVis] = useState<Record<string, string[]>>(MENU_DEFAULTS);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setVis(loadMenuVisibility()); }, []);

  const has = (role: string, secId: string) => (vis[role] ?? []).includes(secId);
  function toggle(role: string, secId: string) {
    setVis(v => {
      const cur = v[role] ?? [];
      return { ...v, [role]: cur.includes(secId) ? cur.filter(s => s !== secId) : [...cur, secId] };
    });
  }
  function save() { saveMenuVisibility(vis); setSaved(true); setTimeout(() => setSaved(false), 2500); }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-headline-md text-fg">Menu visibility</h2>
          <p className="text-body-sm text-fg-muted">Choose which rail sections each role sees. Dashboard stays on for everyone; changes apply to the live nav.</p>
        </div>
        {saved && <span className="text-body-sm text-success font-medium">Saved.</span>}
      </div>

      <div className="border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[560px]">
          <thead>
            <tr className="border-b border-border bg-bg-subtle">
              <th className="px-4 py-3 text-label-sm text-fg font-semibold">Role</th>
              {MENU_SECTIONS.map(s => <th key={s.id} className="px-3 py-3 text-label-sm text-fg font-semibold text-center">{s.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {MENU_ROLES.map(r => (
              <tr key={r.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 text-body-sm font-semibold text-fg whitespace-nowrap">{r.label}</td>
                {MENU_SECTIONS.map(s => {
                  const on = has(r.id, s.id);
                  const locked = s.id === 'dashboard';
                  return (
                    <td key={s.id} className="px-3 py-3 text-center">
                      <button
                        disabled={locked}
                        onClick={() => toggle(r.id, s.id)}
                        aria-label={`${r.label} can see ${s.label}`} aria-pressed={on}
                        className={cn('inline-grid place-items-center w-6 h-6 rounded-md border transition-colors',
                          on ? 'bg-accent border-accent text-white' : 'bg-surface border-border-strong text-transparent hover:border-accent',
                          locked && 'opacity-60 cursor-not-allowed')}
                      >
                        <Check size={14} />
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-end mt-4">
        <Button onClick={save}><Save size={16} />Save visibility</Button>
      </div>
    </div>
  );
}
