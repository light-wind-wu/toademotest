'use client';

/* Demo catalog — PC: 1440×900 artboard + catlog-bg.
   Mobile: fluid list (no scale-down, no background).
   All roles → /start-tasks first; Applicant then continues to /login from a task.
   Route: /catlog */
import { useEffect, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { useRole } from '@/lib/role';
import { signIn } from '@/lib/session';
import { saveUtTrack } from '@/lib/ut-track';
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

/** Catalog column — centered in the artboard (PC) */
const LIST_W = 420;
const LIST_LEFT = (ART_W - LIST_W) / 2;
const BTN_H = 56;
const BTN_GAP = 12;

type CatalogItem =
  | { id: string; label: string; kind: 'staff'; role: UserRole }
  | { id: string; label: string; kind: 'applicant' };

const CATALOG: CatalogItem[] = [
  { id: 'io-admin', label: 'A1.1 - A1.5 (IO Admin)', kind: 'staff', role: 'io-admin' },
  { id: 'io-a2', label: 'A2.1 Creates Programme (IO)', kind: 'staff', role: 'io' },
  { id: 'io-b2', label: 'B2.2 Shortlists Applicants (IO)', kind: 'staff', role: 'io' },
  { id: 'ad-pnc', label: 'A1.3 - A1.5 (AD&PC)', kind: 'staff', role: 'ad-pnc' },
  { id: 'applicant', label: 'B1.1 - B3.2 (Applicant)', kind: 'applicant' },
];

const LIST_H = CATALOG.length * BTN_H + (CATALOG.length - 1) * BTN_GAP;
const LIST_TOP = (ART_H - LIST_H) / 2;

function CatalogButtons({
  onPick,
  className,
  style,
}: {
  onPick: (item: CatalogItem) => void;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <nav className={cn('flex flex-col', className)} style={style} aria-label="Demo catalog">
      {CATALOG.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onPick(item)}
          className="flex w-full cursor-pointer items-center justify-between rounded-xl bg-white px-5"
          style={{
            height: BTN_H,
            boxShadow: CARD_SHADOW,
            color: LABEL,
            fontWeight: 500,
            fontSize: 15,
            lineHeight: '22px',
          }}
        >
          <span className="truncate text-left">{item.label}</span>
          <ArrowRight className="size-5 shrink-0" strokeWidth={1.5} aria-hidden />
        </button>
      ))}
    </nav>
  );
}

export default function Catlog() {
  const router = useRouter();
  const { setRole } = useRole();
  const [mounted, setMounted] = useState(false);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function update() {
      /* PC artboard only — mobile uses fluid layout */
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

  function pick(item: CatalogItem) {
    if (item.kind === 'applicant') {
      saveUtTrack('applicant');
      setRole('new-applicant');
      router.push('/start-tasks');
      return;
    }
    saveUtTrack('staff');
    setRole(item.role);
    signIn('corppass', new Date().toISOString());
    router.push('/start-tasks');
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

  return (
    <div
      className="flex min-h-screen flex-col overflow-hidden"
      style={{ background: PAGE_BG }}
      data-zone="enterprise"
      data-mode="light"
    >
      <Topbar navigationHidden hideProfile />

      {/* Mobile — full-width list, no bg, no artboard scale */}
      <div className="flex flex-1 flex-col justify-center px-4 pb-10 pt-16 md:hidden">
        <CatalogButtons
          onPick={pick}
          className="mx-auto w-full max-w-[420px]"
          style={{ gap: BTN_GAP }}
        />
      </div>

      {/* PC — 1440×900 artboard + catlog-bg */}
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
              onPick={pick}
              className="absolute"
              style={{
                left: LIST_LEFT,
                top: LIST_TOP,
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
