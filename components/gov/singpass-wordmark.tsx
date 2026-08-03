'use client';

/* Temporary text lockup — black “i”, red remaining letters.
   Swap for the official Singpass SVG wordmark when available. */
import { cn } from '@/lib/utils';

export const SINGPASS_RED = '#F4333D';

export default function SingpassWordmark({
  className,
  size = 'md',
}: {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const type =
    size === 'lg'
      ? 'text-[1.5rem] leading-none'
      : size === 'sm'
        ? 'text-[1.05rem] leading-none'
        : 'text-[1.25rem] leading-none';

  return (
    <span
      className={cn(
        'inline-block font-extrabold tracking-tight lowercase',
        type,
        className,
      )}
      style={{ color: SINGPASS_RED }}
      role="img"
      aria-label="singpass"
    >
      s<span className="text-fg">i</span>ngpass
    </span>
  );
}
