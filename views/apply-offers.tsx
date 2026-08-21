'use client';

import { useRouter } from 'next/navigation';
import { CalendarDays, FileText, MapPin } from 'lucide-react';
import Shell from '@/components/layout/shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const offers = [
  {
    id: 'app-ui-2027', programme: 'Undergraduate Internship 2027', project: 'AI Threat Detection',
    status: 'Response required', deadline: '5 Sep 2026 · 11:59 PM SGT', period: '14 Sep – 11 Dec 2026', location: 'Hybrid · Digital Hub', active: true,
  },
  {
    id: 'app-experience-2027', programme: 'JC Internship Experience 2027', project: 'Defence Experience Design',
    status: 'Accepted', deadline: 'Accepted 18 Aug 2026', period: '16 Nov – 11 Dec 2026', location: 'On-site · Depot Road', active: false,
  },
];

export default function ApplyOffers() {
  const router = useRouter();
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
              <Card key={offer.id} className="shadow-none">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div><p className="text-[12px] font-medium uppercase tracking-[0.08em] text-fg-muted">Internship offer</p><h2 className="mt-2 text-[19px] font-semibold text-fg">{offer.programme}</h2><p className="mt-1 text-[14px] text-fg-muted">{offer.project}</p></div>
                    <Badge variant={offer.active ? 'warning' : 'success'}>{offer.status}</Badge>
                  </div>
                  <dl className="mt-6 space-y-3 border-y border-border py-4">
                    <div className="flex gap-3"><CalendarDays className="mt-0.5 size-4 text-fg-muted" aria-hidden /><div><dt className="text-[12px] text-fg-muted">Internship period</dt><dd className="mt-1 text-[14px] font-medium text-fg">{offer.period}</dd></div></div>
                    <div className="flex gap-3"><MapPin className="mt-0.5 size-4 text-fg-muted" aria-hidden /><div><dt className="text-[12px] text-fg-muted">Work arrangement</dt><dd className="mt-1 text-[14px] font-medium text-fg">{offer.location}</dd></div></div>
                    <div className="flex gap-3"><FileText className="mt-0.5 size-4 text-fg-muted" aria-hidden /><div><dt className="text-[12px] text-fg-muted">Status</dt><dd className="mt-1 text-[14px] font-medium text-fg">{offer.deadline}</dd></div></div>
                  </dl>
                  <div className="mt-5 flex gap-2"><Button onClick={() => router.push(offer.active ? `/apply/applicant-offer-detail?applicationId=${offer.id}` : '/apply/applicant-offer-confirmation?decision=accepted')}>{offer.active ? 'Review Offer' : 'View Decision'}</Button><Button variant="outline" onClick={() => router.push(`/apply/applications/${offer.id}`)}>View Application</Button></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </Shell>
  );
}
