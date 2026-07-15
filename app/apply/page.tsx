'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
export default function ApplyRoot() {
  const router = useRouter();
  useEffect(() => { router.replace('/apply/dashboard'); }, [router]);
  return null;
}
