'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowRight, CheckCircle2, Clock3 } from 'lucide-react';
import ApplicantChrome from '@/components/apply/applicant-chrome';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { saveApplicantHomeScenario } from '@/lib/applicant-home-scenario';
import { isSignedIn } from '@/lib/session';

export default function ApplySuccessPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isSignedIn()) {
      router.replace('/login');
      return;
    }

    saveApplicantHomeScenario('submitted');
    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-body-sm text-fg-muted">
        Loading…
      </div>
    );
  }

  return (
    <ApplicantChrome className="!bg-[rgba(248,247,242,1)]">
      <main className="relative flex min-h-[calc(100dvh-4rem)] flex-1 items-center justify-center overflow-hidden px-5 py-12 sm:px-8">
        <Image
          src="/images/welcome-bg.png"
          alt=""
          fill
          priority
          className="pointer-events-none hidden object-cover object-center md:block"
          sizes="100vw"
        />

        <Card className="relative z-10 w-full max-w-[660px] overflow-hidden border-success/30 shadow-md">
          <div className="h-1 bg-success" aria-hidden />
          <CardContent className="p-7 sm:p-10">
            <div className="flex size-12 items-center justify-center rounded-full bg-success-bg text-success" aria-hidden>
              <CheckCircle2 className="size-7" />
            </div>

            <Badge variant="success" className="mt-6">
              Submitted successfully
            </Badge>

            <h1 className="mt-4 text-[30px] font-semibold leading-9 tracking-[-0.5px] text-fg sm:text-[36px] sm:leading-[44px]">
              Application submitted
            </h1>
            <p className="mt-4 text-[16px] leading-7 text-fg-muted">
              Thank you for applying to the University Internship 2027 programme. Your application has been successfully submitted to DSTA&apos;s Talent Acquisition team.
            </p>

            <div className="mt-7 rounded-lg border border-border bg-bg-muted p-5">
              <div className="flex items-start gap-3">
                <Clock3 className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
                <div>
                  <h2 className="text-[15px] font-semibold text-fg">What happens next</h2>
                  <p className="mt-1.5 text-[14px] leading-6 text-fg-muted">
                    Our Talent Acquisition team will review your application next. We will contact you if further information or action is required. Please monitor your registered email and the Applicant Portal for updates.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
              <p className="text-[13px] text-fg-muted">
                Application reference <span className="font-medium text-fg">APP-UI27-00418</span>
              </p>
              <Button type="button" onClick={() => router.push('/apply/dashboard')}>
                Go to Applicant Home
                <ArrowRight className="size-4" aria-hidden />
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </ApplicantChrome>
  );
}
