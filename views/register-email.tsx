'use client';

/* Email registration step 1 — collect email address. */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import RegisterShell from '@/components/register/register-shell';
import { Input } from '@/components/ui-legacy/input';
import { saveRegisterState } from '@/lib/register-store';

const BODY = 'rgba(69, 85, 108, 1)';
const TITLE = 'rgba(15, 23, 43, 1)';
const CTA_BG = 'rgba(26, 101, 248, 1)';

export default function RegisterEmail() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function validate(value: string): string {
    if (!value.trim()) return 'Enter your email address.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return 'Enter a valid email address.';
    return '';
  }

  function handleContinue() {
    setError('');
    const msg = validate(email);
    if (msg) {
      setError(msg);
      return;
    }
    setLoading(true);
    saveRegisterState({ email: email.trim() });
    router.push('/register/verify');
  }

  return (
    <RegisterShell illustrationSrc="/images/create-account-right.png" illustrationAlt="Create an account">
      <div className="w-full rounded-2xl p-6 lg:p-8">
        <h1
          className="text-[24px] font-bold leading-[28px] tracking-[-0.4px] lg:text-[30px] lg:leading-[34px]"
          style={{ color: TITLE }}
        >
          Create an account
        </h1>
        <p
          className="mt-3 text-[14px] font-normal leading-[20px]"
          style={{ color: BODY }}
        >
          Get started by entering your email address
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="register-email"
              className="mb-1.5 block text-[14px] font-medium leading-5"
              style={{ color: TITLE }}
            >
              Email Address
            </label>
            <Input
              id="register-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email@example.com"
              className="h-11 rounded-lg border-border bg-white"
            />
          </div>

          {error ? (
            <p className="text-[13px] font-medium text-danger">{error}</p>
          ) : null}

          <button
            type="button"
            disabled={loading}
            onClick={handleContinue}
            className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg text-[14px] font-semibold text-white disabled:opacity-60"
            style={{ background: CTA_BG }}
          >
            Continue
            <ArrowRight className="size-4" />
          </button>
        </div>

        <p className="mt-5 text-center text-[14px]" style={{ color: BODY }}>
          Already have an account ?{' '}
          <a href="/login" className="font-semibold hover:underline" style={{ color: CTA_BG }}>
            Login
          </a>
        </p>
      </div>
    </RegisterShell>
  );
}
