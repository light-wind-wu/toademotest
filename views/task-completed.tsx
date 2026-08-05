'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import Topbar from '@/components/layout/topbar';
import { Button } from '@/components/ui/button';

export default function TaskCompletedPage() {
  const router = useRouter();

  return (
    <div
      className="flex min-h-screen flex-col"
      data-zone="enterprise"
      data-mode="light"
    >
      <Topbar navigationHidden />

      <main className="relative flex flex-1 items-center justify-center pt-16">
        {/* Decorative background — desktop only */}
        <Image
          src="/images/task-completed-bg.jpg"
          alt=""
          width={1400}
          height={900}
          className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 object-contain md:block"
          style={{ maxWidth: '100%' }}
          priority
        />

        {/* Card + fireworks wrapper */}
        <div className="relative z-10 mx-4 flex w-full max-w-lg items-center justify-center md:mx-0">
          {/* Fireworks overlay */}
          <div className="pointer-events-none absolute inset-x-0 -top-2.5 -bottom-5 z-20 md:left-1/2 md:right-auto md:top-1/2 md:bottom-auto md:aspect-[523/368] md:w-full md:max-w-lg md:-translate-x-1/2 md:-translate-y-[calc(50%+20px)]">
            <Image
              src="/images/fireworks.svg"
              alt=""
              fill
              className="object-cover md:object-contain"
              priority
            />
          </div>

          {/* Card */}
          <section className="relative z-10 flex w-full min-h-0 flex-col items-center justify-center gap-4 rounded-xl border border-border bg-surface px-6 py-8 text-center shadow-sm md:min-h-64 md:py-5 md:px-10">
            <Image
              src="/images/step-complete.svg"
              alt="Task completed"
              width={40}
              height={40}
              className="h-10 w-10 object-contain"
              priority
            />

            <div className="flex flex-col gap-2">
              <h1 className="text-[20px] font-semibold leading-snug text-fg">
                Task Completed
              </h1>
              <p className="text-[20px] font-normal leading-snug text-fg">
                You have successfully completed this test task. Your responses have been recorded.
              </p>
            </div>

            <Button
              variant="solid"
              onClick={() => router.push('/start-tasks')}
            >
              Back to Tasks
              <ArrowRight className="h-4 w-4" />
            </Button>
          </section>
        </div>
      </main>
    </div>
  );
}
