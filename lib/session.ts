'use client';

/* Auth session for the DSS sign-in front door. The portal's scope begins at a
   login screen (candidates click through from DSTA's public site; internal staff
   use their own URL). There is no real backend — "signing in" with Singpass /
   Corppass / Staff SSO simply records a session in localStorage and drops the
   user into the role's app. Consumers re-read on the SESSION_CHANGED event. */
import { useEffect, useState } from 'react';
import type { UserRole } from './types';

/** The landing route for a role once signed in. */
export function roleHome(role: UserRole): string {
  switch (role) {
    case 'director':                   return '/director';
    case 'ad-pnc':                     return '/submissions';
    case 'new-applicant':
    case 'existing-scholar-applicant': return '/apply/dashboard';
    default:                           return '/dashboard'; // io-admin, io, mentor
  }
}

/** True for the applicant-facing roles (candidate sign-in via Singpass). */
export function isApplicantRole(role: UserRole): boolean {
  return role === 'new-applicant' || role === 'existing-scholar-applicant';
}

export const SESSION_KEY = 'dsta_session';
export const SESSION_CHANGED = 'dsta_session_changed';

export type SignInMethod = 'singpass' | 'corppass' | 'sso';

export interface Session {
  signedIn: boolean;
  method?:  SignInMethod;
  /** ISO timestamp of sign-in (mock). */
  at?:      string;
  /** Set when an under-16 applicant's parent/guardian signed in with their own
   *  Singpass to set up the application on the applicant's behalf. */
  guardian?: boolean;
}

const SIGNED_OUT: Session = { signedIn: false };

export function loadSession(): Session {
  if (typeof window === 'undefined') return SIGNED_OUT;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? { ...SIGNED_OUT, ...JSON.parse(raw) } : SIGNED_OUT;
  } catch { return SIGNED_OUT; }
}

function persist(s: Session) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch {}
  try { window.dispatchEvent(new Event(SESSION_CHANGED)); } catch {}
}

/** Record a signed-in session (the caller sets the role separately via useRole).
 *  `opts.guardian` marks a parent/guardian-assisted sign-in for an under-16 applicant. */
export function signIn(method: SignInMethod, atIso: string, opts?: { guardian?: boolean }) {
  persist({ signedIn: true, method, at: atIso, guardian: opts?.guardian || undefined });
}

/** Clear the session — returns the user to the sign-in screen. */
export function signOut() {
  persist(SIGNED_OUT);
}

export function isSignedIn(): boolean {
  return loadSession().signedIn;
}

/** Live session hook — re-reads on sign-in/out (same tab) and storage (other tabs). */
export function useSession(): Session {
  // Lazy-init from storage on the client so the auth gate reads the real value on
  // first paint (avoids a spurious redirect before the effect runs).
  const [session, setSession] = useState<Session>(() => (typeof window !== 'undefined' ? loadSession() : SIGNED_OUT));
  useEffect(() => {
    const read = () => setSession(loadSession());
    read();
    window.addEventListener(SESSION_CHANGED, read);
    window.addEventListener('storage', read);
    return () => {
      window.removeEventListener(SESSION_CHANGED, read);
      window.removeEventListener('storage', read);
    };
  }, []);
  return session;
}
