import Image from 'next/image';
import Link from 'next/link';

/** Public, signed-out TOA chrome for programme discovery. */
export default function ToaPublicHeader() {
  return (
    <header className="bg-fg text-bg">
      <div className="mx-auto flex min-h-[72px] max-w-[1920px] flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-3 lg:px-16">
        <Link href="/join-us/student/internships" aria-label="Talent Outreach and Acquisition home" className="flex min-w-0 items-center gap-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">
          <Image src="/images/dsta-logo-white.svg" alt="DSTA" width={110} height={54} priority className="h-10 w-auto shrink-0" />
          <span className="text-base font-semibold leading-snug sm:text-xl">Talent Outreach &amp; Acquisition</span>
        </Link>
        <nav aria-label="TOA navigation">
          <Link href="/join-us/student/internships" className="inline-flex min-h-10 items-center text-sm hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">Internship Programmes</Link>
        </nav>
      </div>
    </header>
  );
}
