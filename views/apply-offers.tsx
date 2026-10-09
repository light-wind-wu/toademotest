'use client';

import { useRouter } from 'next/navigation';
import { CalendarDays, FileText, MapPin } from 'lucide-react';
import Shell from '@/components/layout/shell';
import { ApplicantEmptyState } from '@/components/ui-legacy/applicant-empty-state';
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
        <header className="px-[clamp(24px,2.6vw,40px)] pt-6">
          <div className="mx-auto w-full max-w-[1440px]">
            <h1 className="text-2xl font-semibold text-fg">My Offers</h1>
          </div>
        </header>

        <div className="mx-auto w-full max-w-[1440px] px-[clamp(24px,2.6vw,40px)] py-8">
          <div className="space-y-6">
            {offers.map((offer) => (
              <Card key={offer.offerId} className="shadow-none">
                <CardContent className="grid gap-6 p-6 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
                  <div>
                  <div className="flex items-start justify-between gap-4">
                    <div><p className="text-[12px] font-medium uppercase tracking-[0.08em] text-fg-muted">{offer.offerId}</p><h2 className="mt-2 text-[19px] font-semibold text-fg">University Internship 2027</h2><p className="mt-1 text-[14px] text-fg-muted">{offer.project}</p></div>
                    <Badge variant={offer.status === 'RESPONSE REQUIRED' ? 'warning' : 'success'}>{offer.status === 'RESPONSE REQUIRED' ? 'Awaiting Response' : formatStatusLabel(offer.status)}</Badge>
                  </div>
                  <h3 className="mt-6 text-lg font-semibold text-fg">{offer.status === 'RESPONSE REQUIRED' ? 'Your internship offer is ready' : 'Your offer has been accepted'}</h3>
                  <p className="mt-2 text-[14px] leading-6 text-fg-muted">{offer.statusMessage}</p>
                  <dl className="mt-6 space-y-3 border-y border-border py-4">
                    <div className="flex gap-3"><CalendarDays className="mt-0.5 size-4 text-fg-muted" aria-hidden /><div><dt className="text-[12px] text-fg-muted">Issued</dt><dd className="mt-1 text-[14px] font-medium text-fg">{offer.issuedDate}</dd></div></div>
                    <div className="flex gap-3"><MapPin className="mt-0.5 size-4 text-fg-muted" aria-hidden /><div><dt className="text-[12px] text-fg-muted">Onboarding</dt><dd className="mt-1 text-[14px] font-medium text-fg">{offer.onboardingProgress} · {offer.onboardingStatus}</dd></div></div>
                    <div className="flex gap-3"><FileText className="mt-0.5 size-4 text-fg-muted" aria-hidden /><div><dt className="text-[12px] text-fg-muted">Response deadline</dt><dd className="mt-1 text-[14px] font-medium text-fg">{offer.responseDeadline}</dd></div></div>
                  </dl>
                  <div className="mt-5 flex flex-wrap gap-2"><Button onClick={() => router.push(offer.status === 'ACCEPTED — ONBOARDING' ? '/apply/onboarding' : offer.status === 'ACCEPTED' ? '/apply/internship' : '/apply/applicant-offer-detail?applicationId=app-ui-2027')}>{offer.status === 'ACCEPTED' ? 'View internship' : offer.primaryCta}</Button><Button variant="outline" onClick={() => router.push('/apply/applications/app-ui-2027')}>View Application</Button></div>
                  </div>
                  <aside className="space-y-6 border-t border-border pt-6 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                    <div><h3 className="text-sm font-semibold text-fg">What happens next</h3><p className="mt-3 text-sm leading-6 text-fg-muted">{offer.status === 'RESPONSE REQUIRED' ? 'Review your offer details and internship period before accepting or declining. Your decision will be reflected in your application.' : offer.status === 'ACCEPTED — ONBOARDING' ? 'Complete your onboarding tasks to prepare for your internship. You can track your progress in My Internship.' : 'Your onboarding is complete. View your internship for project details, tasks and documents.'}</p></div>
                    <div><h3 className="text-sm font-semibold text-fg">Need help?</h3><a className="mt-3 inline-block text-sm text-accent hover:underline" href="mailto:internship@dsta.gov.sg">internship@dsta.gov.sg</a></div>
                  </aside>
                </CardContent>
              </Card>
            ))}
            {offers.length === 0 ? (
              <ApplicantEmptyState type="offers" className="lg:col-span-2" />
            ) : null}
          </div>
        </div>
      </div>
    </Shell>
  );
}
