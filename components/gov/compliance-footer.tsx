'use client';

/* GovTech DSS compliant footer — Contact / Feedback / Privacy / Terms / Report
   Vulnerability, © Government of Singapore, last-updated + classification echo.
   Shown on public touchpoints (the sign-in screens). */
const LINKS = ['Contact', 'Feedback', 'Privacy Statement', 'Terms of Use', 'Report Vulnerability'];

export default function ComplianceFooter({ classification = 'OFFICIAL (OPEN)' }: { classification?: string }) {
  return (
    <footer className="w-full border-t border-border bg-bg-subtle mt-auto">
      <div className="mx-auto max-w-[1280px] px-4 md:px-8 py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center shrink-0">
              <span className="text-white text-[11px] font-black">DSTA</span>
            </div>
            <div>
              <p className="text-body-sm font-semibold text-fg leading-tight">Defence Science and Technology Agency</p>
              <p className="text-[12px] text-fg-muted">Talent Outreach &amp; Acquisition</p>
            </div>
          </div>
          <nav className="flex flex-wrap gap-x-4 gap-y-1" aria-label="Footer">
            {LINKS.map(l => (
              <a key={l} href="#" onClick={e => e.preventDefault()}
                className="text-[13px] text-fg-muted hover:text-accent transition-colors">{l}</a>
            ))}
          </nav>
        </div>
        <div className="mt-4 pt-4 border-t border-border flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between text-[12px] text-fg-subtle">
          <span>© {new Date().getFullYear()} Government of Singapore</span>
          <span className="flex items-center gap-3">
            <span>{classification}</span>
            <span aria-hidden>·</span>
            <span>Last updated {new Date().toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
