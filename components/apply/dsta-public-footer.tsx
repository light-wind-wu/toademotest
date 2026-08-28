import { cn } from '@/lib/utils';

const legalLinks = ['Sitemap', 'Report Vulnerability', 'Privacy Statement', 'Terms of Use', 'REACH'];

export default function DstaPublicFooter({ className }: { className?: string }) {
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
