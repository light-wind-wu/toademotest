'use client';

import { useState, useEffect, useRef } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
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
  const [dismissed, setDismissed] = useState(false);

  // Accept either the {message,tone} state object or a bare string (legacy callers).
  const resolved: ToastState | null =
    message == null ? null : typeof message === 'string' ? { message, tone } : message;

  useEffect(() => {
    if (resolved) setDismissed(false);
  }, [resolved?.message, resolved?.title, resolved?.tone]);

  if (!resolved || dismissed) return null;
  const Icon = TONE_ICON[resolved.tone];

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-auto fixed bottom-6 right-6 z-[300] flex w-full max-w-[360px] items-start gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-xl"
    >
      <Icon size={20} className={cn('mt-0.5 shrink-0', TONE_COLOR[resolved.tone])} />
      <div className="min-w-0 flex-1">
        {resolved.title && (
          <p className="text-body-sm font-semibold text-[#0F172B]">{resolved.title}</p>
        )}
        <p className={`text-body-sm ${resolved.title ? 'text-[#45556C]' : 'text-[#0F172B]'}`}>
          {resolved.message}
        </p>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="shrink-0 rounded-sm text-fg-muted opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        aria-label="Close"
      >
        <X size={16} />
      </button>
    </div>
  );
}
