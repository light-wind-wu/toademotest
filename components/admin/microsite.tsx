'use client';

/* Microsite — the public landing site for the programme. Editable hero copy, section
   toggles and publish status (demo, persisted to localStorage). */
import { useState, useEffect } from 'react';
import { Save, ExternalLink, Globe } from 'lucide-react';
import Button from '@/components/ui-legacy/button';
import { cn } from '@/lib/utils';

const KEY = 'dsta_microsite';

interface Microsite {
  published: boolean;
  heroTitle: string;
  tagline: string;
  sections: Record<string, boolean>;
}
const SECTION_KEYS = [
  { key: 'about',        label: 'About DSTA',          desc: 'Mission, domains and what interns work on.' },
  { key: 'programmes',   label: 'Programmes',          desc: 'The open internship tracks and eligibility.' },
  { key: 'testimonials', label: 'Intern testimonials', desc: 'Quotes and stories from past interns.' },
  { key: 'faq',          label: 'FAQ',                 desc: 'Common questions about applying.' },
];
const DEFAULTS: Microsite = {
  published: true,
  heroTitle: 'Build what defends the nation.',
  tagline: 'Internships at DSTA — solve hard problems in defence technology alongside our engineers.',
  sections: { about: true, programmes: true, testimonials: true, faq: false },
};

export default function Microsite() {
  const [site, setSite] = useState<Microsite>(DEFAULTS);
  const [saved, setSaved] = useState(false);

  useEffect(() => { try { const raw = localStorage.getItem(KEY); if (raw) setSite({ ...DEFAULTS, ...JSON.parse(raw) }); } catch {} }, []);
  function save() { try { localStorage.setItem(KEY, JSON.stringify(site)); } catch {} setSaved(true); setTimeout(() => setSaved(false), 6000); }

  return (
    <div className="space-y-5">
      <div className="card p-6">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <span className="grid place-items-center w-8 h-8 rounded-lg bg-accent/10 text-accent shrink-0"><Globe size={16} /></span>
            <div>
              <h2 className="text-headline-md text-fg">Microsite</h2>
              <p className="text-body-sm text-fg-muted">The public landing site applicants see before they apply.</p>
            </div>
          </div>
          <span className={cn('inline-flex items-center gap-1.5 text-[12px] font-bold px-2.5 py-1 rounded-full border', site.published ? 'bg-success-bg text-success border-success/30' : 'bg-bg-subtle text-fg-muted border-border')}>
            <span className={cn('w-1.5 h-1.5 rounded-full', site.published ? 'bg-success' : 'bg-border-strong')} />{site.published ? 'Published' : 'Draft'}
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-label-sm text-fg-muted block mb-1.5">Hero title</label>
            <input aria-label="Hero title" value={site.heroTitle} onChange={e => setSite(s => ({ ...s, heroTitle: e.target.value }))} className="w-full px-3 py-2 text-body-md font-semibold border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30" />
          </div>
          <div>
            <label className="text-label-sm text-fg-muted block mb-1.5">Tagline</label>
            <textarea aria-label="Tagline" value={site.tagline} onChange={e => setSite(s => ({ ...s, tagline: e.target.value }))} rows={2} className="w-full px-3 py-2 text-body-sm border border-border rounded-lg bg-surface resize-none focus:outline-none focus:ring-2 focus:ring-accent/30" />
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" checked={site.published} onChange={e => setSite(s => ({ ...s, published: e.target.checked }))} className="accent-[rgb(var(--color-accent))] w-4 h-4" />
            <span className="text-body-sm text-fg">Microsite is publicly visible</span>
          </label>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-headline-sm font-bold text-fg mb-1">Sections</h3>
        <p className="text-body-sm text-fg-muted mb-4">Show or hide blocks on the public page.</p>
        <div className="divide-y divide-border border border-border rounded-xl overflow-hidden">
          {SECTION_KEYS.map(sec => {
            const on = !!site.sections[sec.key];
            return (
              <div key={sec.key} className="flex items-center justify-between gap-4 px-4 py-3.5 hover:bg-bg-subtle/40">
                <div className="min-w-0"><p className="text-body-md font-semibold text-fg">{sec.label}</p><p className="text-body-sm text-fg-muted">{sec.desc}</p></div>
                <button role="switch" aria-checked={on} aria-label={sec.label} onClick={() => setSite(s => ({ ...s, sections: { ...s.sections, [sec.key]: !on } }))}
                  className={cn('relative w-11 h-6 rounded-full shrink-0 transition-colors', on ? 'bg-accent' : 'bg-border-strong')}>
                  <span className={cn('absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform', on && 'translate-x-5')} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        {saved && <span className="text-body-sm text-success font-medium">Microsite saved.</span>}
        <Button variant="ghost" onClick={() => {}}><ExternalLink size={15} />Preview</Button>
        <Button onClick={save}><Save size={16} />Save microsite</Button>
      </div>
    </div>
  );
}
