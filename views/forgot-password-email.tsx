'use client';

/* Forgot password step 1 — collect account email and request OTP. */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthShell from '@/components/auth/auth-shell';
import { Input } from '@/components/ui-legacy/input';
import { saveForgotPasswordState } from '@/lib/forgot-password-store';

const BODY = 'rgba(69, 85, 108, 1)';
const TITLE = 'rgba(15, 23, 43, 1)';
const CTA_BG = 'rgba(26, 101, 248, 1)';

export default function ForgotPasswordEmail() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function validate(value: string): string {
    if (!value.trim()) return 'Enter your email address.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return 'Enter a valid email address.';
    return '';
  }

  function handleSendOtp() {
    setError('');
    const msg = validate(email);
    if (msg) {
      setError(msg);
      return;
    }
    setLoading(true);
    saveForgotPasswordState({ email: email.trim() });
    router.push('/forgot-password/verify');
  }

  return (
    <AuthShell illustrationSrc="/images/create-account-right.png" illustrationAlt="Reset your password">
      <div className="w-full rounded-2xl p-6 lg:p-8">
        <h1
          className="text-[24px] font-bold leading-[28px] tracking-[-0.4px] lg:text-[30px] lg:leading-[34px]"
          style={{ color: TITLE }}
        >
          Reset your password
        </h1>
        <p
          className="mt-3 text-[14px] font-normal leading-[20px]"
          style={{ color: BODY }}
        >
          Enter your account email and we&apos;ll send you a one-time pass code (OTP) to verify
          your identity.
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="forgot-email"
              className="mb-1.5 block text-[14px] font-medium leading-5"
              style={{ color: TITLE }}
            >
              Email
            </label>
            <Input
              id="forgot-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email@example.com"
              className="h-11 rounded-lg border-border bg-white"
            />
          </div>

          {error ? <p className="text-[13px] font-medium text-danger">{error}</p> : null}

          <button
            type="button"
            disabled={loading}
            onClick={handleSendOtp}
            className="flex h-11 w-full cursor-pointer items-center justify-center rounded-lg text-[14px] font-semibold text-white disabled:opacity-60"
            style={{ background: CTA_BG }}
          >
            Send OTP
          </button>
        </div>
      </div>
    </AuthShell>
  );
}
