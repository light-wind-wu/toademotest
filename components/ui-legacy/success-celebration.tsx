'use client';

import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SuccessCelebrationProps {
  title: string;
  message: string;
  buttonText: string;
  onButtonClick: () => void;
}

export function SuccessCelebration({
  title,
  message,
  buttonText,
  onButtonClick,
}: SuccessCelebrationProps) {
  return (
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
      <section className="relative z-10 flex w-full min-h-0 flex-col items-center justify-center gap-4 rounded-xl border-border bg-surface px-6 py-8 text-center shadow-sm md:min-h-64 md:py-5 md:px-10">
        <Image
          src="/images/step-complete.svg"
          alt={title}
          width={40}
          height={40}
          className="h-10 w-10 object-contain"
          priority
        />

        <div className="flex flex-col gap-2">
          <h1 className="text-[20px] font-semibold leading-snug text-fg">
            {title}
          </h1>
          <p className="text-[20px] font-normal leading-snug text-fg">
            {message}
          </p>
        </div>

        <Button variant="solid" onClick={onButtonClick}>
          {buttonText}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </section>
    </div>
  );
}
