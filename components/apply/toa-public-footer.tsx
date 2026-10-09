import { Mail } from 'lucide-react';

export default function ToaPublicFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex max-w-[1920px] flex-col gap-3 px-6 py-6 text-sm text-fg-muted sm:flex-row sm:items-center sm:justify-between lg:px-16">
        <div>
          <p className="font-medium text-fg">Talent Outreach &amp; Acquisition</p>
          <p className="mt-1 text-xs">© {new Date().getFullYear()} Government of Singapore</p>
        </div>
        <a href="mailto:internship@dsta.gov.sg" className="inline-flex min-h-10 items-center gap-2 text-accent hover:underline"><Mail aria-hidden className="size-4" />internship@dsta.gov.sg</a>
      </div>
    </footer>
  );
}
