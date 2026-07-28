'use client';

import { useEffect, useState } from 'react';

const PASSWORD = 'NTTDATA0724';
const AUTH_KEY = 'dsta_auth';

export default function PasswordGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      setAuthed(true);
      setChecked(true);
      return;
    }

    if (typeof window === 'undefined') return;

    if (window.sessionStorage.getItem(AUTH_KEY) === '1') {
      setAuthed(true);
      setChecked(true);
      return;
    }

    const input = window.prompt('Enter password to access this site:');
    if (input === PASSWORD) {
      window.sessionStorage.setItem(AUTH_KEY, '1');
      setAuthed(true);
      setChecked(true);
    } else {
      window.alert('Access denied.');
      window.location.reload();
    }
  }, []);

  if (!checked || !authed) {
    return <div className="fixed inset-0 bg-surface" />;
  }

  return <>{children}</>;
}
