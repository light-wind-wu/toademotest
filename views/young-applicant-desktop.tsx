'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  BatteryFull,
  CalendarDays,
  Camera,
  FileText,
  Folder,
  Globe2,
  Mail,
  MessageCircle,
  Music2,
  Search,
  Settings,
  Wifi,
  X,
} from 'lucide-react';
import {
  ensureApplicantMockEmailPreview,
  loadApplicantInterviewConfirmationEmail,
  loadApplicantMockEmail,
} from '@/lib/applicant-mentor-interview';
import { loadApplicantOfferEmail } from '@/lib/applicant-offer';
import type { ApplicantInterviewConfirmationEmail, ApplicantMockEmail, ApplicantOfferEmail } from '@/lib/types';

const desktopItems = [
  { label: 'Internship applications', icon: Folder, color: 'bg-[#6aa7f8]' },
  { label: 'Portfolio 2026', icon: FileText, color: 'bg-white/90 text-[#6f63d9]' },
  { label: 'NUS timetable', icon: CalendarDays, color: 'bg-white/90 text-[#e45c64]' },
];

function AppIcon({
  label,
  children,
  onClick,
  badge,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  onClick?: () => void;
  badge?: number;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`group relative flex flex-col items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/90 ${className}`}
    >
      <span className="relative flex size-11 items-center justify-center rounded-[13px] bg-white/90 text-[#293241] shadow-[0_8px_20px_rgba(30,38,70,0.22)] ring-1 ring-white/60 transition-transform duration-150 group-hover:-translate-y-1 group-active:scale-[0.97] sm:size-12">
        {children}
        {badge ? (
          <span className="absolute -right-1.5 -top-1.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#e9434a] px-1 text-[11px] font-bold text-white shadow-sm">
            {badge}
          </span>
        ) : null}
      </span>
      <span className="sr-only">{label}</span>
    </button>
  );
}

export default function YoungApplicantDesktop() {
  const router = useRouter();
  const [message, setMessage] = useState<ApplicantMockEmail | ApplicantInterviewConfirmationEmail | ApplicantOfferEmail | null>(null);
  const [messageRoute, setMessageRoute] = useState('/gmail/interview-invitation');
  const [notificationVisible, setNotificationVisible] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const offer = loadApplicantOfferEmail();
    const confirmation = loadApplicantInterviewConfirmationEmail();
    const email = offer ?? confirmation ?? loadApplicantMockEmail() ?? ensureApplicantMockEmailPreview('jenny.aw@u.nus.edu');
    setMessage(email);
    if (offer) setMessageRoute('/gmail/offer');
    else if (confirmation) setMessageRoute('/gmail/interview-confirmed');
    const notificationTimer = window.setTimeout(() => setNotificationVisible(true), 500);
    const clockTimer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => {
      window.clearTimeout(notificationTimer);
      window.clearInterval(clockTimer);
    };
  }, []);

  const clock = useMemo(() => new Intl.DateTimeFormat('en-SG', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now), [now]);

  function openGmail() {
    router.push(messageRoute);
  }

  return (
    <main
      className="relative min-h-[100dvh] w-full overflow-hidden bg-[#5559a5] font-sans text-white"
      style={{
        backgroundImage: [
          'radial-gradient(circle at 18% 22%, rgba(255,174,155,0.88) 0, rgba(255,174,155,0.1) 24%, transparent 42%)',
          'radial-gradient(circle at 78% 18%, rgba(121,216,224,0.88) 0, rgba(121,216,224,0.12) 26%, transparent 44%)',
          'radial-gradient(circle at 52% 78%, rgba(124,105,194,0.92) 0, rgba(124,105,194,0.16) 34%, transparent 56%)',
          'linear-gradient(145deg, #243451 0%, #5966a9 50%, #202d4a 100%)',
        ].join(','),
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.08),transparent_35%,rgba(6,16,35,0.12))]" />

      <header className="relative z-20 flex h-9 items-center bg-[#172239]/65 px-3 text-[12px] font-medium shadow-sm backdrop-blur-xl sm:px-4">
        <span className="font-semibold">Jenny&apos;s Mac</span>
        <span className="ml-5 hidden sm:inline">File</span>
        <span className="ml-4 hidden sm:inline">View</span>
        <span className="ml-4 hidden sm:inline">Go</span>
        <div className="ml-auto flex items-center gap-3">
          <Wifi className="size-4" strokeWidth={2} aria-label="Wi-Fi connected" />
          <BatteryFull className="size-5" strokeWidth={2} aria-label="Battery full" />
          <Search className="hidden size-4 sm:block" aria-label="Search" />
          <time>{clock}</time>
        </div>
      </header>

      <section aria-label="Desktop files" className="relative z-10 grid w-fit grid-cols-1 gap-6 px-5 pt-8 sm:px-8 sm:pt-10">
        {desktopItems.map(({ label, icon: DesktopIcon, color }) => (
          <button key={label} type="button" className="group flex w-24 flex-col items-center gap-2 rounded-lg p-1 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/90">
            <span className={`flex size-14 items-center justify-center rounded-xl shadow-[0_10px_22px_rgba(14,22,45,0.25)] ring-1 ring-white/40 transition-transform group-hover:-translate-y-0.5 ${color}`}>
              <DesktopIcon className="size-8" strokeWidth={1.6} aria-hidden />
            </span>
            <span className="rounded-md bg-[#172239]/45 px-1.5 py-0.5 text-[12px] leading-4 shadow-sm backdrop-blur-md">{label}</span>
          </button>
        ))}
      </section>

      {notificationVisible && message ? (
        <aside
          aria-label="Gmail notification"
          className="absolute right-3 top-12 z-30 w-[calc(100%-1.5rem)] max-w-[370px] rounded-2xl border border-white/45 bg-[#eef2f7]/92 p-3 text-[#1f2937] shadow-[0_22px_50px_rgba(17,29,55,0.3)] backdrop-blur-2xl sm:right-5"
        >
          <div className="flex items-start gap-3">
            <button type="button" onClick={openGmail} className="flex min-w-0 flex-1 items-start gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3467d6]">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-[11px] bg-white text-[#e34b45] shadow-sm ring-1 ring-black/5">
                <Mail className="size-6" strokeWidth={2.1} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-3">
                  <span className="text-[13px] font-semibold">Gmail</span>
                  <span className="text-[11px] text-[#687386]">now</span>
                </span>
                <span className="mt-1 block text-[13px] font-semibold leading-5">{message.subject}</span>
                <span className="mt-0.5 block text-[12px] leading-4 text-[#536071]">From {message.senderName}</span>
                <span className="mt-2 inline-flex text-[12px] font-semibold text-[#285ec5]">Open email</span>
              </span>
            </button>
            <button
              type="button"
              aria-label="Dismiss Gmail notification"
              onClick={() => setNotificationVisible(false)}
              className="rounded-full p-1 text-[#687386] hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3467d6]"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        </aside>
      ) : null}

      <nav aria-label="Applications" className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-[22px] border border-white/35 bg-white/20 px-3 py-2.5 shadow-[0_18px_40px_rgba(14,22,45,0.3)] backdrop-blur-2xl sm:bottom-5">
        <div className="flex items-end gap-2 sm:gap-3">
          <AppIcon label="Browser"><Globe2 className="size-6 text-[#3480d8]" strokeWidth={1.8} aria-hidden /></AppIcon>
          <AppIcon label="Messages"><MessageCircle className="size-6 text-[#38a96b]" strokeWidth={1.8} aria-hidden /></AppIcon>
          <AppIcon label="Gmail" onClick={openGmail} badge={1}><Mail className="size-6 text-[#e34b45]" strokeWidth={2.1} aria-hidden /></AppIcon>
          <AppIcon label="Calendar"><CalendarDays className="size-6 text-[#e45c64]" strokeWidth={1.8} aria-hidden /></AppIcon>
          <AppIcon label="Music"><Music2 className="size-6 text-[#9a52cf]" strokeWidth={1.8} aria-hidden /></AppIcon>
          <AppIcon label="Photos" className="hidden sm:flex"><Camera className="size-6 text-[#db7b45]" strokeWidth={1.8} aria-hidden /></AppIcon>
          <span className="mx-0.5 hidden h-10 w-px bg-white/40 sm:block" aria-hidden />
          <AppIcon label="Settings" className="hidden sm:flex"><Settings className="size-6 text-[#667085]" strokeWidth={1.8} aria-hidden /></AppIcon>
        </div>
      </nav>
    </main>
  );
}
