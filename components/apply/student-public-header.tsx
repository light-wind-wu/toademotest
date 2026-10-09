import Image from 'next/image';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function StudentPublicHeader() {
  return <header className="bg-fg text-bg">
    <div className="mx-auto flex min-h-16 max-w-[1920px] items-center justify-between gap-8 px-6 lg:min-h-[72px] lg:px-16">
      <Image src="/images/dsta-logo-white.svg" alt="DSTA" width={110} height={54} priority className="h-10 w-auto" />
      <nav aria-label="Main navigation" className="hidden items-center gap-8 text-base font-medium lg:flex xl:gap-12">
        {['Home', 'About Us', 'Our Capabilities', 'Partner Us', 'Join Us', 'Highlights', 'Contact Us'].map(label =>
          <span key={label} aria-current={label === 'Join Us' ? 'page' : undefined} className={cn('py-4', label === 'Join Us' && 'border-b-2 border-accent text-accent')}>{label}</span>)}
      </nav>
      <span aria-hidden="true" className="border border-current/30 p-3"><Search className="size-5" /></span>
    </div>
  </header>;
}
