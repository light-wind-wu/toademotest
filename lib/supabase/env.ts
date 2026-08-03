/** Strip accidental quotes / BOM that Vercel UI paste often leaves in. */
export function cleanEnv(value: string | undefined | null): string {
  return (value ?? '')
    .replace(/^\uFEFF/, '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .trim();
}

export function readSupabaseUrl(): string {
  return cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
}

/** Prefer classic anon JWT; fall back to new publishable key. */
export function readSupabaseKey(): string {
  return (
    cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
    cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
    ''
  );
}
