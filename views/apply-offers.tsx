'use client';

import { useRouter } from 'next/navigation';
import { CalendarDays, FileText, MapPin } from 'lucide-react';
import Shell from '@/components/layout/shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useApplicantScenarioData } from '@/lib/applicant-scenario-data';
import { formatStatusLabel } from '@/lib/status-label';

export default function ApplyOffers() {
  const router = useRouter();
  const { offers } = useApplicantScenarioData();
  return (
    <Shell activeRoute="/apply/offers" flushTop>
      <div className="relative mx-[calc(-1*clamp(24px,2.6vw,40px))] min-h-[calc(100vh-64px)] bg-bg-subtle">
        <header className="bg-bg px-[clamp(24px,2.6vw,40px)] py-10">
          <div className="mx-auto w-full max-w-[1440px]">
            <p className="text-[13px] font-medium text-fg-muted">Applicant workspace</p>
            <h1 className="mt-2 text-[38px] font-semibold leading-[44px] tracking-[-0.8px] text-fg">My Offers</h1>
            <p className="mt-2 max-w-2xl text-[15px] leading-6 text-fg-muted">Review active offers and keep a record of decisions from your applications.</p>
          </div>
        </header>

        <div className="mx-auto w-full max-w-[1440px] px-[clamp(24px,2.6vw,40px)] py-8">
          <div className="grid gap-4 lg:grid-cols-2">
            {offers.map((offer) => (
              <Card key={offer.offerId} className="shadow-none">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div><p className="text-[12px] font-medium uppercase tracking-[0.08em] text-fg-muted">{offer.offerId}</p><h2 className="mt-2 text-[19px] font-semibold text-fg">University Internship 2027</h2><p className="mt-1 text-[14px] text-fg-muted">{offer.project}</p></div>
                    <Badge variant={offer.status === 'RESPONSE REQUIRED' ? 'warning' : 'success'}>{formatStatusLabel(offer.status)}</Badge>
                  </div>
                  <p className="mt-5 text-[14px] leading-6 text-fg">{offer.statusMessage}</p>
                  <dl className="mt-6 space-y-3 border-y border-border py-4">
                    <div className="flex gap-3"><CalendarDays className="mt-0.5 size-4 text-fg-muted" aria-hidden /><div><dt className="text-[12px] text-fg-muted">Issued</dt><dd className="mt-1 text-[14px] font-medium text-fg">{offer.issuedDate}</dd></div></div>
                    <div className="flex gap-3"><MapPin className="mt-0.5 size-4 text-fg-muted" aria-hidden /><div><dt className="text-[12px] text-fg-muted">Onboarding</dt><dd className="mt-1 text-[14px] font-medium text-fg">{offer.onboardingProgress} · {offer.onboardingStatus}</dd></div></div>
                    <div className="flex gap-3"><FileText className="mt-0.5 size-4 text-fg-muted" aria-hidden /><div><dt className="text-[12px] text-fg-muted">Response deadline</dt><dd className="mt-1 text-[14px] font-medium text-fg">{offer.responseDeadline}</dd></div></div>
                  </dl>
                  <div className="mt-5 flex gap-2"><Button onClick={() => router.push(offer.status === 'ACCEPTED — ONBOARDING' ? '/apply/onboarding' : '/apply/applicant-offer-detail?applicationId=app-ui-2027')}>{offer.primaryCta}</Button><Button variant="outline" onClick={() => router.push('/apply/applications/app-ui-2027')}>View Application</Button></div>
                </CardContent>
              </Card>
            ))}
            {offers.length === 0 ? (
              <Card className="lg:col-span-2 shadow-none"><CardContent className="p-10 text-center"><p className="text-[16px] font-semibold text-fg">No offers yet</p><p className="mt-2 text-[14px] text-fg-muted">Internship offers and accepted decisions will appear here.</p></CardContent></Card>
            ) : null}
          </div>
        </div>
      </div>
    </Shell>
  );
}
