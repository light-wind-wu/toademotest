import Image from 'next/image';
import { ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const legalLinks = ['Sitemap', 'Report Vulnerability', 'Privacy Statement', 'Terms of Use', 'REACH'];

const footerNavigation = [
  {
    title: 'Who We Are',
    links: ['About Us', 'DSTA Board', 'DSTA Management', 'Awards and Accolades', 'With the Community'],
  },
  {
    title: 'What We Do',
    links: ['Digital', 'Engineering', 'Procurement & Corporate', 'DSTA@Medium'],
  },
  {
    title: 'Join Us',
    links: ['DSTA Internships', 'DSTA Scholarships', 'Young Defence Scientists Programme', 'Tech UP', 'DSTA Careers', 'Existing Applicant Login'],
  },
  {
    title: 'Collaborate With Us',
    links: ['Doing Business with MINDEF', 'Partnering the Tech Industry', 'Introduce Your Company'],
  },
  {
    title: "What's On",
    links: ['Spotlight', 'News Releases', 'Contact Us', 'Feedback'],
  },
];

export default function DstaPublicFooter({ className, full = false }: { className?: string; full?: boolean }) {
  if (full) {
    return (
      <footer className={cn('text-white', className)}>
        <div className="bg-[#2f2f2f] px-4 py-10 sm:px-6 lg:px-10 lg:py-12">
          <div className="mx-auto w-full max-w-[1360px]">
            <div className="grid gap-0 lg:grid-cols-[180px_repeat(5,minmax(0,1fr))] lg:gap-7">
              <a href="#top" className="mb-7 inline-flex h-fit w-fit py-2 lg:mb-0" aria-label="DSTA home">
                <Image src="/images/dsta-logo-white.svg" alt="DSTA" width={132} height={58} className="h-14 w-auto object-contain" />
              </a>
              {footerNavigation.map((section) => (
                <section key={section.title}>
                  <h2 className="border-b border-white/20 py-4 text-sm font-semibold text-white lg:border-0 lg:py-0">{section.title}</h2>
                  <ul className="mt-3 hidden space-y-2.5 text-sm text-white/75 lg:block">
                    {section.links.map((link) => (
                      <li key={link}><a href="#" className="leading-5 hover:text-white hover:underline">{link}</a></li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>

            <div className="mt-10 flex flex-col gap-5 border-t border-white/15 pt-6 text-sm text-white/80 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                <a href="#" className="hover:text-white">Contact Us</a>
                <a href="#" className="hover:text-white">Feedback</a>
                <a href="#" className="hover:text-white">Facebook</a>
                <a href="#" className="hover:text-white">Instagram</a>
                <a href="#" className="hover:text-white">LinkedIn</a>
                <a href="#" className="hover:text-white">TikTok</a>
              </div>
              <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="inline-flex w-fit items-center gap-2 border border-white/30 px-4 py-2.5 text-sm font-medium text-white hover:border-white">
                <ChevronUp className="size-4" />Back to top
              </button>
            </div>
          </div>
        </div>

        <div className="bg-[#22386f] px-4 py-6 sm:px-6 lg:px-10">
          <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-4 text-xs text-white/85 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p>Best viewed in Chrome, Firefox, Edge and Safari.</p>
              <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                {legalLinks.map((link) => <li key={link}><a href="#" className="hover:text-white hover:underline">{link}</a></li>)}
              </ul>
            </div>
            <div className="space-y-1 lg:text-right">
              <p>© 2026, Government of Singapore</p>
              <p>Last updated: 31 Aug 2026</p>
            </div>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className={cn('border-t border-border bg-bg-subtle text-fg', className)}>
      <div className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 lg:px-10">
        <div className="flex flex-col gap-5 text-xs text-fg-muted lg:flex-row lg:items-center lg:justify-between">
          <p>© 2026 Government of Singapore · Last updated 27 Jul 2026</p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {legalLinks.map((link) => (
              <li key={link}>
                <button type="button" className="cursor-pointer hover:text-accent">
                  {link}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
