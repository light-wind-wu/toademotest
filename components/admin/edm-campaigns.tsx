'use client';

/* EDM campaigns — outreach mailers to prospective applicants. List + create (demo,
   persisted to localStorage). Part of the Admin Settings console. */
import { useState, useEffect } from 'react';
import { Plus, Send, Mail, X } from 'lucide-react';
import Button from '@/components/ui-legacy/button';
import { cn } from '@/lib/utils';

const KEY = 'dsta_edm_campaigns';

interface Campaign { id: string; name: string; audience: string; status: 'Draft' | 'Scheduled' | 'Sent'; recipients: number; date: string }
const SEED: Campaign[] = [
  { id: 'EDM-001', name: 'University Internship 2026 — Open House', audience: 'NUS / NTU / SMU CS & Eng', status: 'Sent',      recipients: 4820, date: '2026-03-12' },
  { id: 'EDM-002', name: 'Polytechnic Final-Year Outreach',        audience: 'SP / NP / TP — IT & Eng',  status: 'Scheduled', recipients: 2140, date: '2026-06-20' },
  { id: 'EDM-003', name: 'Scholar Re-engagement',                  audience: 'Past DSTA scholars',       status: 'Draft',     recipients: 0,    date: '—' },
];
const STATUS_CLS: Record<Campaign['status'], string> = {
  Draft:     'bg-bg-subtle text-fg-muted border-border',
  Scheduled: 'bg-warning-bg text-warning border-warning/30',
  Sent:      'bg-success-bg text-success border-success/30',
};

export default function EdmCampaigns() {
  const [items, setItems] = useState<Campaign[]>(SEED);
  const [show, setShow] = useState(false);
  const [name, setName] = useState('');
  const [audience, setAudience] = useState('');

  useEffect(() => { try { const raw = localStorage.getItem(KEY); if (raw) setItems(JSON.parse(raw)); } catch {} }, []);
  function persist(next: Campaign[]) { setItems(next); try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {} }
  function add() {
    if (!name.trim()) return;
    persist([{ id: `EDM-${String(Date.now()).slice(-3)}`, name: name.trim(), audience: audience.trim() || 'All prospects', status: 'Draft', recipients: 0, date: '—' }, ...items]);
    setName(''); setAudience(''); setShow(false);
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <span className="grid place-items-center w-8 h-8 rounded-lg bg-accent/10 text-accent shrink-0"><Send size={16} /></span>
          <div>
            <h2 className="text-headline-md text-fg">EDM campaigns</h2>
            <p className="text-body-sm text-fg-muted">Outreach mailers to prospective applicants.</p>
          </div>
        </div>
        {!show && <Button variant="outline" onClick={() => setShow(true)}><Plus size={14} />New campaign</Button>}
      </div>

      {show && (
        <div className="border border-border rounded-xl p-4 bg-bg-subtle mb-4 space-y-3">
          <div className="flex items-center justify-between"><p className="text-label-sm text-fg font-semibold">New campaign</p><button onClick={() => setShow(false)} className="text-fg-muted hover:text-fg"><X size={14} /></button></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Campaign name" aria-label="Campaign name" className="px-3 py-2 text-body-sm border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30" />
            <input value={audience} onChange={e => setAudience(e.target.value)} placeholder="Audience (e.g. NUS CS)" aria-label="Audience" className="px-3 py-2 text-body-sm border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30" />
          </div>
          <Button onClick={add} disabled={!name.trim()}><Plus size={14} />Create draft</Button>
        </div>
      )}

      <div className="border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[560px]">
          <thead><tr className="border-b border-border bg-bg-subtle">
            <th className="px-4 py-3 text-label-sm text-fg font-semibold">Campaign</th>
            <th className="px-4 py-3 text-label-sm text-fg font-semibold">Audience</th>
            <th className="px-4 py-3 text-label-sm text-fg font-semibold">Recipients</th>
            <th className="px-4 py-3 text-label-sm text-fg font-semibold">Status</th>
            <th className="px-4 py-3 text-label-sm text-fg font-semibold">Date</th>
          </tr></thead>
          <tbody>
            {items.map(c => (
              <tr key={c.id} className="border-b border-border last:border-0 hover:bg-bg-subtle/40">
                <td className="px-4 py-3"><p className="text-body-sm font-medium text-fg flex items-center gap-2"><Mail size={13} className="text-fg-subtle" />{c.name}</p></td>
                <td className="px-4 py-3 text-body-sm text-fg-muted">{c.audience}</td>
                <td className="px-4 py-3 text-body-sm text-fg-muted tabular-nums">{c.recipients ? c.recipients.toLocaleString() : '—'}</td>
                <td className="px-4 py-3"><span className={cn('text-[12px] font-bold px-2.5 py-0.5 rounded-full border', STATUS_CLS[c.status])}>{c.status}</span></td>
                <td className="px-4 py-3 text-body-sm text-fg-muted tabular-nums">{c.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
