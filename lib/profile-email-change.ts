import { z } from 'zod';
import { saveVerifiedProfileEmail } from '@/lib/applicant-profile';
import type { ProfileEmailChallenge } from '@/lib/types';

export const PROFILE_EMAIL_CHANGED = 'dsta-profile-email-changed';
export const newProfileEmailSchema = z.object({ email: z.string().trim().pipe(z.email('Enter a valid email address.')) });
const codeSchema = z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit verification code.');

export function maskProfileEmail(email: string) {
  const [local, domain] = email.split('@');
  return `${local.slice(0, 1)}***@${domain}`;
}

// Demo only: challenges live in memory and are shown in the dialog, never sent by email.
export class DemoProfileEmailChange {
  private current: ProfileEmailChallenge | null = null;
  private next: ProfileEmailChallenge | null = null;
  private verifiedUntil = 0;
  private nextEmail = '';
  private used = false;
  private currentFailures = 0;
  private nextFailures = 0;

  constructor(private accountEmail: string, private name: string, private previousEmail: string,
    private now = () => Date.now(), private makeCode = () => String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, '0')) {}

  private challenge(previous: ProfileEmailChallenge | null, failures: number) {
    if (this.used) throw new Error('This request is complete. Close this window.');
    if (failures >= 5) throw new Error('Too many incorrect attempts. Cancel and start again.');
    if (previous && this.now() < previous.resendAt) throw new Error('Please wait before requesting another code.');
    return { code: this.makeCode(), expiresAt: this.now() + 300000, resendAt: this.now() + 60000 };
  }

  private verify(challenge: ProfileEmailChallenge | null, code: string, failures: number) {
    if (this.used) throw new Error('This request is complete. Close this window.');
    if (!challenge) throw new Error('Request a verification code first.');
    if (failures >= 5) throw new Error('Too many incorrect attempts. Cancel and start again.');
    if (this.now() >= challenge.expiresAt) throw new Error('This code has expired. Request a new code.');
    const result = codeSchema.safeParse(code);
    if (!result.success) throw new Error(result.error.issues[0].message);
    if (result.data !== challenge.code) throw new Error('Incorrect code. Please try again.');
  }

  sendCurrent() {
    this.current = this.challenge(this.current, this.currentFailures);
    return { ...this.current };
  }

  verifyCurrent(code: string) {
    try { this.verify(this.current, code, this.currentFailures); }
    catch (error) { this.currentFailures++; throw error; }
    this.verifiedUntil = this.now() + 600000;
    this.current = null;
  }

  private requireVerified() {
    if (!this.verifiedUntil || this.now() >= this.verifiedUntil) throw new Error('Your verification has expired. Cancel and start again.');
  }

  sendNew(value: string) {
    this.requireVerified();
    const result = newProfileEmailSchema.safeParse({ email: value });
    if (!result.success) throw new Error(result.error.issues[0].message);
    if (result.data.email.toLowerCase() === this.previousEmail.toLowerCase()) throw new Error('Enter a different email address.');
    const challenge = this.challenge(this.next, this.nextFailures);
    this.nextEmail = result.data.email;
    this.next = challenge;
    return { ...challenge };
  }

  confirm(code: string) {
    this.requireVerified();
    try { this.verify(this.next, code, this.nextFailures); }
    catch (error) { this.nextFailures++; throw error; }
    let profile;
    try { profile = saveVerifiedProfileEmail(this.accountEmail, this.name, this.previousEmail, this.nextEmail); }
    catch { throw new Error('Your email could not be updated. Your existing email is unchanged. Reopen My Profile if it changed in another window.'); }
    this.used = true;
    return profile;
  }
}
