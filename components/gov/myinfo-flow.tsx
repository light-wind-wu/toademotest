'use client';

/* Mock Singpass Myinfo consent → retrieving → retrieved dialog.
   Layout follows C-end comps (PC + mobile): light scrim, close (X),
   request grids, bottom-right actions / full-width accent CTA on retrieve.
   Singpass red is a brand exception (same as login-shell). */
import { useEffect, useState, type ReactNode } from 'react';
import Image from 'next/image';
import { ShieldCheck } from 'lucide-react';
import { SINGPASS_RED } from '@/components/gov/singpass-wordmark';
import { cn } from '@/lib/utils';
import {
  MYINFO_REQUESTED,
  type MyinfoProfile,
} from '@/lib/myinfo';

/** Field label red from C-end comps (Singpass brand exception). */
const SINGPASS_FIELD = 'rgba(178, 34, 43, 1)';
const SUBTLE_INK = '#45556C';
const SECTION_DIVIDER = 'rgba(0, 0, 0, 0.02)';
const CLOSE_CHIP = '#FBFAF699';
const SCRIM_BG = 'rgba(251, 250, 246, 1)';
const PANEL_BORDER = 'rgba(231, 228, 221, 1)';
const PANEL_SHADOW =
  '0px 4px 6px -4px rgba(0, 0, 0, 0.05), 0px 10px 15px -3px rgba(0, 0, 0, 0.1)';
const CANCEL_BG = 'rgba(251, 250, 246, 1)';
const CANCEL_FG = 'rgba(15, 23, 43, 1)';
const AGREE_BG = 'rgba(244, 51, 61, 1)';
const RETRIEVED_FG = 'rgba(26, 127, 75, 1)';
const RESULT_MUTED = 'rgba(69, 85, 108, 1)';
const RESULT_VALUE = 'rgba(15, 23, 43, 1)';
const CTA_BG = 'rgba(26, 101, 248, 1)';

export type MyinfoStep = 'consent' | 'retrieving' | 'retrieved' | 'continuing';

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

  const busy = step === 'retrieving' || step === 'continuing';
  const canClose = step === 'consent' || step === 'retrieved';

  function handleStartApplication() {
    setStep('continuing');
    // Navigate while overlay stays up — parent must not close the modal first.
    onContinue();
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6"
      style={{ background: SCRIM_BG }}
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
        className="flex w-full max-h-[min(92dvh,720px)] max-w-[480px] flex-col rounded-xl"
        style={{
          background: 'rgba(255, 255, 255, 1)',
          border: `1px solid ${PANEL_BORDER}`,
          boxShadow: PANEL_SHADOW,
          animation: 'myinfoPanelIn 280ms cubic-bezier(0.22, 1, 0.36, 1) both',
        }}
      >
        <header className="flex shrink-0 items-center justify-between px-5 pt-6 pb-6 sm:px-6">
          <Image
            src="/images/singpass-logo.svg"
            alt="singpass"
            width={96}
            height={16}
            className="h-4 w-24"
            priority
          />
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            disabled={!canClose}
            className="inline-flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-sm backdrop-blur-[8px] transition-opacity hover:opacity-80 disabled:pointer-events-none disabled:opacity-40"
            style={{ backgroundColor: CLOSE_CHIP }}
          >
            <Image
              src="/images/close.svg"
              alt=""
              width={16}
              height={16}
              className="size-4"
              aria-hidden
            />
          </button>
        </header>

        {busy ? (
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
                {step === 'continuing'
                  ? 'Setting up your application...'
                  : 'Retrieving your details from Myinfo...'}
              </p>
            </div>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 sm:px-6 sm:pb-7">
            {step === 'consent' && (
              <>
                <h2 className="text-[14px] font-semibold leading-5 text-fg">
                  DSTA Talent Acquisition
                </h2>
                <p
                  className="mt-1.5 text-[14px] font-normal leading-5"
                  style={{ color: SUBTLE_INK }}
                >
                  is requesting the following information from
                  <br />
                  Myinfo to pre-fill your application.
                </p>

                <div
                  className="mt-5 overflow-hidden rounded-xl bg-bg-subtle"
                  style={{ border: `1px solid ${SECTION_DIVIDER}` }}
                >
                  <RequestGroup label="Personal" items={[...MYINFO_REQUESTED.personal]} />
                  <RequestGroup label="Contact" items={[...MYINFO_REQUESTED.contact]} bordered />
                </div>

                <p
                  className="mt-4 text-[12px] font-normal leading-5"
                  style={{ color: SUBTLE_INK }}
                >
                  By proceeding, you consent to Myinfo sharing the
                  <br />
                  above with DSTA for this application. Your data is
                  <br />
                  protected under the PDPA.
                </p>

                <div className="mt-6 flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={onCancel}
                    className="inline-flex cursor-pointer items-center justify-center rounded-md px-4 py-2 text-[14px] font-medium leading-5 transition-opacity hover:opacity-90"
                    style={{
                      background: CANCEL_BG,
                      border: `1px solid ${PANEL_BORDER}`,
                      color: CANCEL_FG,
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep('retrieving')}
                    className="inline-flex cursor-pointer items-center justify-center rounded-md px-4 py-2 text-[14px] font-medium leading-5 text-white transition-opacity hover:opacity-90"
                    style={{ background: AGREE_BG }}
                  >
                    I Agree
                  </button>
                </div>
              </>
            )}

            {step === 'retrieved' && (
              <>
                <div
                  className="mb-5 flex items-center gap-2 text-[14px] font-bold leading-5"
                  style={{ color: RETRIEVED_FG }}
                >
                  <ShieldCheck
                    className="h-[18px] w-[18px] shrink-0"
                    strokeWidth={1.75}
                    style={{ color: RETRIEVED_FG }}
                  />
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

                <button
                  type="button"
                  onClick={handleStartApplication}
                  className="mt-6 flex h-12 w-full cursor-pointer items-center justify-center rounded-lg text-[14px] font-medium leading-5 text-white transition-opacity hover:opacity-90"
                  style={{ background: CTA_BG }}
                >
                  Looks good — start my application
                </button>
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
    <div
      className="px-4 py-4"
      style={bordered ? { borderTop: `1px solid ${SECTION_DIVIDER}` } : undefined}
    >
      <span
        className="mb-3 block text-[11px] font-bold uppercase leading-[16.5px] tracking-[0.55px]"
        style={{ color: 'rgba(0, 0, 0, 0.4)' }}
      >
        {label}
      </span>
      <ul className="flex flex-col gap-y-2.5">
        {rows.map((row) => (
          <li key={row.join('-')} className="flex flex-wrap gap-x-5">
            {row.map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-1.5 text-[12px] font-medium leading-[18px]"
                style={{ color: SINGPASS_FIELD }}
              >
                <Image
                  src="/images/right.svg"
                  alt=""
                  width={11}
                  height={11}
                  className="size-[11px] shrink-0"
                  aria-hidden
                />
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
      <span
        className="mb-2.5 block text-[12px] font-normal uppercase leading-4"
        style={{ color: RESULT_MUTED }}
      >
        {label}
      </span>
      <div
        className="overflow-hidden rounded-xl bg-white"
        style={{ border: `1px solid ${SECTION_DIVIDER}` }}
      >
        {rows.map(([k, v], i) => {
          const isAddress = k === 'Registered Address';
          return (
            <div
              key={k}
              className="flex items-start justify-between gap-4 px-4 py-3"
              style={i > 0 ? { borderTop: `1px solid ${SECTION_DIVIDER}` } : undefined}
            >
              <span
                className={cn(
                  'shrink-0 text-[12px] font-normal leading-4',
                  isAddress && 'max-w-[9.5rem]',
                )}
                style={{ color: RESULT_MUTED }}
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
                className="text-right text-[14px] font-medium leading-5"
                style={{ color: RESULT_VALUE }}
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

/** Break address after “#12-” to match C-end comps; keep label|value side-by-side. */
function formatRegisteredAddress(address: string): ReactNode {
  const marker = '#12-';
  const idx = address.indexOf(marker);
  if (idx === -1) {
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
