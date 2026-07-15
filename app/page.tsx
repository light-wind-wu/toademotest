'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRole } from '@/lib/role';
import { useSession, roleHome } from '@/lib/session';

/* Front door. Signed-in visitors go to their role's home; otherwise to the
   sign-in screen (candidate Singpass by default — the public entry point). */
export default function Home() {
  const router = useRouter();
  const { role, roleReady } = useRole();
  const { signedIn } = useSession();

  useEffect(() => {
    if (!roleReady) return;
    router.replace(signedIn ? roleHome(role) : '/login');
  }, [roleReady, signedIn, role, router]);

  return null;
}
