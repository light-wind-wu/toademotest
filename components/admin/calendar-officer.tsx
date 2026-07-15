'use client';

/* Calendar & officer hours — weekly officer consultation hours + public holidays the
   scheduler blocks out. Persisted to localStorage (demo). */
import { useState, useEffect } from 'react';
import { Save, Plus, X, Clock, CalendarDays } from 'lucide-react';
import Button from '@/components/ui-legacy/button';
import { cn } from '@/lib/utils';

const KEY = 'dsta_officer_calendar';
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;

interface OfficerHours { open: boolean; from: string; to: string }
interface Holiday { date: string; name: string }
interface CalData { hours: Record<string, OfficerHours>; holidays: Holiday[] }

const DEFAULTS: CalData = {
  hours: Object.fromEntries(DAYS.map(d => [d, { open: d !== 'Wednesday', from: '14:00', to: '17:00' }])),
  holidays: [
    { date: '2026-05-01', name: 'Labour Day' },
    { date: '2026-05-12', name: 'Vesak Day' },
    { date: '2026-08-09', name: 'National Day' },
  ],
};

export default function CalendarOfficer() {
  const [data, setData] = useState<CalData>(DEFAULTS);
  const [saved, setSaved] = useState(false);
  const [hDate, setHDate] = useState('');
  const [hName, setHName] = useState('');

  useEffect(() => { try { const raw = localStorage.getItem(KEY); if (raw) setData({ ...DEFAULTS, ...JSON.parse(raw) }); } catch {} }, []);
  function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {} setSaved(true); setTimeout(() => setSaved(false), 2500); }
  function setDay(day: string, patch: Partial<OfficerHours>) { setData(d => ({ ...d, hours: { ...d.hours, [day]: { ...d.hours[day], ...patch } } })); }
  function addHoliday() { if (!hDate || !hName.trim()) return; setData(d => ({ ...d, holidays: [...d.holidays, { date: hDate, name: hName.trim() }].sort((a, b) => a.date.localeCompare(b.date)) })); setHDate(''); setHName(''); }
  function removeHoliday(date: string) { setData(d => ({ ...d, holidays: d.holidays.filter(h => h.date !== date) })); }

  return (
    <div className="space-y-5">
      {/* Officer hours */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="grid place-items-center w-8 h-8 rounded-lg bg-accent/10 text-accent shrink-0"><Clock size={16} /></span>
          <div><h2 className="text-headline-md text-fg">Officer consultation hours</h2><p className="text-body-sm text-fg-muted">Weekly windows when applicants can book time with an officer.</p></div>
        </div>
        <div className="divide-y divide-border border border-border rounded-xl overflow-hidden">
          {DAYS.map(day => {
            const h = data.hours[day];
            return (
              <div key={day} className="flex items-center gap-4 px-4 py-3">
                <button role="switch" aria-checked={h.open} aria-label={`${day} open`} onClick={() => setDay(day, { open: !h.open })}
                  className={cn('relative w-11 h-6 rounded-full shrink-0 transition-colors', h.open ? 'bg-accent' : 'bg-border-strong')}>
                  <span className={cn('absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform', h.open && 'translate-x-5')} />
                </button>
                <span className="text-body-md font-semibold text-fg w-28">{day}</span>
                {h.open ? (
                  <div className="flex items-center gap-2">
                    <input type="time" aria-label={`${day} hours from`} value={h.from} onChange={e => setDay(day, { from: e.target.value })} className="px-2 py-1.5 text-body-sm border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30" />
                    <span className="text-fg-subtle">–</span>
                    <input type="time" aria-label={`${day} hours to`} value={h.to} onChange={e => setDay(day, { to: e.target.value })} className="px-2 py-1.5 text-body-sm border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30" />
                  </div>
                ) : <span className="text-body-sm text-fg-subtle italic">Closed</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Public holidays */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="grid place-items-center w-8 h-8 rounded-lg bg-accent/10 text-accent shrink-0"><CalendarDays size={16} /></span>
          <div><h3 className="text-headline-sm font-bold text-fg">Public holidays</h3><p className="text-body-sm text-fg-muted">Dates the scheduler blocks out for interviews and bookings.</p></div>
        </div>
        <div className="space-y-2 mb-4">
          {data.holidays.map(h => (
            <div key={h.date} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
              <span className="text-body-sm font-semibold text-fg tabular-nums w-28">{h.date}</span>
              <span className="text-body-sm text-fg-muted flex-1 min-w-0 truncate">{h.name}</span>
              <button onClick={() => removeHoliday(h.date)} aria-label={`Remove ${h.name}`} className="text-fg-muted hover:text-danger transition-colors p-1"><X size={14} /></button>
            </div>
          ))}
          {data.holidays.length === 0 && <p className="text-body-sm text-fg-subtle italic">No holidays added.</p>}
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={hDate} onChange={e => setHDate(e.target.value)} aria-label="Holiday date" className="px-3 py-2 text-body-sm border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30" />
          <input value={hName} onChange={e => setHName(e.target.value)} placeholder="Holiday name" aria-label="Holiday name" className="flex-1 px-3 py-2 text-body-sm border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30" />
          <Button onClick={addHoliday} disabled={!hDate || !hName.trim()}><Plus size={15} />Add</Button>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        {saved && <span className="text-body-sm text-success font-medium">Calendar saved.</span>}
        <Button onClick={save}><Save size={16} />Save calendar</Button>
      </div>
    </div>
  );
}
