'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Archive,
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  Download,
  FileText,
  Inbox,
  Mail,
  Menu,
  MessageSquareReply,
  MonitorUp,
  MoreVertical,
  Pen,
  Printer,
  Search,
  Send,
  Settings,
  Star,
  Tag,
  Trash2,
  Users,
} from 'lucide-react';
import {
  loadApplicantMockEmail,
  markApplicantMockEmailRead,
} from '@/lib/applicant-mentor-interview';
import type { ApplicantMockEmail } from '@/lib/types';
import { cn } from '@/lib/utils';
import { signOut } from '@/lib/session';
import {
  saveUtApplicantTaskIntent,
  saveUtCatalogPath,
  saveUtTrack,
} from '@/lib/ut-track';

const mailFolders = [
  { label: 'Inbox', icon: Inbox, count: 978, active: true },
  { label: 'Starred', icon: Star },
  { label: 'Snoozed', icon: Clock3 },
  { label: 'Sent', icon: Send },
  { label: 'Drafts', icon: FileText, count: 4 },
];

function IconButton({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="flex size-9 items-center justify-center rounded-full text-[#444746] transition-colors hover:bg-[#f0f1f1] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b57d0]"
    >
      {children}
    </button>
  );
}

export default function GmailInterviewInvitation() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [message, setMessage] = useState<ApplicantMockEmail | null>(null);

  useEffect(() => {
    const email = loadApplicantMockEmail();
    setMessage(email);
    if (email) markApplicantMockEmailRead();
  }, []);

  function continueToApplicantPortal() {
    signOut();
    saveUtTrack('applicant');
    saveUtCatalogPath('applicant');
    saveUtApplicantTaskIntent('interview');
    router.push('/login');
  }

  return (
    <main className="min-h-[100dvh] bg-[#f6f8fc] font-sans text-[#1f1f1f]">
      <header className="sticky top-0 z-20 flex h-16 items-center gap-3 bg-[#f6f8fc] px-3 md:px-5">
        <IconButton label="Toggle main menu">
          <Menu className="size-5" onClick={() => setSidebarOpen((current) => !current)} aria-hidden />
        </IconButton>
        <div className="flex min-w-[126px] items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-white shadow-sm">
            <Mail className="size-5 text-[#ea4335]" strokeWidth={2.2} aria-hidden />
          </span>
          <span className="text-[22px] font-medium text-[#3c4043]">Gmail</span>
        </div>

        <div className="ml-2 hidden h-12 max-w-[720px] flex-1 items-center rounded-full bg-[#eaf1fb] px-4 md:flex">
          <Search className="size-5 text-[#444746]" aria-hidden />
          <span className="ml-3 text-[15px] text-[#5f6368]">Search mail</span>
        </div>

        <div className="ml-auto flex items-center gap-1">
          <IconButton label="Help"><CircleHelp className="size-5" aria-hidden /></IconButton>
          <IconButton label="Settings"><Settings className="size-5" aria-hidden /></IconButton>
          <button
            type="button"
            onClick={() => router.push('/desktop')}
            aria-label="Return to Desktop"
            className="ml-1 inline-flex h-9 items-center gap-2 rounded-full px-2.5 text-[13px] font-medium text-[#3c4043] transition-colors hover:bg-[#e8eaed] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b57d0] sm:px-3"
          >
            <MonitorUp className="size-[18px]" strokeWidth={1.8} aria-hidden />
            <span className="hidden lg:inline">Return to Desktop</span>
          </button>
          <button type="button" aria-label="Jenny Aw account" className="ml-1 flex size-9 items-center justify-center rounded-full bg-[#c5221f] text-[14px] font-semibold text-white">
            JA
          </button>
        </div>
      </header>

      <div className="flex min-h-[calc(100dvh-4rem)] gap-2 px-2 pb-3">
        <aside className={cn('shrink-0 transition-[width] duration-150', sidebarOpen ? 'hidden w-64 md:block' : 'hidden w-[68px] md:block')}>
          <button type="button" className={cn(
            'mb-4 mt-2 flex h-14 items-center gap-3 rounded-2xl bg-[#c2e7ff] px-5 text-[14px] font-medium text-[#001d35] shadow-sm transition-colors hover:bg-[#b5ddf7]',
            !sidebarOpen && 'w-14 justify-center px-0',
          )}>
            <Pen className="size-5" aria-hidden />
            {sidebarOpen ? 'Compose' : null}
          </button>
          <nav aria-label="Mail folders">
            {mailFolders.map(({ label, icon: FolderIcon, count, active }) => (
              <button
                key={label}
                type="button"
                className={cn(
                  'flex h-8 w-full items-center gap-4 rounded-r-full px-5 text-left text-[14px] text-[#202124] hover:bg-[#e9eaed]',
                  active && 'bg-[#d3e3fd] font-semibold',
                  !sidebarOpen && 'w-14 justify-center rounded-full px-0',
                )}
              >
                <FolderIcon className="size-[18px] shrink-0" strokeWidth={1.8} aria-hidden />
                {sidebarOpen ? <><span>{label}</span>{count ? <span className="ml-auto text-[12px]">{count}</span> : null}</> : null}
              </button>
            ))}
          </nav>
          {sidebarOpen ? (
            <div className="mt-6">
              <p className="px-5 text-[15px] font-medium">Categories</p>
              <button type="button" className="mt-2 flex h-8 w-full items-center gap-4 rounded-r-full px-5 text-[14px] hover:bg-[#e9eaed]">
                <Users className="size-[18px]" aria-hidden /> Social <span className="ml-auto text-[12px]">129</span>
              </button>
              <button type="button" className="flex h-8 w-full items-center gap-4 rounded-r-full px-5 text-[14px] hover:bg-[#e9eaed]">
                <Tag className="size-[18px]" aria-hidden /> Updates <span className="ml-auto text-[12px]">884</span>
              </button>
            </div>
          ) : null}
        </aside>

        <section className="min-w-0 flex-1 overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(60,64,67,0.08)]">
          <div className="flex h-12 items-center border-b border-[#e7e7e7] px-3">
            <IconButton label="Back to inbox"><ArrowLeft className="size-[18px]" aria-hidden /></IconButton>
            <IconButton label="Archive"><Archive className="size-[18px]" aria-hidden /></IconButton>
            <IconButton label="Report spam"><Download className="size-[18px] rotate-180" aria-hidden /></IconButton>
            <IconButton label="Delete"><Trash2 className="size-[18px]" aria-hidden /></IconButton>
            <div className="ml-2 h-5 w-px bg-[#dadce0]" />
            <IconButton label="More"><MoreVertical className="size-[18px]" aria-hidden /></IconButton>
            <span className="ml-auto hidden text-[12px] text-[#5f6368] sm:inline">12 of 997</span>
            <IconButton label="Previous email"><ChevronLeft className="size-[18px]" aria-hidden /></IconButton>
            <IconButton label="Next email"><ChevronRight className="size-[18px]" aria-hidden /></IconButton>
          </div>

          {message ? (
            <article className="mx-auto max-w-[980px] px-4 pb-12 pt-6 sm:px-8 lg:px-12">
              <div className="flex items-start gap-3">
                <h1 className="min-w-0 flex-1 text-[22px] font-normal leading-8 text-[#1f1f1f]">{message.subject}</h1>
                <IconButton label="Print"><Printer className="size-[18px]" aria-hidden /></IconButton>
              </div>

              <div className="mt-5 flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#e8eaed] text-[13px] font-medium text-[#3c4043]">DT</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <p className="text-[14px] font-semibold">{message.senderName}</p>
                    <p className="truncate text-[12px] text-[#5f6368]">&lt;{message.senderEmail}&gt;</p>
                    <time className="ml-auto text-[12px] text-[#5f6368]" dateTime={message.receivedAt}>Tue 25 Aug, 11:02</time>
                  </div>
                  <button type="button" className="mt-0.5 flex items-center gap-1 text-[12px] text-[#5f6368]">
                    to me <ChevronDown className="size-3" aria-hidden />
                  </button>
                </div>
              </div>

              <div className="mx-auto mt-8 max-w-[700px] border border-[#dadce0] bg-white px-7 py-9 sm:px-14 sm:py-12">
                <p className="text-[14px] font-semibold leading-6">Dear {message.recipientName},</p>
                <div className="mt-6 space-y-4 text-[14px] leading-6 text-[#3c4043]">
                  <p>Thank you for your application for the <strong className="text-[#202124]">{message.programmeName}</strong>.</p>
                  <p>
                    We are pleased to let you know that your application is progressing to the interview stage for{' '}
                    <strong className="text-[#202124]">{message.projectName}</strong> with{' '}
                    <strong className="text-[#202124]">{message.mentorName}</strong>.
                  </p>
                  <p>The next step is to select a suitable interview date and time. Available slots are offered on a first-come, first-served basis.</p>
                </div>

                <div className="mt-6 rounded-lg bg-[#f1f3f4] p-5">
                  <p className="text-[13px] leading-5 text-[#3c4043]">Please choose a timeslot by <strong>{message.responseDeadline}</strong>.</p>
                  <button
                    type="button"
                    onClick={continueToApplicantPortal}
                    className="mt-4 inline-flex h-10 items-center rounded-md bg-[#0b57d0] px-5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-[#0842a0] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b57d0] focus-visible:ring-offset-2"
                  >
                    Choose a timeslot
                  </button>
                </div>

                <p className="mt-5 text-[14px] leading-6 text-[#3c4043]">We look forward to speaking with you.</p>
                <div className="mt-10 text-[13px] leading-5 text-[#5f6368]">
                  <p>Warm regards,</p>
                  <div className="mt-4 flex items-center gap-4 border-t border-[#e0e0e0] pt-4">
                    <Image src="/images/dsta-logo.svg" alt="DSTA" width={88} height={48} style={{ width: 88, height: 'auto' }} />
                    <div>
                      <p className="font-semibold text-[#202124]">Davina Tan</p>
                      <p>Internship Officer, Defence Science and Technology Agency</p>
                      <p>1 Depot Road, Singapore 109679</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button type="button" className="inline-flex h-10 items-center gap-2 rounded-full border border-[#dadce0] px-5 text-[14px] font-medium text-[#3c4043] hover:bg-[#f8fafd]">
                  <MessageSquareReply className="size-4" aria-hidden /> Reply
                </button>
                <button type="button" className="inline-flex h-10 items-center gap-2 rounded-full border border-[#dadce0] px-5 text-[14px] font-medium text-[#3c4043] hover:bg-[#f8fafd]">
                  <Send className="size-4" aria-hidden /> Forward
                </button>
              </div>
            </article>
          ) : (
            <div className="flex min-h-[520px] flex-col items-center justify-center px-6 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-[#eaf1fb] text-[#0b57d0]"><Mail className="size-6" aria-hidden /></span>
              <h1 className="mt-4 text-[20px] font-medium">Interview invitation not delivered yet</h1>
              <p className="mt-2 max-w-md text-[14px] leading-6 text-[#5f6368]">The simulated email will arrive 10 seconds after the application enters Under review.</p>
              <button type="button" onClick={() => router.push('/apply/applications')} className="mt-5 rounded-full bg-[#0b57d0] px-5 py-2.5 text-[14px] font-medium text-white hover:bg-[#0842a0]">
                Return to Applications
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
