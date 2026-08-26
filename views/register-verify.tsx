'use client';

/* Email registration step 2 — 6-digit OTP verification (mock). */
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import RegisterShell from '@/components/register/register-shell';
import { loadRegisterState, saveRegisterState } from '@/lib/register-store';

const BODY = 'rgba(69, 85, 108, 1)';
const TITLE = 'rgba(15, 23, 43, 1)';
const CTA_BG = 'rgba(26, 101, 248, 1)';
const COUNTDOWN_SECONDS = 60;

function formatSeconds(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function RegisterVerify() {
  const router = useRouter();
  const [otp, setOtp] = useState<string[]>(new Array(6).fill(''));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [email, setEmail] = useState('');
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const state = loadRegisterState();
    if (!state.email) {
      router.replace('/register');
      return;
    }
    setEmail(state.email);
  }, [router]);

  useEffect(() => {
    if (countdown <= 0) return;
    const id = window.setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => window.clearInterval(id);
  }, [countdown]);

  function handleChange(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    setError('');
    if (digit && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next = pasted.split('').concat(new Array(6 - pasted.length).fill(''));
    setOtp(next);
    setError('');
    inputsRef.current[Math.min(pasted.length, 5)]?.focus();
  }

  function handleVerify() {
    setError('');
    if (otp.some((d) => !d)) {
      setError('Enter the 6-digit code sent to your email.');
      return;
    }
    setLoading(true);
    saveRegisterState({ email });
    router.push('/register/password');
  }

  function handleResend() {
    setCountdown(COUNTDOWN_SECONDS);
    setError('');
  }

  return (
    <RegisterShell illustrationSrc="/images/create-account-right.png" illustrationAlt="Verify your email">
      <div className="w-full rounded-2xl p-6 lg:p-8">
        <h1
          className="text-[24px] font-bold leading-[28px] tracking-[-0.4px] lg:text-[30px] lg:leading-[34px]"
          style={{ color: TITLE }}
        >
          Verify your email
        </h1>
        <p
          className="mt-3 text-[14px] font-normal leading-[20px]"
          style={{ color: BODY }}
        >
          Enter the 6-digit code we sent to {email || 'your email'}
        </p>

        <div className="mt-6 space-y-4">
          <div className="flex justify-between gap-2">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputsRef.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                className="size-11 flex-1 rounded-lg border border-border bg-white text-center text-[18px] font-semibold text-fg shadow-sm focus:outline-1 focus:outline-offset-0 focus:outline-accent lg:size-12"
                aria-label={`OTP digit ${index + 1}`}
              />
            ))}
          </div>

          {error ? (
            <p className="text-[13px] font-medium text-danger">{error}</p>
          ) : null}

          <button
            type="button"
            disabled={loading}
            onClick={handleVerify}
            className="flex h-11 w-full cursor-pointer items-center justify-center rounded-lg text-[14px] font-semibold text-white disabled:opacity-60"
            style={{ background: CTA_BG }}
          >
            Verify
          </button>

          <p className="text-left text-[14px]" style={{ color: BODY }}>
            Didn&apos;t receive the code?{' '}
            {countdown > 0 ? (
              <span className="font-medium" style={{ color: CTA_BG }}>
                Resend in {formatSeconds(countdown)}
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                className="font-semibold hover:underline"
                style={{ color: CTA_BG }}
              >
                Resend
              </button>
            )}
          </p>
        </div>
      </div>
    </RegisterShell>
  );
}
