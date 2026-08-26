'use client';

/* Compatibility wrapper retained for existing call sites. Out-of-scope hover
   messaging has been removed so wrapped controls behave like normal controls. */
import type { ReactElement, ReactNode } from 'react';

export default function OutOfScopeTooltip({
  children,
}: {
  /** Single interactive element (button, link, etc.). */
  children: ReactElement;
  side?: 'top' | 'right' | 'bottom' | 'left';
  sideOffset?: number;
  align?: 'start' | 'center' | 'end';
  /** Override copy (e.g. menu label). Default: out-of-scope message. */
  content?: ReactNode;
  className?: string;
  delay?: number;
}) {
  return children;
}
