'use client';

/* Email registration step 3 — set password with real-time rule checking. */
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Eye, EyeOff } from 'lucide-react';
import RegisterShell from '@/components/register/register-shell';
import { Input } from '@/components/ui-legacy/input';
import { loadRegisterState, saveRegisterState } from '@/lib/register-store';

const BODY = 'rgba(69, 85, 108, 1)';
const TITLE = 'rgba(15, 23, 43, 1)';
const CTA_BG = 'rgba(26, 101, 248, 1)';

export default function RegisterPassword() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const state = loadRegisterState();
    if (!state.email) {
      router.replace('/register');
    }
  }, [router]);

  const rules = useMemo(
    () => [
      { label: 'At least 12 characters', pass: password.length >= 12 },
      { label: '1 uppercase letter', pass: /[A-Z]/.test(password) },
      { label: '1 lowercase letter', pass: /[a-z]/.test(password) },
      { label: '1 number', pass: /\d/.test(password) },
      { label: '1 special character', pass: /[^A-Za-z0-9]/.test(password) },
    ],
    [password],
  );

  function handleContinue() {
    setError('');
    if (!rules.every((r) => r.pass)) {
      setError('Your password must meet all requirements.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    saveRegisterState({ password });
    router.push('/register/profile');
  }

  return (
    <RegisterShell illustrationSrc="/images/set-password-right.png" illustrationAlt="Set your password">
      <div className="w-full rounded-2xl p-6 lg:p-8">
        <p
          className="text-[12px] font-semibold uppercase tracking-[0.12em]"
          style={{ color: 'rgba(26, 101, 248, 1)' }}
        >
          Set your password
        </p>
        <h1
          className="mt-2 text-[24px] font-bold leading-[28px] tracking-[-0.4px] lg:text-[30px] lg:leading-[34px]"
          style={{ color: TITLE }}
        >
          Create a secure password
        </h1>
        <p
          className="mt-3 text-[14px] font-normal leading-[20px]"
          style={{ color: BODY }}
        >
          You&apos;ll use this password to sign in next time.
        </p>

        <div className="mt-6 space-y-4">
          <div className="relative">
            <label
              htmlFor="register-password"
              className="mb-1.5 block text-[14px] font-medium leading-5"
              style={{ color: TITLE }}
            >
              Password
            </label>
            <Input
              id="register-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              className="h-11 rounded-lg border-border bg-white pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-[34px] text-fg-subtle"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>

          <div className="relative">
            <label
              htmlFor="register-confirm"
              className="mb-1.5 block text-[14px] font-medium leading-5"
              style={{ color: TITLE }}
            >
              Confirm password
            </label>
            <Input
              id="register-confirm"
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter your password"
              className="h-11 rounded-lg border-border bg-white pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((s) => !s)}
              className="absolute right-3 top-[34px] text-fg-subtle"
              aria-label={showConfirm ? 'Hide password' : 'Show password'}
            >
              {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>

          <ul className="space-y-2 rounded-xl bg-bg-subtle p-4">
            {rules.map((rule) => (
              <li key={rule.label} className="flex items-center gap-2 text-[13px] leading-5">
                <span
                  className="inline-flex size-4 items-center justify-center rounded-full"
                  style={{
                    background: rule.pass ? 'rgba(0, 201, 80, 0.15)' : 'rgba(231, 228, 221, 1)',
                    color: rule.pass ? 'rgba(0, 130, 54, 1)' : 'rgba(98, 116, 142, 1)',
                  }}
                >
                  <Check className="size-3" strokeWidth={3} />
                </span>
                <span style={{ color: rule.pass ? 'rgba(15, 23, 43, 1)' : BODY }}>{rule.label}</span>
              </li>
            ))}
          </ul>

          {error ? (
            <p className="text-[13px] font-medium text-danger">{error}</p>
          ) : null}

          <button
            type="button"
            disabled={loading}
            onClick={handleContinue}
            className="flex h-11 w-full cursor-pointer items-center justify-center rounded-lg text-[14px] font-semibold text-white disabled:opacity-60"
            style={{ background: CTA_BG }}
          >
            Continue
          </button>
        </div>
      </div>
    </RegisterShell>
  );
}
