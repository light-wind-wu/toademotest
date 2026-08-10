'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Shell from '@/components/layout/shell';
import { useRole } from '@/lib/role';
import { ShieldCheck, Save, AlertTriangle, RotateCcw, Users, UserPlus, Trash2, X, Zap, Mail, XCircle, Award, Sparkles, ChevronRight, Construction, ExternalLink } from 'lucide-react';
import { ADMIN_CATEGORIES, findAdminArea, type AdminArea } from '@/lib/admin-ia';
import SystemConfig from '@/components/admin/system-config';
import DropdownLists from '@/components/admin/dropdown-lists';
import SubjectTaxonomy from '@/components/admin/subject-taxonomy';
import MenuVisibility from '@/components/admin/menu-visibility';
import EdmCampaigns from '@/components/admin/edm-campaigns';
import Microsite from '@/components/admin/microsite';
import ApplicationForms from '@/components/admin/application-forms';
import FormBuilder from '@/components/admin/form-builder';
import PlacementSlots from '@/components/admin/placement-slots';
import CalendarOfficer from '@/components/admin/calendar-officer';
import Components from '@/components/admin/components';
import Playground from '@/components/admin/playground';
import DemoDataKvPanel from '@/components/admin/demo-data-kv';
import { clearAllCloudKv, pushAllSharedKeys } from '@/lib/cloud-store';
import { ensureCloudConfig } from '@/lib/supabase/client';
import { DISCIPLINE_SUBJECTS, STANDING_BANDS, DEFAULT_WEIGHTS } from '@/lib/scoring';
import Button from '@/components/ui-legacy/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import {
  ALL_REQUESTS, SUBMISSION_SEED, ALL_PROJECTS, DEFAULT_PROGRAMMES, PROJECT_SUBMISSION_COLUMNS,
} from '@/lib/data';
import {
  saveProgrammes, saveProjects, saveRequests, saveSubmissions,
  STORAGE_KEYS, SEED_VERSIONS,
} from '@/lib/storage';
import { PROGRAMMES_CHANGED_EVENT } from '@/lib/programme-context';
import appFormSeed  from '@/data/app-form-templates.json';
import emailSeed    from '@/data/email-templates.json';
import appsSeed     from '@/data/applications.json';

const ADMIN_SETTINGS_KEY = 'dsta_admin_settings';
const USERS_KEY           = 'dsta_io_users';

interface AdminSettings {
  autoRejectDelayDays:     number;
  welcomeLetterDaysBefore: number;
  cocDaysAfterCompletion:  number;
  dceProjectApprovalEnabled: boolean;
}

const DEFAULTS: AdminSettings = {
  autoRejectDelayDays:     3,
  welcomeLetterDaysBefore: 10,
  cocDaysAfterCompletion:  2,
  dceProjectApprovalEnabled: false,
};

/* ── User management ────────────────────────────────────────────────── */
type IORole = 'io-admin' | 'io';

interface IOUser {
  id:         string;
  name:       string;
  email:      string;
  role:       IORole;
  dept:       string;
  lastActive: string;
}

const SEED_USERS: IOUser[] = [
  { id: 'USR-001', name: 'James Wong',   email: 'jameswong@dsta.gov.sg',  role: 'io-admin', dept: 'P&C',           lastActive: '2026-05-28' },
  { id: 'USR-002', name: 'Zhang Wei',    email: 'zhangwei@dsta.gov.sg',   role: 'io-admin', dept: 'P&C',           lastActive: '2026-05-27' },
  { id: 'USR-003', name: 'Priya Nair',   email: 'priyanair@dsta.gov.sg',  role: 'io',       dept: 'Cybersecurity', lastActive: '2026-05-26' },
  { id: 'USR-004', name: 'Marcus Lim',   email: 'marcuslim@dsta.gov.sg',  role: 'io',       dept: 'AI & Data',     lastActive: '2026-05-25' },
  { id: 'USR-005', name: 'Sarah Tan',    email: 'saratan@dsta.gov.sg',    role: 'io',       dept: 'C2 Systems',    lastActive: '2026-05-22' },
];

function loadUsers(): IOUser[] {
  try {
    const s = localStorage.getItem(USERS_KEY);
    return s ? JSON.parse(s) : SEED_USERS;
  } catch { return SEED_USERS; }
}
function saveUsers(users: IOUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

const ROLE_CONFIG: Record<IORole, { label: string; color: string; perms: string[] }> = {
  'io-admin': {
    label: 'Admin',
    color: 'bg-accent/10 text-accent border-accent/20',
    perms: ['Dashboard', 'Programmes', 'Applications', 'Projects', 'Interns', 'Analytics', 'Proj Requests', 'Templates', 'Admin'],
  },
  'io': {
    label: 'Officer',
    color: 'bg-bg-subtle text-fg border-border',
    perms: ['Dashboard', 'Programmes', 'Applications', 'Projects', 'Interns', 'Analytics'],
  },
};

function loadSettings(): AdminSettings {
  try {
    const s = localStorage.getItem(ADMIN_SETTINGS_KEY);
    return s ? { ...DEFAULTS, ...JSON.parse(s) } : DEFAULTS;
  } catch { return DEFAULTS; }
}

function Card({ title, description, icon: Icon, children }: {
  title: string; description: string; icon: typeof ShieldCheck; children: React.ReactNode;
}) {
  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
          <Icon size={16} className="text-accent" />
        </div>
        <h2 className="text-headline-md text-fg">{title}</h2>
      </div>
      <p className="text-body-sm text-fg-muted mb-5 ml-11">{description}</p>
      {children}
    </div>
  );
}

function DceApprovalHubCard({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4 text-left transition-colors">
      <span className="grid place-items-center w-9 h-9 rounded-lg shrink-0 bg-accent/10 text-accent">
        <ShieldCheck size={17} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 flex-wrap">
          <span className="text-body-md font-semibold text-fg">DCE project approval</span>
          <span className={cn(
            'text-[11px] font-semibold',
            enabled ? 'text-success' : 'text-fg-subtle',
          )}>
            {enabled ? 'Enabled' : 'Disabled'}
          </span>
        </span>
        <span className="block text-body-sm text-fg-muted leading-snug mt-0.5">
          Example switch for routing IO-approved projects to DCE by email and system link.
        </span>
      </span>
      <Switch
        checked={enabled}
        onCheckedChange={(checked) => onToggle(Boolean(checked))}
        aria-label="Toggle DCE project approval"
      />
    </div>
  );
}

export default function AdminSettingsPage() {
  const { role } = useRole();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [settings, setSettings] = useState<AdminSettings>(DEFAULTS);
  const [saved, setSaved] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  // Active settings area — 'home' is the hub; otherwise an area id from lib/admin-ia.
  const [area, setArea] = useState<string>('home');
  useEffect(() => { const a = searchParams?.get('area'); if (a && findAdminArea(a)) setArea(a); }, [searchParams]);

  // Sub-rail navigation: route areas leave the console; others select an in-console area.
  function goArea(a: AdminArea) {
    if (a.dest.kind === 'route') { router.push(a.dest.route); return; }
    setArea(a.id);
  }

  // User management
  const [users,       setUsers]       = useState<IOUser[]>([]);
  const [showInvite,  setShowInvite]  = useState(false);
  const [inviteName,  setInviteName]  = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteDept,  setInviteDept]  = useState('');
  const [inviteRole,  setInviteRole]  = useState<IORole>('io');

  async function resetDemoData() {
    setResetting(true);
    setResetError(null);
    try {
      // 1) Wipe shared cloud KV first so other browsers / next hydrate start empty.
      await ensureCloudConfig();
      const wipe = await clearAllCloudKv();
      if (!wipe.ok) {
        setResetError(wipe.error ?? 'Failed to clear cloud KV');
        setResetting(false);
        return;
      }

      // 2) Clear all dsta_ keys, then write seed data back.
      Object.keys(localStorage).filter(k => k.startsWith('dsta_')).forEach(k => localStorage.removeItem(k));

      // Write all seed data back immediately. Reference stores (projects,
      // requests, submissions, programmes) reseed through @/lib/storage so their
      // version stamps stay in sync with the central source of truth.
      saveProjects(ALL_PROJECTS);
      localStorage.setItem(STORAGE_KEYS.projects.verKey,    SEED_VERSIONS.projects);
      saveRequests(ALL_REQUESTS);
      localStorage.setItem(STORAGE_KEYS.requests.verKey,    SEED_VERSIONS.requests);
      saveSubmissions(SUBMISSION_SEED);
      localStorage.setItem(STORAGE_KEYS.submissions.verKey, SEED_VERSIONS.submissions);
      localStorage.setItem('dsta_proj_template_columns',     JSON.stringify(PROJECT_SUBMISSION_COLUMNS));
      localStorage.setItem('dsta_proj_template_columns_seed_v', '13');
      localStorage.setItem('dsta_app_form_templates',        JSON.stringify(appFormSeed));
      localStorage.setItem('dsta_app_form_templates_seed_v', '23');
      localStorage.setItem('dsta_email_templates',           JSON.stringify(emailSeed));
      localStorage.setItem('dsta_email_templates_seed_v',    '9');
      saveProgrammes(DEFAULT_PROGRAMMES);
      localStorage.setItem(STORAGE_KEYS.programmes.verKey,  SEED_VERSIONS.programmes);
      localStorage.setItem('dsta_role',                      'io-admin');
      // Applications (IO pipeline) — seeded from file; new applicants start fresh
      localStorage.setItem('dsta_applications',              JSON.stringify(appsSeed));
      localStorage.setItem('dsta_applications_seed_v',       '30');
      // Applicant submissions — intentionally empty; populated only by the apply form
      localStorage.setItem('dsta_my_applications',           JSON.stringify([]));

      // 3) Push fresh seeds to cloud before reload (debounce would die on reload).
      await pushAllSharedKeys();

      // Notify ProgrammeContext to refresh from localStorage immediately
      window.dispatchEvent(new Event(PROGRAMMES_CHANGED_EVENT));

      window.location.reload();
    } catch (err) {
      setResetError(err instanceof Error ? err.message : 'Reset failed');
      setResetting(false);
    }
  }

  useEffect(() => {
    if (role !== 'io-admin') { router.replace('/dashboard'); return; }
    setSettings(loadSettings());
    setUsers(loadUsers());
  }, [role, router]);

  function changeUserRole(id: string, newRole: IORole) {
    const updated = users.map(u => u.id === id ? { ...u, role: newRole } : u);
    setUsers(updated);
    saveUsers(updated);
  }

  function removeUser(id: string) {
    const updated = users.filter(u => u.id !== id);
    setUsers(updated);
    saveUsers(updated);
  }

  function addUser() {
    if (!inviteName.trim() || !inviteEmail.trim()) return;
    const newUser: IOUser = {
      id:         `USR-${String(Date.now()).slice(-4)}`,
      name:       inviteName.trim(),
      email:      inviteEmail.trim(),
      role:       inviteRole,
      dept:       inviteDept.trim() || 'P&C',
      lastActive: '—',
    };
    const updated = [...users, newUser];
    setUsers(updated);
    saveUsers(updated);
    setShowInvite(false);
    setInviteName(''); setInviteEmail(''); setInviteDept(''); setInviteRole('io');
  }

  function save() {
    localStorage.setItem(ADMIN_SETTINGS_KEY, JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 6000);
  }

  function setDceProjectApprovalEnabled(enabled: boolean) {
    setSettings(current => {
      const next = { ...current, dceProjectApprovalEnabled: enabled };
      localStorage.setItem(ADMIN_SETTINGS_KEY, JSON.stringify(next));
      return next;
    });
  }

  if (role !== 'io-admin') return null;

  const adminCount   = users.filter(u => u.role === 'io-admin').length;
  const officerCount = users.filter(u => u.role === 'io').length;

  const activeArea = area === 'home' ? null : findAdminArea(area);
  const panel  = activeArea?.dest.kind === 'panel' ? activeArea.dest.panel : null;
  const isSoon = activeArea?.dest.kind === 'soon';

  return (
    <Shell activeRoute="/admin">
      {/* Header + breadcrumb */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-body-md mb-1">
          <button onClick={() => setArea('home')} className={cn('inline-flex items-center gap-1.5 transition-colors', area === 'home' ? 'text-fg font-bold' : 'text-fg-muted hover:text-accent')}>
            <ShieldCheck size={20} className="text-accent" />Admin Settings
          </button>
          {activeArea && <><ChevronRight size={14} className="shrink-0 text-fg-subtle" /><span className="text-fg font-bold">{activeArea.label}</span></>}
        </div>
        {activeArea && <p className="text-body-md text-fg-muted ml-[28px]">{activeArea.desc}</p>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[232px_minmax(0,1fr)] gap-6 items-start">

        {/* Settings sub-rail */}
        <nav className="hidden lg:block sticky top-[80px] space-y-4">
          {ADMIN_CATEGORIES.map(cat => (
            <div key={cat.id}>
              <p className="px-3 text-[11px] font-bold uppercase tracking-widest text-fg-subtle mb-1">{cat.label}</p>
              <div className="space-y-0.5">
                {cat.areas.map(a => {
                  const ActIcon = a.icon;
                  const active = area === a.id;
                  return (
                    <button key={a.id} onClick={() => goArea(a)}
                      className={cn('w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-left text-body-sm transition-colors',
                        active ? 'bg-accent/10 text-accent font-semibold' : 'text-fg-muted hover:bg-bg-subtle hover:text-fg')}>
                      <ActIcon size={15} className="shrink-0" /><span className="truncate">{a.label}</span>
                      {a.dest.kind === 'route' && <ExternalLink size={12} className="ml-auto shrink-0 opacity-60" />}
                      {a.dest.kind === 'soon' && <span className="ml-auto text-[10px] font-semibold text-fg-subtle">Soon</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Content */}
        <div className="min-w-0">

        {/* Hub overview */}
        {area === 'home' && (
          <div className="space-y-6">
            {ADMIN_CATEGORIES.map(cat => (
              <section key={cat.id}>
                <div className="mb-2.5">
                  <h2 className="text-headline-sm font-bold text-fg">{cat.label}</h2>
                  <p className="text-body-sm text-fg-muted">{cat.note}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {cat.areas.map(a => {
                    const ActIcon = a.icon;
                    const soon = a.dest.kind === 'soon';
                    return (
                      <button key={a.id} onClick={() => goArea(a)}
                        className={cn('group flex items-start gap-3 rounded-xl border border-border bg-surface p-4 text-left transition-colors', soon ? 'hover:border-border-strong' : 'hover:border-accent/40')}>
                        <span className={cn('grid place-items-center w-9 h-9 rounded-lg shrink-0', soon ? 'bg-bg-subtle text-fg-subtle' : 'bg-accent/10 text-accent')}><ActIcon size={17} /></span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2 flex-wrap">
                            <span className="text-body-md font-semibold text-fg">{a.label}</span>
                            {soon && <span className="text-[10px] font-bold uppercase tracking-wide text-fg-subtle bg-bg-subtle px-1.5 py-0.5 rounded">Soon</span>}
                            {a.meta && !soon && <span className="text-[11px] font-semibold text-fg-subtle">{a.meta}</span>}
                          </span>
                          <span className="block text-body-sm text-fg-muted leading-snug mt-0.5">{a.desc}</span>
                        </span>
                      </button>
                    );
                  })}
                  {cat.id === 'workflow' && (
                    <DceApprovalHubCard
                      enabled={settings.dceProjectApprovalEnabled}
                      onToggle={setDceProjectApprovalEnabled}
                    />
                  )}
                </div>
              </section>
            ))}
          </div>
        )}

        {/* Soon placeholder */}
        {isSoon && activeArea && (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
            <Construction size={32} className="text-fg-subtle mx-auto mb-3" />
            <p className="text-body-lg font-semibold text-fg mb-1">{activeArea.label}</p>
            <p className="text-body-md text-fg-muted max-w-md mx-auto">{activeArea.desc}</p>
            <p className="text-body-sm text-fg-subtle mt-3">This settings area is part of the IA and will be built in a later phase.</p>
          </div>
        )}

        {/* ── Users panel (Users + Roles) ──────────────────────────────── */}
        {panel === 'users' && (
        <div className="card p-6">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                <Users size={16} className="text-accent" />
              </div>
              <div>
                <h2 className="text-headline-md text-fg">User Accounts</h2>
                <p className="text-body-sm text-fg-muted">Manage portal access and permissions. Changes take effect on next login.</p>
              </div>
            </div>
            {/* Summary chips */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[13px] font-semibold px-2.5 py-1 rounded-full bg-accent/10 text-accent border border-accent/20">
                {adminCount} Admin{adminCount !== 1 ? 's' : ''}
              </span>
              <span className="text-[13px] font-semibold px-2.5 py-1 rounded-full bg-bg-subtle text-fg-muted border border-border">
                {officerCount} Officer{officerCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Role legend */}
          <div className="flex flex-wrap gap-3 mb-5">
            {(Object.entries(ROLE_CONFIG) as [IORole, typeof ROLE_CONFIG[IORole]][]).map(([key, cfg]) => (
              <div key={key} className="flex-1 min-w-[200px] border border-border rounded-xl p-3.5">
                <div className="flex items-center gap-2 mb-2">
                  <span className={cn('px-2 py-0.5 rounded-full text-[13px] font-bold border', cfg.color)}>{cfg.label}</span>
                  <span className="text-[13px] text-fg-muted">Access to:</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {cfg.perms.map(p => (
                    <span key={p} className="text-[12px] bg-bg-subtle text-fg-muted px-1.5 py-0.5 rounded">{p}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Users table */}
          <div className="border border-border rounded-xl overflow-hidden mb-4">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-bg-subtle">
                  <th className="px-4 py-3 text-label-sm text-fg font-semibold">Name</th>
                  <th className="px-4 py-3 text-label-sm text-fg font-semibold">Email</th>
                  <th className="px-4 py-3 text-label-sm text-fg font-semibold">Department</th>
                  <th className="px-4 py-3 text-label-sm text-fg font-semibold">Role</th>
                  <th className="px-4 py-3 text-label-sm text-fg font-semibold">Last Active</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const cfg = ROLE_CONFIG[u.role];
                  return (
                    <tr key={u.id} className="border-b border-border last:border-0 hover:bg-bg-subtle/50 group">
                      <td className="px-4 py-3">
                        <p className="text-body-sm text-fg font-medium">{u.name}</p>
                        <p className="text-[13px] text-fg-muted">{u.id}</p>
                      </td>
                      <td className="px-4 py-3 text-body-sm text-fg-muted">{u.email}</td>
                      <td className="px-4 py-3 text-body-sm text-fg-muted">{u.dept}</td>
                      <td className="px-4 py-3">
                        <select
                          value={u.role}
                          onChange={e => changeUserRole(u.id, e.target.value as IORole)}
                          className={cn(
                            'text-[13px] font-bold px-2.5 py-1 rounded-full border focus:outline-none focus:ring-2 focus:ring-accent/30 bg-transparent cursor-pointer',
                            cfg.color
                          )}
                        >
                          <option value="io-admin">Admin</option>
                          <option value="io">Officer</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-body-sm text-fg-muted">{u.lastActive}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => removeUser(u.id)}
                          className="text-fg-muted hover:text-danger transition-colors p-1 rounded opacity-0 group-hover:opacity-100"
                          title="Remove user"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Invite form */}
          {showInvite ? (
            <div className="border border-border rounded-xl p-4 space-y-3 bg-bg-subtle">
              <div className="flex items-center justify-between mb-1">
                <p className="text-label-sm text-fg font-semibold">Invite New User</p>
                <button onClick={() => setShowInvite(false)} className="text-fg-muted hover:text-fg"><X size={14} /></button>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="text-label-sm text-fg-muted block mb-1">Full Name</label>
                  <input
                    value={inviteName} onChange={e => setInviteName(e.target.value)}
                    placeholder="e.g. Lee Jun Wei"
                    className="w-full px-3 py-2 text-body-sm border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
                <div>
                  <label className="text-label-sm text-fg-muted block mb-1">Work Email</label>
                  <input
                    value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                    placeholder="name@dsta.gov.sg"
                    className="w-full px-3 py-2 text-body-sm border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
                <div>
                  <label className="text-label-sm text-fg-muted block mb-1">Department</label>
                  <input
                    value={inviteDept} onChange={e => setInviteDept(e.target.value)}
                    placeholder="e.g. Cybersecurity"
                    className="w-full px-3 py-2 text-body-sm border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
                <div>
                  <label className="text-label-sm text-fg-muted block mb-1">Role</label>
                  <select
                    value={inviteRole} onChange={e => setInviteRole(e.target.value as IORole)}
                    className="w-full px-3 py-2 text-body-sm border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30"
                  >
                    <option value="io">Officer</option>
                    <option value="io-admin">Admin</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Button onClick={addUser} disabled={!inviteName.trim() || !inviteEmail.trim()}>
                  <UserPlus size={14} />Send Invite
                </Button>
                <Button variant="ghost" onClick={() => setShowInvite(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" onClick={() => setShowInvite(true)}>
              <UserPlus size={14} />Invite User
            </Button>
          )}
        </div>
        )}

        {/* ── Suitability scoring panel ─────────────────────────────────── */}
        {panel === 'scoring' && (
        <div className="mb-5">
          <Card
            title="Suitability Scoring"
            description="Reference data the matching engine uses to score applicants against projects. Admin-maintained — editable per programme in the production build."
            icon={Sparkles}
          >
            {/* Default weights */}
            <div className="mb-5">
              <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle mb-2">Default factor weights</p>
              <div className="flex flex-wrap gap-2">
                {[['Discipline of study', DEFAULT_WEIGHTS.discipline], ['Skills', DEFAULT_WEIGHTS.skills], ['Standing', DEFAULT_WEIGHTS.standing]].map(([l, w]) => (
                  <span key={l as string} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-accent/10 text-accent border border-accent/20 text-body-sm font-semibold">
                    {l} <span className="font-black">{w}%</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Standing bands */}
            <div className="mb-5">
              <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle mb-2">Academic standing bands</p>
              <p className="text-body-sm text-fg-muted mb-2">Grades / GPA are normalised within each school system, then mapped to a band:</p>
              <div className="flex flex-wrap gap-2">
                {STANDING_BANDS.map(b => (
                  <div key={b.label} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-bg-subtle border border-border">
                    <span className="text-body-sm font-semibold text-fg">{b.label}</span>
                    <span className="text-body-sm font-black text-accent tabular-nums">{b.score}</span>
                    <span className="text-[12px] text-fg-subtle">· {b.from}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Discipline → subject dictionary */}
            <div>
              <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle mb-2">Discipline → subject dictionary</p>
              <p className="text-body-sm text-fg-muted mb-3">Translates a project&apos;s required discipline into the subjects that matter, so subject-based applicants (JC / IB / NUS High) can be matched. Number = how much each subject counts.</p>
              <div className="divide-y divide-border border border-border rounded-xl overflow-hidden">
                {Object.entries(DISCIPLINE_SUBJECTS).map(([disc, subs]) => (
                  <div key={disc} className="flex items-start gap-3 px-3 py-2.5 hover:bg-bg-subtle/50">
                    <span className="text-body-sm font-semibold text-fg capitalize w-44 shrink-0">{disc}</span>
                    <span className="text-fg-subtle shrink-0">→</span>
                    <div className="flex flex-wrap gap-1.5">
                      {subs.map(s => (
                        <span key={s.subject} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-bg-subtle border border-border text-[12px] text-fg-muted capitalize">
                          {s.subject} <span className="text-fg-subtle">×{s.weight}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
        )}

        {/* ── Automation & reminders panel ──────────────────────────────── */}
        {panel === 'automation' && (
          <Card
            title="Automated Communications"
            description="System emails are triggered automatically based on these rules. Changes apply to all active programmes immediately."
            icon={Zap}
          >
            <div className="space-y-4">

              {/* Rule rows */}
              {[
                {
                  icon: XCircle,
                  iconCls: 'text-danger',
                  trigger: 'Application screened ineligible',
                  action:  'Send rejection notification',
                  timing:  'after',
                  options: [1, 2, 3, 5, 7],
                  value:   settings.autoRejectDelayDays,
                  onChange: (n: number) => setSettings(s => ({ ...s, autoRejectDelayDays: n })),
                  hint: 'Holds the rejection email so candidates don\'t receive an instant automated-feeling response.',
                },
                {
                  icon: Mail,
                  iconCls: 'text-accent',
                  trigger: 'Internship start date approaching',
                  action:  'Send welcome letter to intern',
                  timing:  'before',
                  options: [5, 7, 10, 14],
                  value:   settings.welcomeLetterDaysBefore,
                  onChange: (n: number) => setSettings(s => ({ ...s, welcomeLetterDaysBefore: n })),
                  hint: 'IO can still send manually at any time (e.g. early request for reservist deferment).',
                },
                {
                  icon: Award,
                  iconCls: 'text-success',
                  trigger: 'Internship marked as Completed',
                  action:  'Issue Certificate of Completion',
                  timing:  'after',
                  options: [0, 1, 2, 3],
                  value:   settings.cocDaysAfterCompletion,
                  onChange: (n: number) => setSettings(s => ({ ...s, cocDaysAfterCompletion: n })),
                  hint: 'Intern can download the CoC from their portal once issued. IO can re-issue manually.',
                },
              ].map(rule => (
                <div key={rule.trigger} className="rounded-xl border border-border overflow-hidden">
                  <div className="px-4 py-3 bg-bg-subtle border-b border-border flex items-center gap-2.5">
                    <rule.icon size={14} className={rule.iconCls} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle">Trigger</p>
                      <p className="text-body-sm font-semibold text-fg">{rule.trigger}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle">Action</p>
                      <p className="text-body-sm font-medium text-fg">{rule.action}</p>
                    </div>
                  </div>
                  <div className="px-4 py-3 flex items-center gap-3">
                    <span className="text-body-sm text-fg-muted shrink-0">
                      {rule.timing === 'after' ? 'Delay:' : 'Trigger:'}
                    </span>
                    <div className="flex items-center border border-border rounded-xl overflow-hidden">
                      {rule.options.map(n => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => rule.onChange(n)}
                          className={cn(
                            'px-3.5 py-1.5 text-body-sm font-semibold transition-colors border-r border-border last:border-0',
                            rule.value === n
                              ? 'bg-accent text-accent-fg'
                              : 'bg-surface text-fg-muted hover:bg-bg-subtle'
                          )}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                    <span className="text-body-sm text-fg-muted shrink-0">
                      {rule.value === 0
                        ? 'same day'
                        : `working days ${rule.timing === 'after' ? (rule.trigger.includes('Completed') ? 'after completion' : 'after screening') : 'before start date'}`
                      }
                    </span>
                  </div>
                  {rule.hint && (
                    <p className="px-4 pb-3 text-[13px] text-fg-subtle">{rule.hint}</p>
                  )}
                </div>
              ))}

              <div className="flex items-center justify-end gap-3 pt-1">
                {saved && <span className="text-body-sm text-success font-medium">Settings saved.</span>}
                <Button onClick={save}><Save size={16} />Save Changes</Button>
              </div>
            </div>
          </Card>
        )}

        {/* ── Reset demo data panel ─────────────────────────────────────── */}
        {panel === 'reset' && (
          <div className="space-y-4">
            <Card
              title="Reset Demo Data"
              description="Clears cloud KV and local data, then reseeds everything from the original seed files. Use this to restart the full demo flow from scratch."
              icon={RotateCcw}
            >
              <div className="space-y-4">
                <div className="flex items-start gap-2.5 px-3 py-2.5 bg-danger-bg border border-danger/30 rounded-xl">
                  <AlertTriangle size={15} className="text-danger mt-0.5 shrink-0" />
                  <p className="text-body-sm text-fg-muted">
                    This wipes the Supabase <code className="text-[12px]">app_kv</code> list first, then erases
                    local requests, submissions, project approvals, and any changes you&apos;ve made. Fresh seed
                    data is written back to local storage and cloud. The page will reload automatically.
                  </p>
                </div>
                {resetError && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-danger/30 bg-danger-bg px-3 py-2.5">
                    <AlertTriangle size={15} className="mt-0.5 shrink-0 text-danger" />
                    <p className="text-body-sm text-fg-muted">{resetError}</p>
                  </div>
                )}
                {!confirmReset ? (
                  <Button
                    variant="outline"
                    onClick={() => { setConfirmReset(true); setResetError(null); }}
                    disabled={resetting}
                    className="border-danger/40 text-danger hover:bg-danger-bg"
                  >
                    <RotateCcw size={15} />Reset All Demo Data
                  </Button>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="text-body-sm text-fg-muted">
                      {resetting ? 'Resetting…' : 'Are you sure?'}
                    </span>
                    <Button
                      onClick={() => void resetDemoData()}
                      disabled={resetting}
                      className="bg-danger hover:bg-danger/90 border-danger"
                    >
                      <RotateCcw size={15} className={cn(resetting && 'animate-spin')} />
                      Yes, Reset Everything
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setConfirmReset(false)}
                      disabled={resetting}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </Card>

            <DemoDataKvPanel />
          </div>
        )}

        {/* ── System configuration panel ────────────────────────────────── */}
        {panel === 'sysconfig' && <SystemConfig />}

        {/* ── Recognised-subject taxonomy panel (TOA-068) ───────────────── */}
        {panel === 'taxonomy' && <SubjectTaxonomy />}

        {/* ── Dropdown lists panel ──────────────────────────────────────── */}
        {panel === 'dropdowns' && <DropdownLists />}

        {/* ── Newly-built settings panels ───────────────────────────────── */}
        {panel === 'menu'      && <MenuVisibility />}
        {panel === 'edm'       && <EdmCampaigns />}
        {panel === 'microsite' && <Microsite />}
        {panel === 'forms'      && <ApplicationForms />}
        {panel === 'formbuilder' && <FormBuilder />}
        {panel === 'placement' && <PlacementSlots />}
        {panel === 'calendar'  && <CalendarOfficer />}

        {/* ── Components panel ──────────────────────────────────────── */}
        {panel === 'components' && <Components />}

        {/* ── Playground panel ──────────────────────────────────────── */}
        {panel === 'playground' && <Playground />}

        </div>{/* content */}
      </div>{/* console grid */}
    </Shell>
  );
}
