'use client';

/* Placement & slots — internship placement utilisation, aggregated from approved
   projects (slots filled vs total) by programme and by internship category. Read-only
   overview; per-project slot edits live in the Projects screen. */
import { useState, useEffect } from 'react';
import { LayoutGrid } from 'lucide-react';
import seed from '@/data/projects.json';
import { cn } from '@/lib/utils';
import { loadProjects, loadProgrammes } from '@/lib/storage';

interface Project { id: string; slots?: number; matched?: number; programme?: string; educationLevel?: string; status?: string }

function groupBy(projects: Project[], key: 'programme' | 'educationLevel') {
  const map = new Map<string, { filled: number; total: number }>();
  for (const p of projects) {
    const k = (p[key] || 'Unspecified').toString();
    const g = map.get(k) ?? { filled: 0, total: 0 };
    g.total += p.slots ?? 0; g.filled += p.matched ?? 0;
    map.set(k, g);
  }
  return Array.from(map.entries()).map(([label, v]) => ({ label, ...v })).sort((a, b) => b.total - a.total);
}

function Bar({ filled, total }: { filled: number; total: number }) {
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0;
  const cls = pct >= 100 ? 'bg-success' : pct >= 60 ? 'bg-accent' : 'bg-warning';
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full bg-bg-subtle overflow-hidden"><div className={cn('h-full rounded-full', cls)} style={{ width: `${pct}%` }} /></div>
      <span className="text-body-sm font-semibold text-fg tabular-nums w-16 text-right">{filled}/{total}</span>
    </div>
  );
}

export default function PlacementSlots() {
  const [projects, setProjects] = useState<Project[]>(seed as Project[]);
  const [progNames, setProgNames] = useState<Record<string, string>>({});
  useEffect(() => {
    try { setProjects(loadProjects()); } catch {}
    try {
      const progs = loadProgrammes();
      setProgNames(Object.fromEntries(progs.map(p => [p.id, p.title ?? p.id])));
    } catch {}
  }, []);

  const totalSlots = projects.reduce((n, p) => n + (p.slots ?? 0), 0);
  const totalFilled = projects.reduce((n, p) => n + (p.matched ?? 0), 0);
  const pct = totalSlots > 0 ? Math.round((totalFilled / totalSlots) * 100) : 0;
  const byProg = groupBy(projects, 'programme').map(g => ({ ...g, label: progNames[g.label] ?? g.label }));
  const byCat = groupBy(projects, 'educationLevel');

  return (
    <div className="space-y-5">
      {/* Overview */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="grid place-items-center w-8 h-8 rounded-lg bg-accent/10 text-accent shrink-0"><LayoutGrid size={16} /></span>
          <div><h2 className="text-headline-md text-fg">Placement utilisation</h2><p className="text-body-sm text-fg-muted">Across all approved projects this cycle.</p></div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[['Total slots', totalSlots], ['Filled', totalFilled], ['Utilisation', `${pct}%`]].map(([l, v]) => (
            <div key={l as string} className="rounded-xl border border-border p-4">
              <p className="text-headline-md font-extrabold text-fg tabular-nums">{v}</p>
              <p className="text-body-sm text-fg-muted">{l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* By programme */}
      <div className="card p-6">
        <h3 className="text-headline-sm font-bold text-fg mb-4">By programme</h3>
        <div className="space-y-3">
          {byProg.map(g => (
            <div key={g.label}><p className="text-body-sm font-semibold text-fg mb-1.5">{g.label}</p><Bar filled={g.filled} total={g.total} /></div>
          ))}
        </div>
      </div>

      {/* By category */}
      <div className="card p-6">
        <h3 className="text-headline-sm font-bold text-fg mb-4">By internship category</h3>
        <div className="space-y-3">
          {byCat.map(g => (
            <div key={g.label}><p className="text-body-sm font-semibold text-fg mb-1.5">{g.label}</p><Bar filled={g.filled} total={g.total} /></div>
          ))}
        </div>
        <p className="mt-4 text-[13px] text-fg-subtle">Adjust individual project slots from the Projects screen.</p>
      </div>
    </div>
  );
}
