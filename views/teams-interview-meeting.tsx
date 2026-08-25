'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, CalendarDays, Clock3, Mic, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function TeamsInterviewMeeting() {
  const router = useRouter();

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-bg-subtle px-5 py-10 text-fg">
      <Card className="w-full max-w-2xl shadow-none">
        <CardContent className="p-6 sm:p-8">
          <button type="button" onClick={() => router.back()} className="inline-flex items-center gap-2 text-[13px] font-medium text-fg-muted hover:text-fg">
            <ArrowLeft className="size-4" aria-hidden /> Back
          </button>
          <div className="mt-7 flex size-12 items-center justify-center rounded-full bg-accent text-accent-fg"><Video className="size-6" aria-hidden /></div>
          <p className="mt-5 text-[12px] font-semibold uppercase tracking-[0.08em] text-fg-muted">Microsoft Teams meeting</p>
          <h1 className="mt-2 text-[28px] font-semibold leading-9 tracking-[-0.4px]">Mentor interview with Marcus Tan</h1>
          <p className="mt-2 text-[14px] leading-6 text-fg-muted">Designing Mission-Critical Digital Services</p>
          <div className="mt-6 grid gap-4 rounded-lg bg-bg-muted p-5 sm:grid-cols-2">
            <div className="flex gap-3"><CalendarDays className="mt-0.5 size-4 text-fg-muted" aria-hidden /><div><p className="text-[12px] text-fg-muted">Date</p><p className="mt-1 text-[14px] font-medium">28 Aug 2026</p></div></div>
            <div className="flex gap-3"><Clock3 className="mt-0.5 size-4 text-fg-muted" aria-hidden /><div><p className="text-[12px] text-fg-muted">Time</p><p className="mt-1 text-[14px] font-medium">10:00 AM - 11:00 AM SGT</p></div></div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button type="button"><Video className="size-4" aria-hidden /> Join now</Button>
            <Button type="button" variant="outline"><Mic className="size-4" aria-hidden /> Audio settings</Button>
          </div>
          <p className="mt-5 text-[12px] leading-5 text-fg-muted">Prototype meeting room · Meeting ID 482 019 773 224 · Passcode DSTA2027</p>
        </CardContent>
      </Card>
    </main>
  );
}
