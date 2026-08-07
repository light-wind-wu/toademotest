'use client';

/* Demo catalog — PC: 1440×900 artboard + catlog-bg.
   Mobile: fluid list (no scale-down, no background).
   Role is switched here (profile dropdown role switcher hidden).
   Route: /catlog */
import { useEffect, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { useRole } from '@/lib/role';
import { signIn } from '@/lib/session';
import {
  saveUtApplicantVariant,
  saveUtCatalogPath,
  saveUtTrack,
  type UtApplicantVariant,
  type UtCatalogPath,
} from '@/lib/ut-track';
import { seedApplyDraftForVariant } from '@/lib/apply-application';
import { seedApplicantProfileForVariant } from '@/lib/myinfo';
import { saveApplyDashboardVersion, type ApplyDashboardVersion } from '@/lib/apply-dashboard-version';
import type { UserRole } from '@/lib/types';
import Topbar from '@/components/layout/topbar';
import { cn } from '@/lib/utils';

const ART_W = 1440;
const ART_H = 900;
const HEADER_H = 64;

const PAGE_BG = 'rgba(248, 247, 242, 1)';
const CARD_SHADOW =
  '0px 4px 6px -4px rgba(0, 0, 0, 0.05), 0px 10px 15px -3px rgba(0, 0, 0, 0.1)';
const LABEL = 'rgba(15, 23, 43, 1)';

const LIST_W = 620;
const LIST_LEFT = (ART_W - LIST_W) / 2;
const BTN_H = 56;
const CHILD_H = 44;
const BTN_GAP = 12;

type StaffEntry = {
  id: UtCatalogPath;
  label: string;
  kind: 'staff';
  role: UserRole;
};

type ExpandApplicant = {
  id: 'applicant';
  label: string;
  kind: 'expand-applicant';
};

type ExpandProbing = {
  id: 'probing';
  label: string;
  kind: 'expand-probing';
};

type CatalogRow = StaffEntry | ExpandApplicant | ExpandProbing;

const CATALOG: CatalogRow[] = [
  { id: 'io-admin', label: 'A1.1 - A1.5 (IO Admin)', kind: 'staff', role: 'io-admin' },
  { id: 'io-programme', label: 'A2.1 Creates Programme (IO)', kind: 'staff', role: 'io' },
  { id: 'io-shortlist', label: 'B2.2 Shortlists Applicants (IO)', kind: 'staff', role: 'io' },
  { id: 'ad-pnc', label: 'A1.3 - A1.5 (AD&PC)', kind: 'staff', role: 'ad-pnc' },
  { id: 'applicant', label: 'B1.1 - B3.2 (Applicant)', kind: 'expand-applicant' },
  { id: 'probing', label: 'Probing - Applicant Homepage', kind: 'expand-probing' },
];

const APPLICANT_VARIANTS: { id: UtApplicantVariant; label: string }[] = [
  { id: 'polytechnic', label: 'Polytechnic Intern' },
  { id: 'tech-up', label: 'Tech Up Intern' },
  { id: 'undergraduate', label: 'Undergraduate Intern' },
];

const PROBING_VARIANTS: { id: ApplyDashboardVersion; label: string }[] = [
  { id: 'v1', label: 'A' },
  { id: 'v2', label: 'B' },
];

function PrimaryButton({
  label,
  showArrow,
  onClick,
  emphasized,
}: {
  label: string;
  showArrow?: boolean;
  onClick: () => void;
  emphasized?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full cursor-pointer items-center justify-between rounded-xl bg-white px-5"
      style={{
        height: BTN_H,
        boxShadow: CARD_SHADOW,
        color: LABEL,
        fontWeight: emphasized ? 600 : 500,
        fontSize: emphasized ? 16 : 15,
        lineHeight: '22px',
      }}
    >
      <span className="truncate text-left">{label}</span>
      {showArrow ? <ArrowRight className="size-5 shrink-0" strokeWidth={1.5} aria-hidden /> : null}
    </button>
  );
}

function ChildButton({
  label,
  onClick,
  className,
}: {
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group inline-flex cursor-pointer items-center justify-between gap-1.5 rounded-xl bg-white px-4',
        'transition-all duration-200 ease-out',
        'hover:-translate-y-0.5 hover:border-[rgba(26,101,248,0.35)] hover:bg-[rgba(26,101,248,0.06)] hover:shadow-md',
        'active:translate-y-0 active:scale-[0.98]',
        'focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[rgba(26,101,248,1)]',
        className,
      )}
      style={{
        height: CHILD_H,
        boxShadow: CARD_SHADOW,
        border: '1px solid transparent',
        color: LABEL,
        fontWeight: 500,
        fontSize: 13,
        lineHeight: '18px',
      }}
    >
      <span className="whitespace-nowrap transition-colors duration-200 group-hover:text-[rgba(26,101,248,1)]">
        {label}
      </span>
      <ArrowRight
        className="size-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[rgba(26,101,248,1)]"
        strokeWidth={1.5}
        aria-hidden
      />
    </button>
  );
}

function CatalogButtons({
  expandedId,
  onToggleExpand,
  onStaff,
  onApplicantVariant,
  onProbing,
  className,
  style,
}: {
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
  onStaff: (item: StaffEntry) => void;
  onApplicantVariant: (variant: UtApplicantVariant) => void;
  onProbing: (version: ApplyDashboardVersion) => void;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <nav className={cn('flex flex-col', className)} style={style} aria-label="Demo catalog">
      {CATALOG.map((item) => {
        if (item.kind === 'staff') {
          return (
            <PrimaryButton
              key={item.id}
              label={item.label}
              showArrow
              onClick={() => onStaff(item)}
            />
          );
        }

        if (item.kind === 'expand-applicant') {
          const open = expandedId === item.id;
          return (
            <div key={item.id} className="flex flex-col gap-3">
              <PrimaryButton
                label={item.label}
                onClick={() => onToggleExpand(item.id)}
              />
              {open && (
                <div className="flex w-full flex-col gap-2.5 pl-3 md:flex-row md:flex-nowrap md:items-center md:justify-between md:gap-2 md:pl-0">
                  {APPLICANT_VARIANTS.map((v) => (
                    <ChildButton
                      key={v.id}
                      label={v.label}
                      className="w-fit max-w-full shrink-0 px-3"
                      onClick={() => onApplicantVariant(v.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        }

        const open = expandedId === item.id;
        return (
          <div key={item.id} className="flex flex-col gap-3">
            <PrimaryButton
              label={item.label}
              emphasized
              onClick={() => onToggleExpand(item.id)}
            />
            {open && (
              <div className="flex w-full items-center gap-4">
                {PROBING_VARIANTS.map((v) => (
                  <ChildButton
                    key={v.id}
                    label={v.label}
                    className="min-w-[120px] flex-1 px-6"
                    onClick={() => onProbing(v.id)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

export default function Catlog() {
  const router = useRouter();
  const { setRole } = useRole();
  const [mounted, setMounted] = useState(false);
  const [scale, setScale] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function update() {
      if (window.innerWidth < 768) return;
      const next = Math.min(
        window.innerWidth / ART_W,
        (window.innerHeight - HEADER_H) / ART_H,
        1,
      );
      setScale(next);
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  function toggleExpand(id: string) {
    setExpandedId((cur) => (cur === id ? null : id));
  }

  function goStaff(item: StaffEntry) {
    saveUtTrack('staff');
    saveUtCatalogPath(item.id);
    setRole(item.role);
    signIn('corppass', new Date().toISOString());
    router.push('/start-tasks');
  }

  function goApplicantVariant(variant: UtApplicantVariant) {
    saveUtTrack('applicant');
    saveUtCatalogPath('applicant');
    saveUtApplicantVariant(variant);
    /* Poly / Tech Up → homepage V1; Undergraduate → V2 (Task 2). */
    saveApplyDashboardVersion(variant === 'undergraduate' ? 'v2' : 'v1');
    seedApplyDraftForVariant(variant);
    seedApplicantProfileForVariant(variant);
    setRole('new-applicant');
    router.push('/start-tasks');
  }

  function goProbing(version: ApplyDashboardVersion) {
    saveUtTrack('applicant');
    saveUtCatalogPath('probing');
    saveUtApplicantVariant('undergraduate');
    saveApplyDashboardVersion(version);
    /* Skip login — seed defaults so Shell / dashboard can render. */
    seedApplyDraftForVariant('undergraduate');
    seedApplicantProfileForVariant('undergraduate');
    setRole('new-applicant');
    signIn('singpass', new Date().toISOString());
    router.push('/apply/dashboard');
  }

  if (!mounted) {
    return (
      <div
        className="flex min-h-screen items-center justify-center text-body-sm text-fg-muted"
        style={{ background: PAGE_BG }}
      >
        Loading…
      </div>
    );
  }

  const listProps = {
    expandedId,
    onToggleExpand: toggleExpand,
    onStaff: goStaff,
    onApplicantVariant: goApplicantVariant,
    onProbing: goProbing,
  };

  return (
    <div
      className="flex min-h-screen flex-col overflow-hidden"
      style={{ background: PAGE_BG }}
      data-zone="enterprise"
      data-mode="light"
    >
      <Topbar navigationHidden hideProfile />

      <div className="flex flex-1 flex-col justify-center overflow-y-auto px-4 pb-10 pt-16 md:hidden">
        <CatalogButtons
          {...listProps}
          className="mx-auto w-full max-w-[620px]"
          style={{ gap: BTN_GAP }}
        />
      </div>

      <div className="hidden flex-1 items-center justify-center pt-16 md:flex">
        <div
          className="relative shrink-0"
          style={{ width: ART_W * scale, height: ART_H * scale }}
        >
          <div
            className="absolute left-0 top-0 origin-top-left"
            style={{
              width: ART_W,
              height: ART_H,
              transform: `scale(${scale})`,
              position: 'absolute',
            }}
          >
            <Image
              src="/images/catlog-bg.png"
              alt=""
              fill
              priority
              className="pointer-events-none object-cover"
              sizes="1440px"
            />

            <CatalogButtons
              {...listProps}
              className="absolute"
              style={{
                left: LIST_LEFT,
                top: Math.max(48, (ART_H - 520) / 2),
                width: LIST_W,
                gap: BTN_GAP,
                zIndex: 1,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
