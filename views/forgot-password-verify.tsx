'use client';

/* Forgot password step 2 — verify 6-digit OTP sent to email. */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthShell from '@/components/auth/auth-shell';
import OtpForm from '@/components/auth/otp-form';
import { loadForgotPasswordState } from '@/lib/forgot-password-store';

const BODY = 'rgba(69, 85, 108, 1)';
const TITLE = 'rgba(15, 23, 43, 1)';

function maskEmail(value: string): string {
  const [local, domain] = value.split('@');
  if (!local || !domain) return value;
  const maskedLocal = local.length > 2 ? `${local.slice(0, 1)}******${local.slice(-1)}` : '******';
  return `${maskedLocal}@${domain}`;
}

export default function ForgotPasswordVerify() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const state = loadForgotPasswordState();
    if (!state.email) {
      router.replace('/forgot-password');
      return;
    }
    setEmail(state.email);
  }, [router]);

  function handleVerify(code: string) {
    setError('');
    if (!code || code.length !== 6) {
      setError('Enter the 6-digit code sent to your email.');
      return;
    }
    setLoading(true);
    router.push('/forgot-password/reset');
  }

  function handleResend() {
    setError('');
  }

  return (
    <AuthShell illustrationSrc="/images/create-account-right.png" illustrationAlt="Verify your email">
      <div className="w-full rounded-2xl p-6 lg:p-8">
        <h1
          className="text-[24px] font-bold leading-[28px] tracking-[-0.4px] lg:text-[30px] lg:leading-[34px]"
          style={{ color: TITLE }}
        >
          Verify your email
        </h1>
        <OtpForm
          description={
            <p
              className="mt-3 text-[14px] font-normal leading-[20px]"
              style={{ color: BODY }}
            >
              We&apos;ve sent a 6-digit OTP to {email ? maskEmail(email) : 'your email'}
            </p>
          }
          onVerify={handleVerify}
          onResend={handleResend}
          error={error}
          loading={loading}
        />
      </div>
    </AuthShell>
  );
}
