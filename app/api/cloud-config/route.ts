import { NextResponse } from 'next/server';
import { readSupabaseKey, readSupabaseUrl } from '@/lib/supabase/env';

/** Runtime public config — works when Vercel has env at Runtime but Build did not inline NEXT_PUBLIC_*. */
export const dynamic = 'force-dynamic';

export async function GET() {
  const url = readSupabaseUrl();
  const key = readSupabaseKey();
  return NextResponse.json({
    url,
    key,
    configured: Boolean(url && key),
  });
}
