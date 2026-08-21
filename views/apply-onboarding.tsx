'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Shell from '@/components/layout/shell';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useRole } from '@/lib/role';
import {
  Landmark, ShieldCheck, Phone, ClipboardCheck, CheckCircle2,
  AlertCircle, ArrowLeft, Lock, Shirt, Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { addNotification } from '@/lib/notifications';
import type { Application } from '@/lib/types';
import applicationsSeed from '@/data/applications.json';

/* ── Storage (mirrors the other applicant views) ─────────────────────────── */
const IO_APPS_KEY     = 'dsta_applications';
const IO_APPS_VER_KEY = 'dsta_applications_seed_v';
const IO_APPS_VER     = '31';
const MY_APPS_KEY     = 'dsta_my_applications';

function loadIoApps(): Application[] {
  try {
    const ver = localStorage.getItem(IO_APPS_VER_KEY);
    if (ver !== IO_APPS_VER) return applicationsSeed as Application[];
    const r = localStorage.getItem(IO_APPS_KEY);
    return r ? (JSON.parse(r) as Application[]) : (applicationsSeed as Application[]);
  } catch { return applicationsSeed as Application[]; }
}
function saveIoApps(apps: Application[]) {
  localStorage.setItem(IO_APPS_KEY, JSON.stringify(apps));
  localStorage.setItem(IO_APPS_VER_KEY, IO_APPS_VER);
}

/* Statuses where the intern has accepted and can/should submit onboarding info. */
const ONBOARDING_STATUSES = new Set([
  'Offer Accepted', 'Active Intern', 'Internship Completed', 'Withdrawn', 'Terminated',
]);

const BANKS = [
  'DBS / POSB', 'OCBC', 'UOB', 'Standard Chartered', 'Citibank',
  'HSBC', 'Maybank', 'CIMB', 'Trust Bank', 'GXS Bank',
];
const RELATIONS = ['Parent', 'Guardian', 'Sibling', 'Spouse', 'Relative', 'Friend', 'Other'];
const SHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

/* ── Field helpers (match apply-profile.tsx) ─────────────────────────────── */
const inputCls  = 'w-full rounded-md border border-border bg-bg px-3 py-2 text-body-sm text-fg transition-colors focus:outline-none focus:ring-2 focus:ring-accent/40';
const selectCls = inputCls + ' appearance-none';

function Field({ label, required, children, hint }: { label: string; required?: boolean; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-[13px] font-bold uppercase tracking-widest text-fg-subtle mb-1.5">
        {label}{required && <span className="text-danger">*</span>}
      </label>
      {children}
      {hint && <p className="text-[12px] text-fg-subtle mt-1">{hint}</p>}
    </div>
  );
}

function SectionCard({ icon: Icon, title, sub, children }: { icon: typeof Landmark; title: string; sub?: string; children: React.ReactNode }) {
  return (
    <Card className="shadow-none">
      <CardContent className="p-6">
        <div className="mb-5 flex items-start gap-3">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-bg-muted text-accent">
            <Icon size={16} />
          </span>
          <div>
            <h2 className="text-headline-sm font-semibold leading-snug text-fg">{title}</h2>
            {sub && <p className="mt-0.5 text-body-sm text-fg-muted">{sub}</p>}
          </div>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

type Form = {
  bankName: string; bankAccountName: string; bankAccountNo: string;
  emergencyName: string; emergencyRelation: string; emergencyPhone: string;
  shirtSize: string; dietary: string;
  itPolicyAck: boolean; pdpaAck: boolean;
};

const EMPTY: Form = {
  bankName: 'DBS / POSB', bankAccountName: '', bankAccountNo: '',
  emergencyName: '', emergencyRelation: 'Parent', emergencyPhone: '',
  shirtSize: 'M', dietary: '',
  itPolicyAck: false, pdpaAck: false,
};

/* ── Read-only summary row ───────────────────────────────────────────────── */
function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-border last:border-0">
      <span className="text-body-sm text-fg-muted">{label}</span>
      <span className="text-body-sm font-medium text-fg text-right">{value || '—'}</span>
    </div>
  );
}

export default function ApplyOnboarding() {
  const { profile } = useRole();
  const router = useRouter();

  const [app,    setApp]    = useState<Application | null | 'loading'>('loading');
  const [form,   setForm]   = useState<Form>(EMPTY);
  const [tried,  setTried]  = useState(false);
  const [done,   setDone]   = useState(false);

  useEffect(() => {
    const apps  = loadIoApps();
    const mine  = apps.find(a => a.email === profile.email && ONBOARDING_STATUSES.has(a.status)) ?? null;
    setApp(mine);
    if (mine?.onboarding) {
      const o = mine.onboarding;
      setForm({
        bankName: o.bankName, bankAccountName: o.bankAccountName, bankAccountNo: o.bankAccountNo,
        emergencyName: o.emergencyName, emergencyRelation: o.emergencyRelation, emergencyPhone: o.emergencyPhone,
        shirtSize: o.shirtSize ?? 'M', dietary: o.dietary ?? '',
        itPolicyAck: o.itPolicyAck, pdpaAck: o.pdpaAck,
      });
    } else {
      // Pre-fill the account-holder name from the profile.
      setForm(f => ({ ...f, bankAccountName: profile.name }));
    }
  }, [profile.email, profile.name]);

  if (app === 'loading') return null;

  /* No accepted internship → nothing to onboard for. */
  if (!app) {
    return (
      <Shell activeRoute="/apply/onboarding">
        <div className="max-w-xl mx-auto card p-10 text-center mt-6">
          <ClipboardCheck size={36} className="text-fg-subtle mx-auto mb-3" />
          <h1 className="text-headline-md text-fg mb-1">Nothing to onboard yet</h1>
          <p className="text-body-md text-fg-muted mb-5">
            Onboarding opens once you&apos;ve accepted an internship offer.
          </p>
          <Button variant="ghost" onClick={() => router.push('/apply/dashboard')}>
            <ArrowLeft size={14} /> Back to home
          </Button>
        </div>
      </Shell>
    );
  }

  const submitted = !!app.onboarding;

  function update<K extends keyof Form>(key: K, val: Form[K]) {
    setForm(f => ({ ...f, [key]: val }));
  }

  const errors = {
    bankAccountName: !form.bankAccountName.trim(),
    bankAccountNo:   !/^\d{6,}$/.test(form.bankAccountNo.replace(/[\s-]/g, '')),
    emergencyName:   !form.emergencyName.trim(),
    emergencyPhone:  !/^\d{8}$/.test(form.emergencyPhone.replace(/[\s-]/g, '')),
    itPolicyAck:     !form.itPolicyAck,
    pdpaAck:         !form.pdpaAck,
  };
  const hasErrors = Object.values(errors).some(Boolean);

  function handleSubmit() {
    setTried(true);
    if (hasErrors || !app || app === 'loading') return;
    const onboarding: NonNullable<Application['onboarding']> = {
      submittedAt:       new Date().toISOString(),
      bankName:          form.bankName,
      bankAccountName:   form.bankAccountName.trim(),
      bankAccountNo:     form.bankAccountNo.replace(/[\s-]/g, ''),
      emergencyName:     form.emergencyName.trim(),
      emergencyRelation: form.emergencyRelation,
      emergencyPhone:    form.emergencyPhone.replace(/[\s-]/g, ''),
      shirtSize:         form.shirtSize,
      dietary:           form.dietary.trim() || undefined,
      itPolicyAck:       form.itPolicyAck,
      pdpaAck:           form.pdpaAck,
    };
    const apps = loadIoApps().map(a => a.id === app.id ? { ...a, onboarding } : a);
    saveIoApps(apps);
    setApp(a => (a && a !== 'loading') ? { ...a, onboarding } : a);
    addNotification({ forRole: 'io', title: `Onboarding submitted — ${app.name}`,
      body: `${app.name} has submitted onboarding information for ${app.programmeName}.`, href: '/applications', tier: 'info' });
    addNotification({ forRole: 'mentor', title: `Onboarding submitted — ${app.name}`,
      body: `${app.name} has completed onboarding and is ready to be activated.`, href: '/mentor/projects', tier: 'info' });
    setDone(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ── Submitted / success state ─────────────────────────────────────────── */
  if (submitted || done) {
    const o = app.onboarding!;
    const maskedAcct = o.bankAccountNo.length > 4
      ? '••••' + o.bankAccountNo.slice(-4) : o.bankAccountNo;
    return (
      <Shell activeRoute="/apply/onboarding">
        <div className="max-w-2xl mx-auto mt-4 space-y-5">
          <div className="card p-6 text-center bg-success-bg/40 border-success/30">
            <div className="w-14 h-14 rounded-full bg-success/10 border border-success/30 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 size={28} className="text-success" />
            </div>
            <h1 className="text-headline-lg text-fg mb-1">Onboarding submitted</h1>
            <p className="text-body-md text-fg-muted">
              Thanks, {profile.name.split(' ')[0]}. Your details are with the internship team.
              Your mentor will confirm onboarding to activate your internship.
            </p>
          </div>

          <div className="card p-5">
            <h2 className="text-headline-sm font-bold text-fg mb-4">What you submitted</h2>
            <SummaryRow label="Bank" value={o.bankName} />
            <SummaryRow label="Account holder" value={o.bankAccountName} />
            <SummaryRow label="Account number" value={maskedAcct} />
            <SummaryRow label="Emergency contact" value={`${o.emergencyName} (${o.emergencyRelation})`} />
            <SummaryRow label="Emergency phone" value={`+65 ${o.emergencyPhone}`} />
            <SummaryRow label="Polo-shirt size" value={o.shirtSize ?? '—'} />
            {o.dietary && <SummaryRow label="Dietary needs" value={o.dietary} />}
            <SummaryRow label="IT Acceptable Use Policy" value={o.itPolicyAck ? 'Acknowledged' : '—'} />
            <SummaryRow label="Data-protection consent"  value={o.pdpaAck ? 'Acknowledged' : '—'} />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => router.push('/apply/internship')}>Go to my internship</Button>
            <Button variant="ghost" onClick={() => router.push('/apply/dashboard')}>
              <ArrowLeft size={14} /> Back to home
            </Button>
          </div>
        </div>
      </Shell>
    );
  }

  /* ── Form ──────────────────────────────────────────────────────────────── */
  const err = (k: keyof typeof errors) => tried && errors[k];

  return (
    <Shell activeRoute="/apply/onboarding" flushTop>
      <div className="relative mx-[calc(-1*clamp(24px,2.6vw,40px))] min-h-[calc(100vh-64px)] bg-bg-subtle">
        <header className="bg-bg px-[clamp(24px,2.6vw,40px)] py-10">
          <div className="mx-auto w-full max-w-[1440px]">
            <button onClick={() => router.push('/apply/dashboard')}
              className="flex items-center gap-1.5 text-[14px] font-medium text-fg-muted transition-colors hover:text-fg">
              <ArrowLeft size={14} /> Back to home
            </button>

            <div className="mt-6">
              <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-fg-muted">Onboarding · Information required</p>
              <h1 className="mt-2 text-[34px] font-semibold leading-[42px] tracking-[-0.6px] text-fg">Onboarding information</h1>
              <p className="mt-3 max-w-2xl text-[15px] leading-6 text-fg-muted">
                A few details we need before you start <span className="font-medium text-fg">{app.programmeName}</span>.
                This replaces the paper forms — it takes about 3 minutes.
              </p>
            </div>
          </div>
        </header>

        <div className="mx-auto w-full max-w-[1440px] px-[clamp(24px,2.6vw,40px)] py-8">
          <div className="max-w-[960px]">
            <Alert variant="info" className="mb-5">
              <Lock aria-hidden />
              <AlertDescription>
                Your information is protected under IM8 and the PDPA, and is used only to set up your internship
                (allowance, emergency contact and access).
              </AlertDescription>
            </Alert>

            <div className="space-y-5">
          {/* Banking */}
          <SectionCard icon={Landmark} title="Allowance disbursement"
            sub="Where we credit your monthly internship allowance.">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Bank" required>
                <select className={selectCls} value={form.bankName} onChange={e => update('bankName', e.target.value)}>
                  {BANKS.map(b => <option key={b}>{b}</option>)}
                </select>
              </Field>
              <Field label="Account holder name" required>
                <input className={cn(inputCls, err('bankAccountName') && 'ring-2 ring-danger/40 border-danger/40')}
                  placeholder="As per bank records" value={form.bankAccountName}
                  onChange={e => update('bankAccountName', e.target.value)} />
                {err('bankAccountName') && <p className="text-[12px] text-danger mt-1">Required.</p>}
              </Field>
              <Field label="Account number" required>
                <input className={cn(inputCls, err('bankAccountNo') && 'ring-2 ring-danger/40 border-danger/40')}
                  inputMode="numeric" placeholder="e.g. 0123456789" value={form.bankAccountNo}
                  onChange={e => update('bankAccountNo', e.target.value)} />
                {err('bankAccountNo') && <p className="text-[12px] text-danger mt-1">Enter a valid account number (digits only).</p>}
              </Field>
            </div>
          </SectionCard>

          {/* Emergency contact */}
          <SectionCard icon={Phone} title="Emergency contact"
            sub="Someone we can reach if needed during your internship.">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Contact name" required>
                <input className={cn(inputCls, err('emergencyName') && 'ring-2 ring-danger/40 border-danger/40')}
                  placeholder="Full name" value={form.emergencyName}
                  onChange={e => update('emergencyName', e.target.value)} />
                {err('emergencyName') && <p className="text-[12px] text-danger mt-1">Required.</p>}
              </Field>
              <Field label="Relationship" required>
                <select className={selectCls} value={form.emergencyRelation} onChange={e => update('emergencyRelation', e.target.value)}>
                  {RELATIONS.map(r => <option key={r}>{r}</option>)}
                </select>
              </Field>
              <Field label="Contact number" required>
                <div className="flex">
                  <span className="flex items-center rounded-l-md border border-r-0 border-border bg-bg-muted px-3 text-body-sm text-fg-muted">+65</span>
                  <input className={cn('flex-1 rounded-l-none rounded-r-md border border-border bg-bg px-3 py-2 text-body-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent/40',
                    err('emergencyPhone') && 'ring-2 ring-danger/40 border-danger/40')}
                    inputMode="numeric" placeholder="9123 4567" value={form.emergencyPhone}
                    onChange={e => update('emergencyPhone', e.target.value)} />
                </div>
                {err('emergencyPhone') && <p className="text-[12px] text-danger mt-1">Enter an 8-digit number.</p>}
              </Field>
            </div>
          </SectionCard>

          {/* Logistics */}
          <SectionCard icon={Shirt} title="Pre-start logistics"
            sub="So we can prepare your welcome pack on day one.">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Polo-shirt size">
                <select className={selectCls} value={form.shirtSize} onChange={e => update('shirtSize', e.target.value)}>
                  {SHIRT_SIZES.map(s => <option key={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Dietary restrictions" hint="Leave blank if none.">
                <input className={inputCls} placeholder="e.g. Halal, vegetarian, allergies"
                  value={form.dietary} onChange={e => update('dietary', e.target.value)} />
              </Field>
            </div>
          </SectionCard>

          {/* Acknowledgements */}
          <SectionCard icon={ShieldCheck} title="Policy acknowledgements"
            sub="Required before your DSTA accounts and access can be set up.">
            <div className="space-y-3">
              <label className={cn('flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors',
                form.itPolicyAck ? 'bg-success-bg/40 border-success/30' : err('itPolicyAck') ? 'border-danger/40 bg-danger-bg/30' : 'border-border hover:bg-bg-subtle/60')}>
                <input type="checkbox" className="mt-0.5 accent-accent w-4 h-4 shrink-0"
                  checked={form.itPolicyAck} onChange={e => update('itPolicyAck', e.target.checked)} />
                <span className="text-body-sm text-fg">
                  I have read and agree to abide by the <span className="font-semibold">DSTA IT Acceptable Use Policy (IM8)</span>,
                  including the handling of classified and sensitive information.
                </span>
              </label>
              <label className={cn('flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors',
                form.pdpaAck ? 'bg-success-bg/40 border-success/30' : err('pdpaAck') ? 'border-danger/40 bg-danger-bg/30' : 'border-border hover:bg-bg-subtle/60')}>
                <input type="checkbox" className="mt-0.5 accent-accent w-4 h-4 shrink-0"
                  checked={form.pdpaAck} onChange={e => update('pdpaAck', e.target.checked)} />
                <span className="text-body-sm text-fg">
                  I consent to DSTA collecting and using the information above for the administration of my internship,
                  in accordance with the <span className="font-semibold">PDPA</span>.
                </span>
              </label>
            </div>
          </SectionCard>

          {tried && hasErrors && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-danger-bg border border-danger/20">
              <AlertCircle size={14} className="text-danger shrink-0 mt-0.5" />
              <p className="text-body-sm text-danger">Please complete the highlighted fields above.</p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pb-8 pt-1">
            <Button onClick={() => router.push('/apply/applicant-onboarding-requirement')}>
              <ClipboardCheck size={14} /> Continue onboarding
            </Button>
            <span className="flex items-center gap-1.5 text-[12px] text-fg-subtle">
              <Info size={12} /> You can review these details later from your internship page.
            </span>
          </div>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
