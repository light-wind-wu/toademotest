'use client';

import { ArrowLeft, Download, FileCheck2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Shell from '@/components/layout/shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const RECOMMENDATION_BODY = [
  'To whom it may concern,',
  '',
  'I am pleased to recommend Jenny Aw following her internship with the DSTA Digital Hub from 2 June to 31 July 2027.',
  '',
  'During her work on Designing Mission-Critical Digital Services, Jenny demonstrated strong analytical thinking, dependable execution and a thoughtful approach to collaboration. She translated complex requirements into clear, practical outcomes and responded constructively to feedback throughout the project.',
  '',
  'Jenny would be a valuable addition to a team seeking a curious and responsible contributor with an interest in public-sector technology and mission-focused work.',
  '',
  'Yours sincerely,',
  'Marcus Tan',
  'Mentor, DSTA Digital Hub',
].join('\n');

function downloadRecommendationLetter() {
  const content = [
    'DSTA Recommendation Letter',
    'Issued 1 August 2027',
    '',
    RECOMMENDATION_BODY,
  ].join('\n');
  const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'DSTA-Recommendation-Letter-Jenny-Aw.txt';
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function ApplicantRecommendationLetterPage() {
  const router = useRouter();

  return (
    <Shell activeRoute="/apply/internship" flushTop>
      <div className="relative mx-[calc(-1*clamp(24px,2.6vw,40px))] min-h-[calc(100vh-64px)] bg-bg-subtle">
        <div className="border-b border-border bg-bg px-[clamp(24px,2.6vw,40px)] py-8 sm:py-10">
          <div className="mx-auto w-full max-w-[1120px]">
            <button
              type="button"
              onClick={() => router.push('/apply/dashboard?scenario=journey-completed')}
              className="inline-flex items-center gap-2 text-[14px] font-medium text-fg-muted transition-colors hover:text-fg"
            >
              <ArrowLeft className="size-4" aria-hidden />
              Back to Home
            </button>
            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-fg-muted">Internship record</p>
                <h1 className="mt-2 text-[32px] font-semibold leading-10 tracking-tight text-fg">Recommendation letter</h1>
                <p className="mt-3 max-w-2xl text-[15px] leading-6 text-fg-muted">Your mentor has completed this letter. Review it below or download a copy for your records.</p>
              </div>
              <Badge variant="success" className="w-fit">Available</Badge>
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-[1120px] px-[clamp(24px,2.6vw,40px)] py-8">
          <Card className="overflow-hidden shadow-sm">
            <CardHeader className="border-b border-border bg-surface">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-success-bg text-success">
                    <FileCheck2 className="size-5" aria-hidden />
                  </span>
                  <div>
                    <CardTitle>Recommendation for Jenny Aw</CardTitle>
                    <p className="mt-1 text-[13px] text-fg-muted">Written by Marcus Tan · 1 Aug 2027</p>
                  </div>
                </div>
                <Button onClick={downloadRecommendationLetter} className="w-full sm:w-auto">
                  <Download className="size-4" aria-hidden />
                  Download letter
                </Button>
              </div>
            </CardHeader>
            <CardContent className="bg-bg-muted p-4 sm:p-8">
              <article className="mx-auto max-w-[760px] rounded-lg border border-border bg-surface px-6 py-8 shadow-sm sm:px-12 sm:py-12" aria-label="Recommendation letter content">
                <div className="border-b border-border pb-6">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-accent">Defence Science and Technology Agency</p>
                  <h2 className="mt-2 text-[22px] font-semibold text-fg">Letter of recommendation</h2>
                </div>
                <dl className="mt-6 grid gap-4 text-[13px] sm:grid-cols-2">
                  <div><dt className="text-fg-muted">Candidate</dt><dd className="mt-1 font-medium text-fg">Jenny Aw</dd></div>
                  <div><dt className="text-fg-muted">Programme</dt><dd className="mt-1 font-medium text-fg">University Internship 2027</dd></div>
                  <div><dt className="text-fg-muted">Project</dt><dd className="mt-1 font-medium text-fg">Designing Mission-Critical Digital Services</dd></div>
                  <div><dt className="text-fg-muted">Internship period</dt><dd className="mt-1 font-medium text-fg">2 Jun – 31 Jul 2027</dd></div>
                </dl>
                <div className="mt-8 whitespace-pre-line text-[15px] leading-7 text-fg">{RECOMMENDATION_BODY}</div>
              </article>
            </CardContent>
          </Card>
        </div>
      </div>
    </Shell>
  );
}
