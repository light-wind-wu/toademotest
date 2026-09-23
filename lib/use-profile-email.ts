'use client';

import { useEffect, useState } from 'react';
import { loadEditableApplicantProfile } from '@/lib/applicant-profile';
import { PROFILE_EMAIL_CHANGED } from '@/lib/profile-email-change';

export function useProfileEmail(accountEmail: string, name: string, enabled: boolean) {
  const [contact, setContact] = useState({ accountEmail: '', email: '' });
  useEffect(() => {
    function read() {
      let email = accountEmail;
      if (enabled) {
        try { email = loadEditableApplicantProfile(accountEmail, name).email; }
        catch { /* Keep the account email if the local profile cannot be read. */ }
      }
      setContact({ accountEmail, email });
    }
    read();
    window.addEventListener(PROFILE_EMAIL_CHANGED, read);
    window.addEventListener('storage', read);
    return () => { window.removeEventListener(PROFILE_EMAIL_CHANGED, read); window.removeEventListener('storage', read); };
  }, [accountEmail, name, enabled]);
  return enabled && contact.accountEmail === accountEmail ? contact.email : accountEmail;
}
