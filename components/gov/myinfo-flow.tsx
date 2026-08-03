'use client';

/* Mock Singpass Myinfo consent → retrieving → retrieved dialog.
   Layout follows C-end comps (PC + mobile): light scrim, close (X),
   request grids, bottom-right actions / full-width accent CTA on retrieve.
   Singpass red is a brand exception (same as login-shell). */
import { useEffect, useState, type ReactNode } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SingpassWordmark, { SINGPASS_RED } from '@/components/gov/singpass-wordmark';
import { cn } from '@/lib/utils';
import {
  MYINFO_REQUESTED,
  type MyinfoProfile,
} from '@/lib/myinfo';

const SINGPASS_FIELD = '#9F3F48';

export type MyinfoStep = 'consent' | 'retrieving' | 'retrieved';

interface MyinfoFlowProps {
  open: boolean;
  profile: MyinfoProfile;
  onCancel: () => void;
  onContinue: () => void;
}

export default function MyinfoFlow({ open, profile, onCancel, onContinue }: MyinfoFlowProps) {
  const [step, setStep] = useState<MyinfoStep>('consent');

  useEffect(() => {
    if (open) setStep('consent');
  }, [open]);

  useEffect(() => {
    if (step !== 'retrieving') return;
    const t = window.setTimeout(() => setStep('retrieved'), 1400);
    return () => window.clearTimeout(t);
  }, [step]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-bg p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Singpass Myinfo"
    >
      <style>{`
        @keyframes myinfoSpin { to { transform: rotate(360deg); } }
        @keyframes myinfoPanelIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div
        className="flex w-full max-h-[min(92dvh,720px)] max-w-[480px] flex-col rounded-xl bg-surface shadow-lg"
        style={{ animation: 'myinfoPanelIn 280ms cubic-bezier(0.22, 1, 0.36, 1) both' }}
      >
        <header className="flex min-h-16 shrink-0 items-center justify-between px-5 py-4 sm:px-6">
          <SingpassWordmark size="md" />
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-bg-muted hover:text-fg"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {step === 'retrieving' ? (
          /* Matches concept demo `.myinfo-retrieving { min-height: 270px }` */
          <div className="grid min-h-[270px] place-items-center px-5 text-center sm:px-6">
            <div>
              <div
                className="mx-auto mb-[18px] h-[42px] w-[42px] rounded-full border-[3px] border-border"
                style={{
                  borderTopColor: SINGPASS_RED,
                  animation: 'myinfoSpin 760ms linear infinite',
                }}
                aria-hidden
              />
              <p className="text-[14px] font-semibold text-fg-muted">
                Retrieving your details from Myinfo...
              </p>
            </div>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 sm:px-6 sm:pb-7">
            {step === 'consent' && (
              <>
                <h2 className="text-headline-sm font-bold text-fg sm:text-[1.35rem]">
                  DSTA Talent Acquisition
                </h2>
                <p className="mt-1.5 text-body-sm leading-relaxed text-fg-muted">
                  is requesting the following information from
                  <br />
                  Myinfo to pre-fill your application.
                </p>

                <div className="mt-5 overflow-hidden rounded-xl border border-border bg-bg-subtle">
                  <RequestGroup label="Personal" items={[...MYINFO_REQUESTED.personal]} />
                  <RequestGroup label="Contact" items={[...MYINFO_REQUESTED.contact]} bordered />
                </div>

                <p className="mt-4 text-[12px] leading-relaxed text-fg-muted">
                  By proceeding, you consent to Myinfo sharing the
                  <br />
                  above with DSTA for this application. Your data is
                  <br />
                  protected under the PDPA.
                </p>

                <div className="mt-6 flex justify-end gap-2.5">
                  <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setStep('retrieving')}
                    className="font-semibold text-white hover:brightness-95"
                    style={{ backgroundColor: SINGPASS_RED }}
                  >
                    I Agree
                  </Button>
                </div>
              </>
            )}

            {step === 'retrieved' && (
              <>
                <div className="mb-5 flex items-center gap-2 text-body-sm font-bold text-success">
                  {/* Lucide ShieldCheck ≈ comps shield+tick (no dedicated Myinfo asset in repo) */}
                  <ShieldCheck className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
                  Retrieved from Myinfo
                </div>

                <ResultGroup
                  label="Personal"
                  rows={[
                    ['Name', profile.name],
                    ['Sex', profile.sex],
                    ['Date of Birth', profile.dateOfBirth],
                    ['Race', profile.race],
                    ['Nationality', profile.nationality],
                    ['Residential Status', profile.residentialStatus],
                  ]}
                />
                <ResultGroup
                  label="Contact"
                  className="mt-5"
                  rows={[
                    ['Mobile No.', profile.mobile],
                    ['Email', profile.email],
                    ['Registered Address', formatRegisteredAddress(profile.registeredAddress)],
                  ]}
                />

                <Button
                  type="button"
                  size="lg"
                  className="mt-6 h-12 w-full rounded-lg font-semibold"
                  onClick={onContinue}
                >
                  Looks good — start my application
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function RequestGroup({
  label,
  items,
  bordered,
}: {
  label: string;
  items: string[];
  bordered?: boolean;
}) {
  // Pair items two-per-row, left-aligned with a fixed gap (not a 50/50 grid).
  const rows: string[][] = [];
  for (let i = 0; i < items.length; i += 2) {
    rows.push(items.slice(i, i + 2));
  }

  return (
    <div className={cn('px-4 py-4', bordered && 'border-t border-border')}>
      <span className="mb-3 block text-[10px] font-bold uppercase tracking-[0.12em] text-fg-subtle">
        {label}
      </span>
      <ul className="flex flex-col gap-y-2.5">
        {rows.map((row) => (
          <li key={row.join('-')} className="flex flex-wrap gap-x-5">
            {row.map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-1.5 text-[12px] font-medium sm:text-[13px]"
                style={{ color: SINGPASS_FIELD }}
              >
                <span aria-hidden className="text-[11px]">✓</span>
                {item}
              </span>
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
}

type ResultValue = string | ReactNode;

function ResultGroup({
  label,
  rows,
  className,
}: {
  label: string;
  rows: [string, ResultValue][];
  className?: string;
}) {
  return (
    <div className={className}>
      <span className="mb-2.5 block text-[10px] font-bold uppercase tracking-[0.12em] text-fg-subtle">
        {label}
      </span>
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        {rows.map(([k, v], i) => {
          const isAddress = k === 'Registered Address';
          return (
            <div
              key={k}
              className={cn(
                'flex items-start justify-between gap-4 px-4 py-3 text-body-sm',
                i > 0 && 'border-t border-border',
                isAddress && 'flex-col gap-1 sm:flex-row sm:gap-4',
              )}
            >
              <span
                className={cn(
                  'text-fg-muted',
                  isAddress ? 'max-w-[9.5rem] leading-snug' : 'shrink-0',
                )}
              >
                {isAddress ? (
                  <>
                    Registered
                    <br />
                    Address
                  </>
                ) : (
                  k
                )}
              </span>
              <strong
                className={cn(
                  'font-semibold text-fg',
                  isAddress ? 'text-left sm:text-right sm:ml-auto' : 'text-right',
                )}
              >
                {v}
              </strong>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Break address after “#12-” to match C-end comps. */
function formatRegisteredAddress(address: string): ReactNode {
  const marker = '#12-';
  const idx = address.indexOf(marker);
  if (idx === -1) {
    // Fallback: break after first comma
    const comma = address.indexOf(',');
    if (comma === -1) return address;
    return (
      <>
        {address.slice(0, comma + 1)}
        <br />
        {address.slice(comma + 1).trimStart()}
      </>
    );
  }
  const breakAt = idx + marker.length;
  return (
    <>
      {address.slice(0, breakAt)}
      <br />
      {address.slice(breakAt)}
    </>
  );
}
