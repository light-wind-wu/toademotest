'use client';

/* Email registration step 5 — success confirmation + CTA to dashboard. */
import { useRouter } from 'next/navigation';
import RegisterShell from '@/components/register/register-shell';

const BODY = 'rgba(69, 85, 108, 1)';
const TITLE = 'rgba(15, 23, 43, 1)';
const CTA_BG = 'rgba(26, 101, 248, 1)';

export default function RegisterSuccess() {
  const router = useRouter();

  return (
    <RegisterShell illustrationSrc="/images/you-all-set-right.png" illustrationAlt="You're all set">
      <div className="w-full rounded-2xl p-6 lg:p-8">
        <p
          className="text-[12px] font-semibold uppercase tracking-[0.12em]"
          style={{ color: 'rgba(0, 130, 54, 1)' }}
        >
          You&apos;re all set
        </p>
        <h1
          className="mt-2 text-[24px] font-bold leading-[28px] tracking-[-0.4px] lg:text-[30px] lg:leading-[34px]"
          style={{ color: TITLE }}
        >
          Your account has been created
        </h1>
        <p
          className="mt-3 text-[14px] font-normal leading-[20px]"
          style={{ color: BODY }}
        >
          Welcome to DSTA Talent Outreach &amp; Acquisition. You can now explore programmes and
          start your application.
        </p>

        <button
          type="button"
          onClick={() => router.push('/apply/dashboard')}
          className="mt-8 flex h-11 w-full cursor-pointer items-center justify-center rounded-lg text-[14px] font-semibold text-white"
          style={{ background: CTA_BG }}
        >
          Go to dashboard
        </button>
      </div>
    </RegisterShell>
  );
}
