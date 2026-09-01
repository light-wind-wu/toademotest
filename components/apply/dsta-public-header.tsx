'use client';

import Image from 'next/image';
import { Menu, Search, X } from 'lucide-react';
import { useState } from 'react';
import SgMasthead from '@/components/gov/sg-masthead';
import { cn } from '@/lib/utils';

const navigation = [
  { label: 'Home', href: '/' },
  { label: 'Who We Are', href: '/who-we-are' },
  { label: 'What We Do', href: '/what-we-do' },
  { label: 'Join Us', href: '/join-us/student' },
  { label: 'Collaborate With Us', href: '/collaborate-with-us' },
  { label: "What's On", href: '/whats-on' },
  { label: 'Contact Us', href: '/contact' },
];

export default function DstaPublicHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="relative z-30 bg-surface text-fg">
      <SgMasthead />
      <div className="border-b border-border bg-surface">
        <div className="mx-auto flex h-[72px] w-full max-w-[1440px] items-center px-4 sm:px-6 lg:h-[82px] lg:px-10">
          <a href="/" className="inline-flex shrink-0 items-center" aria-label="DSTA home">
            <Image src="/images/dsta-logo.svg" alt="DSTA" width={110} height={54} className="h-12 w-auto object-contain lg:h-14" priority />
          </a>

          <nav className="ml-auto hidden items-center gap-6 text-sm xl:flex" aria-label="DSTA primary navigation">
            {navigation.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className={cn(
                  'border-b-2 border-transparent py-7 font-medium text-fg-muted transition-colors hover:border-accent hover:text-fg',
                  item.label === 'Join Us' && 'border-accent text-fg',
                )}
              >
                {item.label}
              </a>
            ))}
            <button type="button" className="inline-flex size-10 items-center justify-center border border-border text-fg hover:border-accent hover:text-accent" aria-label="Search DSTA website">
              <Search className="size-4" />
            </button>
          </nav>

          <button
            type="button"
            className="ml-auto inline-flex size-11 items-center justify-center text-fg xl:hidden"
            aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((current) => !current)}
          >
            {menuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>

        {menuOpen ? (
          <nav className="border-t border-border bg-surface px-4 py-3 xl:hidden" aria-label="DSTA mobile navigation">
            <div className="mx-auto grid w-full max-w-[1440px] sm:grid-cols-2">
              {navigation.map((item) => (
                <a key={item.label} href={item.href} className={cn('border-b border-border px-2 py-3 text-sm font-medium text-fg-muted hover:text-accent', item.label === 'Join Us' && 'text-accent')}>
                  {item.label}
                </a>
              ))}
            </div>
          </nav>
        ) : null}
      </div>
    </header>
  );
}
