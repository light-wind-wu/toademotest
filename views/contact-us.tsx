'use client';

import { usePathname } from 'next/navigation';
import { Mail } from 'lucide-react';
import Shell from '@/components/layout/shell';

const CONTACTS = [
  { title: 'Internships', email: 'internship@dsta.gov.sg' },
  { title: 'Scholarships', email: 'scholarship@dsta.gov.sg' },
  { title: 'Young Defence Scientists Programme (YDSP)', email: 'ydsp@dsta.gov.sg' },
];

export default function ContactUsPage() {
  const pathname = usePathname();

  return (
    <Shell activeRoute={pathname}>
      <div className="py-6 md:py-8">
        <h1 className="text-headline-lg text-fg">Contact Us</h1>
        <div className="mt-8 max-w-3xl divide-y divide-border">
          {CONTACTS.map(({ title, email }) => (
            <section key={email} className="py-6 first:pt-0">
              <h2 className="text-body-lg font-semibold text-fg">{title}</h2>
              <a
                href={`mailto:${email}`}
                className="mt-2 inline-flex max-w-full items-center gap-2 rounded-sm text-body-md text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
              >
                <Mail size={18} className="shrink-0" aria-hidden />
                <span className="break-all">{email}</span>
              </a>
            </section>
          ))}
        </div>
      </div>
    </Shell>
  );
}
