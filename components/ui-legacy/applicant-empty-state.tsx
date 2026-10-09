import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ApplicantWorkspaceKind } from '@/lib/types';

const copy = {
  applications: ['No applications', 'Submitted applications will be listed here with the latest status.'],
  interviews: ['No interviews yet', 'Interview invitations and completed interviews will appear here.'],
  offers: ['No offers yet', 'Internship offers and your decisions will appear here.'],
  internship: ['No internship record yet', 'Your internship record will appear after you accept an offer.'],
};

export function ApplicantEmptyIllustration({ type = 'applications' }: { type?: ApplicantWorkspaceKind }) {
  const short = type === 'offers' || type === 'internship';
  return <div className="relative h-28 w-[302px] max-w-full shrink-0 overflow-hidden" aria-hidden>
    <div className={cn('absolute left-5 w-[252px] overflow-hidden', short ? 'top-[21px] h-[83px]' : 'top-3 h-[92px]')}>
      {/* Preserve the original Figma sprite crop without editing the artwork. */}
      <img alt="" src={type === 'offers' ? '/images/applicant-empty-offer.png' : '/images/applicant-empty-sheet.png'} className={cn('pointer-events-none absolute max-w-none', type === 'offers' ? 'inset-0 h-full w-full object-cover' : 'w-[225%]', type === 'applications' && 'left-[-8.33%] top-0 h-[205.43%]', type === 'interviews' && 'left-[-115.08%] top-0 h-[205.43%]', type === 'internship' && 'left-[-115.08%] top-[-113.25%] h-[227.71%]')} />
    </div>
  </div>;
}

export function ApplicantEmptyState({ type, title, description, className }: { type: ApplicantWorkspaceKind; title?: string; description?: string; className?: string }) {
  return <Card className={cn('flex min-h-[332px] flex-col items-center justify-center px-6 py-12 text-center shadow-none', className)}>
    <ApplicantEmptyIllustration type={type} />
    <h2 className="text-sm font-semibold text-fg">{title || copy[type][0]}</h2>
    <p className="mt-1 max-w-lg text-sm leading-5 text-fg-muted">{description || copy[type][1]}</p>
  </Card>;
}
