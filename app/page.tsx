'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/* UT front door — catalog is the entry; roles / login are chosen from there. */
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/catlog');
  }, [router]);

  return null;
}
