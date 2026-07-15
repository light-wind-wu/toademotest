'use client';

import { useId } from 'react';

interface Props {
  size?: number;
  className?: string;
}

/* DSTA AI mark — twin sparkle with the blue→cyan gradient (the supplied
   "AI icon.svg" asset). One shared component so every AI surface (AI summary,
   Ask AI, recommendation, quality check) uses the identical mark. The gradient
   id is per-instance (useId) so multiple sparkles on a page don't collide. */
export default function AiSparkleIcon({ size = 16, className }: Props) {
  const uid = useId().replace(/:/g, '');
  const gid = `aisg-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M6.33333 12.6667L5.44255 10.7069C4.9423 9.6064 4.06027 8.72436 2.95973 8.22412L1 7.33333L2.95973 6.44255C4.06027 5.9423 4.9423 5.06027 5.44255 3.95973L6.33333 2L7.22412 3.95973C7.72436 5.06027 8.6064 5.9423 9.70694 6.44255L11.6667 7.33333L9.70694 8.22412C8.6064 8.72436 7.72437 9.6064 7.22412 10.7069L6.33333 12.6667ZM11.6667 14L11.6092 13.8736C11.109 12.7731 10.2269 11.891 9.1264 11.3908L9 11.3333L9.1264 11.2759C10.2269 10.7756 11.109 9.8936 11.6092 8.79306L11.6667 8.66667L11.7241 8.79306C12.2244 9.8936 13.1064 10.7756 14.2069 11.2759L14.3333 11.3333L14.2069 11.3908C13.1064 11.891 12.2244 12.7731 11.7241 13.8736L11.6667 14Z"
        fill={`url(#${gid})`}
      />
      <defs>
        <linearGradient id={gid} x1="9" y1="6" x2="4.6946" y2="7.27033" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00DCFF" />
          <stop offset="1" stopColor="#1B65F8" />
        </linearGradient>
      </defs>
    </svg>
  );
}
