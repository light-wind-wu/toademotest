'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { ProfileInput } from '@/components/apply/profile-fields';
import { DemoProfileEmailChange, maskProfileEmail, PROFILE_EMAIL_CHANGED } from '@/lib/profile-email-change';
import type { ApplicantEditableProfile, ProfileEmailChallenge, ProfileEmailChangeStep } from '@/lib/types';

export default function ProfileEmailChange({ profile, onClose, onSaved }: {
  profile: ApplicantEditableProfile; onClose: () => void; onSaved: (next: ApplicantEditableProfile) => void;
}) {
  const [session] = useState(() => new DemoProfileEmailChange(profile.accountEmail ?? profile.email, profile.fullName, profile.email));
  const [step, setStep] = useState<ProfileEmailChangeStep>('current');
  const [challenge, setChallenge] = useState<ProfileEmailChallenge | null>(null);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());
  const formRef = useRef<HTMLFormElement>(null);
  const resendSeconds = challenge ? Math.max(0, Math.ceil((challenge.resendAt - now) / 1000)) : 0;
  const expired = !!challenge && now >= challenge.expiresAt;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => { formRef.current?.querySelector<HTMLInputElement>('input')?.focus(); }, [step, challenge]);

  function send() {
    try {
      const next = step === 'current' ? session.sendCurrent() : session.sendNew(email);
      setChallenge(next); setCode(''); setError(''); setNow(Date.now());
      if (step !== 'current') { setEmail(email.trim()); setStep('new-code'); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'A verification code could not be created. Please try again.'); }
  }

  function submit() {
    setError('');
    if (step === 'new-email' || !challenge) { send(); return; }
    try {
      if (step === 'current') {
        session.verifyCurrent(code); setStep('new-email'); setChallenge(null); setCode('');
      } else {
        const next = session.confirm(code);
        onSaved(next); window.dispatchEvent(new Event(PROFILE_EMAIL_CHANGED));
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Your email could not be updated. Please try again.'); }
  }

  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent showCloseButton={false} className="max-w-md">
      <DialogTitle>Change email</DialogTitle>
      <DialogDescription>
        {step === 'current' ? 'Verify your current email before changing it.' : step === 'new-email' ? 'Enter the new email address you want to use for contact.' : 'Verify your new email to complete the change.'}
      </DialogDescription>
      <form ref={formRef} noValidate className="space-y-5" onSubmit={(event) => { event.preventDefault(); event.stopPropagation(); submit(); }}>
        {step === 'current' && <div><p className="text-body-sm text-fg-muted">Current email</p><p className="mt-1 break-all text-body-md text-fg">{maskProfileEmail(profile.email)}</p></div>}
        {step === 'new-email' ? <ProfileInput id="change-email-new" label="New email" type="email" required value={email} onChange={(value) => { setEmail(value); setError(''); }} autoComplete="email" maxLength={254} /> : step === 'new-code' && <div className="flex items-center justify-between gap-4"><div className="min-w-0"><p className="text-body-sm text-fg-muted">New email</p><p className="mt-1 break-all text-body-md text-fg">{email}</p></div><Button variant="link" size="sm" onClick={() => { setStep('new-email'); setCode(''); setError(''); }}>Change</Button></div>}
        {challenge && step !== 'new-email' && <>
          <ProfileInput id="change-email-code" label="Verification code" required value={code} onChange={(value) => { setCode(value); setError(''); }} inputMode="numeric" autoComplete="one-time-code" maxLength={6} />
          <div className="flex items-center justify-between gap-3"><p className="text-body-sm text-fg-muted">{expired ? 'Code expired' : 'Code expires after 5 minutes'}</p><Button variant="link" size="sm" disabled={resendSeconds > 0} onClick={send}>{resendSeconds > 0 ? `Resend in ${resendSeconds}s` : 'Resend code'}</Button></div>
          <p className="text-body-xs text-fg-muted">Demo code: <strong className="font-semibold">{challenge.code}</strong>. No email is sent.</p>
        </>}
        {step === 'current' && <Link href="/apply/contact-us" className="inline-block text-body-sm text-accent hover:underline">Can&apos;t access this email? Contact support</Link>}
        {error && <p role="alert" className="text-body-sm text-danger">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={step === 'new-email' && resendSeconds > 0}>
            {step === 'new-email' || !challenge ? 'Send code' : step === 'current' ? 'Verify and continue' : 'Verify and change email'}
          </Button>
        </DialogFooter>
        {step === 'new-email' && resendSeconds > 0 && <p role="status" className="text-body-xs text-fg-muted">You can request another code in {resendSeconds}s.</p>}
      </form>
    </DialogContent>
  </Dialog>;
}
