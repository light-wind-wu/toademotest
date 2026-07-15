'use client';

import { useState, useRef } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastTone = 'success' | 'warning' | 'danger' | 'info';

interface ToastState {
  message: string;
  tone: ToastTone;
  title?: string;
}

const TONE_ICON = {
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
  info: Info,
} as const;

const TONE_COLOR = {
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  info: 'text-info',
} as const;

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null!);

  function showToast(message: string, tone: ToastTone = 'success', title?: string) {
    setToast({ message, tone, title });
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToast(null), 3000);
  }

  return { toast, showToast };
}

export function Toast({ message, tone = 'success' }: { message: ToastState | string | null; tone?: ToastTone }) {
  // Accept either the {message,tone} state object or a bare string (legacy callers).
  const resolved: ToastState | null =
    message == null ? null : typeof message === 'string' ? { message, tone } : message;
  if (!resolved) return null;
  const Icon = TONE_ICON[resolved.tone];
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-6 right-6 z-[300] flex max-w-sm items-start gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-xl"
    >
      <Icon size={18} className={cn('mt-0.5 shrink-0', TONE_COLOR[resolved.tone])} />
      <span className="min-w-0">
        {resolved.title && (
          <span className="block text-body-sm font-semibold text-fg">{resolved.title}</span>
        )}
        <span className="block text-body-sm font-normal text-fg-muted">{resolved.message}</span>
      </span>
    </div>
  );
}
