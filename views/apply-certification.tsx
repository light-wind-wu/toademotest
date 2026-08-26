'use client';

import { useRouter } from 'next/navigation';
import { Award, CheckCircle2, Clock3 } from 'lucide-react';
import Shell from '@/components/layout/shell';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useApplicantScenarioData } from '@/lib/applicant-scenario-data';
import { formatStatusLabel } from '@/lib/status-label';

export default function ApplyCertification() {
  const router = useRouter();
  const { certification } = useApplicantScenarioData();
  const isAvailable = certification.status === 'AVAILABLE';
  const isPending = certification.status === 'PENDING';
  return (
    <Shell activeRoute="/apply/certification" flushTop>
      <div className="relative mx-[calc(-1*clamp(24px,2.6vw,40px))] min-h-[calc(100vh-64px)] bg-bg-subtle">
        <header className="bg-bg px-[clamp(24px,2.6vw,40px)] py-10">
          <div className="mx-auto w-full max-w-[1440px]">
            <p className="text-[13px] font-medium text-fg-muted">Internship record</p>
            <h1 className="mt-2 text-[38px] font-semibold leading-[44px] tracking-[-0.8px] text-fg">Certification</h1>
            <p className="mt-2 max-w-2xl text-[15px] leading-6 text-fg-muted">Track certificate eligibility and access certificates issued for completed internships.</p>
          </div>
        </header>

        <div className="mx-auto w-full max-w-[1440px] px-[clamp(24px,2.6vw,40px)] py-8">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.8fr)]">
            <Card className={isAvailable ? 'overflow-hidden border-success/30 shadow-none' : 'overflow-hidden shadow-none'}>
              <div className={isAvailable ? 'h-1 bg-success' : isPending ? 'h-1 bg-warning' : 'h-1 bg-border'} aria-hidden />
              <CardContent className="p-7">
                <div className="flex items-start justify-between gap-4"><div><p className="text-[12px] font-medium uppercase tracking-[0.08em] text-fg-muted">University Internship 2027</p><h2 className="mt-2 text-[22px] font-semibold text-fg">Certificate of Completion</h2></div><Badge variant={isAvailable ? 'success' : isPending ? 'warning' : 'subtle'}>{formatStatusLabel(certification.status)}</Badge></div>
                {isAvailable ? (
                  <div className="mt-6 flex items-center gap-4 rounded-lg bg-bg-muted p-5"><span className="flex size-12 items-center justify-center rounded-lg bg-surface text-accent"><Award className="size-6" aria-hidden /></span><div><p className="text-[14px] font-medium text-fg">Jenny Aw</p><p className="mt-1 text-[13px] text-fg-muted">{certification.project} · Issued {certification.issueDate}</p><p className="mt-1 text-[12px] text-fg-muted">{certification.certificateNumber}</p></div></div>
                ) : (
                  <div className="mt-6 rounded-lg bg-bg-muted p-6 text-center"><Clock3 className="mx-auto size-6 text-fg-muted" aria-hidden /><p className="mt-3 text-[15px] font-medium text-fg">{isPending ? 'Certificate pending' : 'No certificate available'}</p></div>
                )}
                <Alert variant={isAvailable ? 'success' : 'info'} className="mt-5">{isAvailable ? <CheckCircle2 aria-hidden /> : <Clock3 aria-hidden />}<AlertDescription>{certification.statusMessage}</AlertDescription></Alert>
                <div className="mt-6 flex flex-wrap gap-2">{isAvailable ? <Button onClick={() => router.push('/apply/applicant-certificate-viewer')}>View Certificate</Button> : null}<Button variant="outline" onClick={() => router.push('/apply/internship')}>View Internship Record</Button></div>
              </CardContent>
            </Card>

            <Card className="shadow-none"><CardContent className="p-6"><div className="flex gap-3"><Clock3 className="mt-0.5 size-5 text-fg-muted" aria-hidden /><div><h2 className="text-[17px] font-semibold text-fg">Certificate availability</h2><p className="mt-2 text-[14px] leading-6 text-fg-muted">Certificates become available after internship completion, required offboarding and final clearance.</p></div></div></CardContent></Card>
          </div>
        </div>
      </div>
    </Shell>
  );
}
