'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Topbar from '@/components/layout/topbar';
import { SuccessCelebration } from '@/components/ui-legacy/success-celebration';

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

        <SuccessCelebration
          title="Task Completed"
          message="You have successfully completed this test task. Your responses have been recorded."
          buttonText="Back to Tasks"
          onButtonClick={() => router.push('/start-tasks')}
        />
      </main>
    </div>
  );
}
