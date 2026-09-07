'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  FileUp,
  Landmark,
  ShieldCheck,
  Smartphone,
  UserRound,
} from 'lucide-react';
import Shell from '@/components/layout/shell';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  APPLICANT_ONBOARDING_DRAFT_SEED,
  loadApplicantOnboardingDraft,
  saveApplicantOnboardingDraft,
} from '@/lib/applicant-onboarding';
import type { ApplicantOnboardingDraft, ApplicantOnboardingTaskId } from '@/lib/types';
import { cn } from '@/lib/utils';

const BANKS = ['DBS / POSB', 'OCBC', 'UOB', 'Standard Chartered', 'Citibank', 'HSBC', 'Maybank', 'CIMB'];

const bankSchema = z.object({
  bankName: z.string().trim().min(1, 'Select a bank.'),
  bankAccountNumber: z.string().trim().regex(/^\d{6,20}$/, 'Enter 6–20 digits without spaces or symbols.'),
  bankAccountHolderName: z.string().trim().min(2, 'Enter the account holder name.'),
  bankSupportingDocumentName: z.string().trim().min(1, 'Upload a bank supporting document.'),
});

const additionalSchema = z.object({
  profilePhotographRequired: z.boolean(),
  profilePhotographName: z.string(),
  bringingMobileDevice: z.boolean(),
  mobileDeviceImeiNumber: z.string(),
}).superRefine((value, context) => {
  if (value.profilePhotographRequired && !value.profilePhotographName.trim()) {
    context.addIssue({ code: 'custom', path: ['profilePhotographName'], message: 'Upload a profile photograph.' });
  }
  if (value.bringingMobileDevice && !/^\d{15}$/.test(value.mobileDeviceImeiNumber.trim())) {
    context.addIssue({ code: 'custom', path: ['mobileDeviceImeiNumber'], message: 'Enter the 15-digit IMEI number.' });
  }
});

const declarationSchema = z.object({
  mobileDeclarationAccepted: z.literal(true, { error: 'Accept the Mobile Declaration.' }),
  acceptableUsePolicyAccepted: z.literal(true, { error: 'Acknowledge the Acceptable Use Policy.' }),
});

const TASKS: Array<{
  id: ApplicantOnboardingTaskId;
  title: string;
  description: string;
  icon: typeof Landmark;
}> = [
  { id: 'bank', title: 'Bank information', description: 'Allowance payment details and supporting document', icon: Landmark },
  { id: 'additional', title: 'Additional information', description: 'Conditional photo and mobile device details', icon: UserRound },
  { id: 'declarations', title: 'Declarations', description: 'Required policy acknowledgements', icon: ShieldCheck },
];

type FieldErrors = Record<string, string>;

function issuesToErrors(issues: z.ZodIssue[]): FieldErrors {
  return Object.fromEntries(issues.map((issue) => [String(issue.path[0]), issue.message]));
}

export default function ApplicantOnboardingRequirementPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<ApplicantOnboardingDraft>({ ...APPLICANT_ONBOARDING_DRAFT_SEED, completedTasks: [] });
  const [activeTask, setActiveTask] = useState<ApplicantOnboardingTaskId>('bank');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = loadApplicantOnboardingDraft();
    setDraft(stored);
    const firstIncomplete = TASKS.find((task) => !stored.completedTasks.includes(task.id));
    setActiveTask(firstIncomplete?.id ?? 'bank');
    setReady(true);
  }, []);

  const completedCount = draft.completedTasks.length;
  const allTasksComplete = completedCount === TASKS.length;
  const activeIndex = TASKS.findIndex((task) => task.id === activeTask);
  const activeTaskConfig = TASKS[activeIndex];

  const progressLabel = useMemo(
    () => allTasksComplete ? 'All requirements completed' : `${completedCount} of ${TASKS.length} tasks completed`,
    [allTasksComplete, completedCount],
  );

  function update<K extends keyof ApplicantOnboardingDraft>(key: K, value: ApplicantOnboardingDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function saveTask() {
    const result = activeTask === 'bank'
      ? bankSchema.safeParse(draft)
      : activeTask === 'additional'
        ? additionalSchema.safeParse(draft)
        : declarationSchema.safeParse(draft);

    if (!result.success) {
      setErrors(issuesToErrors(result.error.issues));
      return;
    }

    const completedTasks = draft.completedTasks.includes(activeTask)
      ? draft.completedTasks
      : [...draft.completedTasks, activeTask];
    const nextDraft = { ...draft, completedTasks, updatedAt: new Date().toISOString() };
    setDraft(nextDraft);
    saveApplicantOnboardingDraft(nextDraft);
    setErrors({});

    const nextTask = TASKS.slice(activeIndex + 1).find((task) => !completedTasks.includes(task.id));
    if (nextTask) setActiveTask(nextTask.id);
  }

  function saveAndExit() {
    saveApplicantOnboardingDraft({ ...draft, updatedAt: new Date().toISOString() });
    router.push('/apply/onboarding');
  }

  if (!ready) return null;

  return (
    <Shell activeRoute="/apply/internship" flushTop>
      <div className="relative mx-[calc(-1*clamp(24px,2.6vw,40px))] min-h-[calc(100vh-64px)] bg-bg-subtle">
        <header className="border-b border-border bg-bg px-[clamp(24px,2.6vw,40px)] py-8 sm:py-10">
          <div className="mx-auto w-full max-w-[1200px]">
            <button type="button" onClick={() => router.push('/apply/onboarding')} className="inline-flex items-center gap-2 text-[14px] font-medium text-fg-muted transition-colors hover:text-fg">
              <ArrowLeft className="size-4" aria-hidden />
              Onboarding requirements
            </button>
            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-fg-muted">Onboarding · Checklist</p>
                <h1 className="mt-2 text-[34px] font-semibold leading-[42px] tracking-[-0.6px] text-fg">Complete your onboarding</h1>
                <p className="mt-3 max-w-2xl text-[15px] leading-6 text-fg-muted">Complete all three tasks so the internship team can prepare your allowance, access and first-day arrangements.</p>
              </div>
              <Badge variant={allTasksComplete ? 'success' : 'warning'} className="w-fit">{progressLabel}</Badge>
            </div>
          </div>
        </header>

        <div className="mx-auto w-full max-w-[1200px] px-[clamp(24px,2.6vw,40px)] py-8">
          <ol className="grid gap-3 lg:grid-cols-3" aria-label="Onboarding tasks">
            {TASKS.map((task, index) => {
              const completed = draft.completedTasks.includes(task.id);
              const selected = activeTask === task.id;
              const Icon = task.icon;
              return (
                <li key={task.id}>
                  <button
                    type="button"
                    onClick={() => { setActiveTask(task.id); setErrors({}); }}
                    aria-current={selected ? 'step' : undefined}
                    className={cn(
                      'flex h-full w-full items-start gap-3 rounded-xl border bg-surface p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                      selected ? 'border-accent' : 'border-border hover:border-border-strong',
                    )}
                  >
                    <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-full', completed ? 'bg-success-bg text-success' : selected ? 'bg-accent text-accent-fg' : 'bg-bg-muted text-fg-muted')}>
                      {completed ? <Check className="size-4" aria-hidden /> : <Icon className="size-4" aria-hidden />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-[14px] font-semibold text-fg">{index + 1}. {task.title}</span>
                        <Badge variant={completed ? 'success' : selected ? 'info' : 'subtle'}>{completed ? 'Completed' : selected ? 'In progress' : 'Not started'}</Badge>
                      </span>
                      <span className="mt-1 block text-[12px] leading-4 text-fg-muted">{task.description}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
            <Card className="shadow-none">
              <CardHeader className="border-b border-border">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[12px] font-medium text-fg-muted">Task {activeIndex + 1} of {TASKS.length}</p>
                    <CardTitle className="mt-1 text-[20px]">{activeTaskConfig.title}</CardTitle>
                  </div>
                  {draft.completedTasks.includes(activeTask) ? <Badge variant="success">Saved</Badge> : null}
                </div>
              </CardHeader>
              <CardContent className="p-5 sm:p-6">
                {activeTask === 'bank' ? (
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field invalid={Boolean(errors.bankName)}>
                      <FieldLabel>Bank Name <span className="text-danger">*</span></FieldLabel>
                      <Select value={draft.bankName} onValueChange={(value) => update('bankName', value ?? '')}>
                        <SelectTrigger className="mt-2" aria-label="Bank Name"><SelectValue placeholder="Select bank" /></SelectTrigger>
                        <SelectContent>{BANKS.map((bank) => <SelectItem key={bank} value={bank}>{bank}</SelectItem>)}</SelectContent>
                      </Select>
                      {errors.bankName ? <FieldError>{errors.bankName}</FieldError> : null}
                    </Field>
                    <Field invalid={Boolean(errors.bankAccountHolderName)}>
                      <FieldLabel htmlFor="bank-account-holder-name">Bank Account Holder Name <span className="text-danger">*</span></FieldLabel>
                      <Input id="bank-account-holder-name" className="mt-2" value={draft.bankAccountHolderName} onChange={(event) => update('bankAccountHolderName', event.target.value)} />
                      {errors.bankAccountHolderName ? <FieldError>{errors.bankAccountHolderName}</FieldError> : null}
                    </Field>
                    <Field invalid={Boolean(errors.bankAccountNumber)}>
                      <FieldLabel htmlFor="bank-account-number">Bank Account Number <span className="text-danger">*</span></FieldLabel>
                      <Input id="bank-account-number" className="mt-2" inputMode="numeric" value={draft.bankAccountNumber} onChange={(event) => update('bankAccountNumber', event.target.value.replace(/\D/g, ''))} placeholder="Enter account number" />
                      {errors.bankAccountNumber ? <FieldError>{errors.bankAccountNumber}</FieldError> : <FieldDescription>Digits only.</FieldDescription>}
                    </Field>
                    <Field invalid={Boolean(errors.bankSupportingDocumentName)}>
                      <FieldLabel htmlFor="bank-supporting-document">Bank Supporting Document <span className="text-danger">*</span></FieldLabel>
                      <Input id="bank-supporting-document" className="mt-2" type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(event) => update('bankSupportingDocumentName', event.target.files?.[0]?.name ?? '')} />
                      {draft.bankSupportingDocumentName ? <FieldDescription>Selected: {draft.bankSupportingDocumentName}</FieldDescription> : null}
                      {errors.bankSupportingDocumentName ? <FieldError>{errors.bankSupportingDocumentName}</FieldError> : null}
                    </Field>
                  </div>
                ) : activeTask === 'additional' ? (
                  <div className="space-y-5">
                    <Alert variant="info"><UserRound aria-hidden /><AlertDescription>These details are conditional. Only provide them when the statement applies to you.</AlertDescription></Alert>
                    <div className="rounded-lg border border-border p-4">
                      <label className="flex cursor-pointer items-start gap-3">
                        <Checkbox checked={draft.profilePhotographRequired} onCheckedChange={(value) => update('profilePhotographRequired', value === true)} />
                        <span><span className="block text-[14px] font-medium text-fg">I need to provide a profile photograph</span><span className="mt-1 block text-[12px] leading-4 text-fg-muted">Select this if the internship team requested a new or updated photograph.</span></span>
                      </label>
                      {draft.profilePhotographRequired ? (
                        <Field className="mt-4 border-t border-border pt-4" invalid={Boolean(errors.profilePhotographName)}>
                          <FieldLabel htmlFor="profile-photograph">Profile Photograph <span className="text-danger">*</span></FieldLabel>
                          <Input id="profile-photograph" className="mt-2" type="file" accept=".png,.jpg,.jpeg" onChange={(event) => update('profilePhotographName', event.target.files?.[0]?.name ?? '')} />
                          {draft.profilePhotographName ? <FieldDescription>Selected: {draft.profilePhotographName}</FieldDescription> : null}
                          {errors.profilePhotographName ? <FieldError>{errors.profilePhotographName}</FieldError> : null}
                        </Field>
                      ) : null}
                    </div>
                    <div className="rounded-lg border border-border p-4">
                      <label className="flex cursor-pointer items-start gap-3">
                        <Checkbox checked={draft.bringingMobileDevice} onCheckedChange={(value) => update('bringingMobileDevice', value === true)} />
                        <span><span className="block text-[14px] font-medium text-fg">I will bring a personal mobile device to DSTA</span><span className="mt-1 block text-[12px] leading-4 text-fg-muted">The IMEI number is required only when you bring a personal device.</span></span>
                      </label>
                      {draft.bringingMobileDevice ? (
                        <Field className="mt-4 border-t border-border pt-4" invalid={Boolean(errors.mobileDeviceImeiNumber)}>
                          <FieldLabel htmlFor="mobile-device-imei">Mobile Device IMEI Number <span className="text-danger">*</span></FieldLabel>
                          <Input id="mobile-device-imei" className="mt-2" inputMode="numeric" maxLength={15} value={draft.mobileDeviceImeiNumber} onChange={(event) => update('mobileDeviceImeiNumber', event.target.value.replace(/\D/g, ''))} placeholder="15-digit IMEI" />
                          {errors.mobileDeviceImeiNumber ? <FieldError>{errors.mobileDeviceImeiNumber}</FieldError> : <FieldDescription>Dial *#06# on your device to find its IMEI.</FieldDescription>}
                        </Field>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Alert variant="info"><ShieldCheck aria-hidden /><AlertDescription>Both declarations must be accepted before onboarding can be submitted.</AlertDescription></Alert>
                    <label className={cn('flex cursor-pointer items-start gap-3 rounded-lg border p-4', draft.mobileDeclarationAccepted ? 'border-success/30 bg-success-bg/40' : errors.mobileDeclarationAccepted ? 'border-danger/40 bg-danger-bg/30' : 'border-border')}>
                      <Checkbox checked={draft.mobileDeclarationAccepted} onCheckedChange={(value) => update('mobileDeclarationAccepted', value === true)} />
                      <span><span className="block text-[14px] font-medium text-fg">Mobile Declaration <span className="text-danger">*</span></span><span className="mt-1 block text-[12px] leading-5 text-fg-muted">I confirm that the mobile device information provided is accurate and I will comply with DSTA device-security requirements.</span>{errors.mobileDeclarationAccepted ? <span className="mt-2 block text-[12px] text-danger">{errors.mobileDeclarationAccepted}</span> : null}</span>
                    </label>
                    <label className={cn('flex cursor-pointer items-start gap-3 rounded-lg border p-4', draft.acceptableUsePolicyAccepted ? 'border-success/30 bg-success-bg/40' : errors.acceptableUsePolicyAccepted ? 'border-danger/40 bg-danger-bg/30' : 'border-border')}>
                      <Checkbox checked={draft.acceptableUsePolicyAccepted} onCheckedChange={(value) => update('acceptableUsePolicyAccepted', value === true)} />
                      <span><span className="block text-[14px] font-medium text-fg">Acceptable Use Policy Acknowledgement <span className="text-danger">*</span></span><span className="mt-1 block text-[12px] leading-5 text-fg-muted">I have read and agree to comply with the DSTA Acceptable Use Policy, including requirements for official and sensitive information.</span>{errors.acceptableUsePolicyAccepted ? <span className="mt-2 block text-[12px] text-danger">{errors.acceptableUsePolicyAccepted}</span> : null}</span>
                    </label>
                  </div>
                )}

                <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-5">
                  <Button onClick={saveTask}>
                    {activeIndex === TASKS.length - 1 ? 'Save declarations' : 'Save and continue'}
                    {activeIndex === TASKS.length - 1 ? <CheckCircle2 className="size-4" aria-hidden /> : <ArrowRight className="size-4" aria-hidden />}
                  </Button>
                  <Button variant="ghost" onClick={saveAndExit}>Save and Exit</Button>
                </div>
              </CardContent>
            </Card>

            <aside className="space-y-5">
              <Card className="shadow-none">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3"><FileUp className="size-5 text-accent" aria-hidden /><h2 className="text-[16px] font-semibold text-fg">Submission progress</h2></div>
                  <p className="mt-3 text-[13px] leading-5 text-fg-muted">Each task is saved independently. You can return and edit it before final submission.</p>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-bg-muted" aria-hidden><div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(completedCount / TASKS.length) * 100}%` }} /></div>
                  <p className="mt-2 text-[12px] font-medium text-fg">{progressLabel}</p>
                  <Button className="mt-5 w-full" disabled={!allTasksComplete} onClick={() => router.push('/apply/applicant-onboarding-review')}>Review Submission</Button>
                </CardContent>
              </Card>
            </aside>
          </div>
        </div>
      </div>
    </Shell>
  );
}
