'use client';

/* Forgot password step 4 — reset successful, return to login. */
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthShell from '@/components/auth/auth-shell';
import { clearForgotPasswordState } from '@/lib/forgot-password-store';

const BODY = 'rgba(69, 85, 108, 1)';
const TITLE = 'rgba(15, 23, 43, 1)';
const CTA_BG = 'rgba(26, 101, 248, 1)';

export default function ForgotPasswordSuccess() {
  const router = useRouter();

  useEffect(() => {
    clearForgotPasswordState();
  }, []);

  return (
    <AuthShell illustrationSrc="/images/you-all-set-right.png" illustrationAlt="Password reset successful">
      <div className="w-full rounded-2xl p-6 lg:p-8">
        <h1
          className="text-[24px] font-bold leading-[28px] tracking-[-0.4px] lg:text-[30px] lg:leading-[34px]"
          style={{ color: TITLE }}
        >
          Password reset successful
        </h1>
        <p
          className="mt-3 text-[14px] font-normal leading-[20px]"
          style={{ color: BODY }}
        >
          Your account has been created successfully. You can now login
        </p>

        <button
          type="button"
          onClick={() => router.push('/login')}
          className="mt-8 flex h-11 w-full cursor-pointer items-center justify-center rounded-lg text-[14px] font-semibold text-white"
          style={{ background: CTA_BG }}
        >
          Back To Login
        </button>
      </div>
    </AuthShell>
  );
}
