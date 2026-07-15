'use client';

/* Singapore Government masthead (GovTech DSS). The thin "A Singapore Government
   Agency Website" bar with an expandable "How to identify" panel — a required
   public-touchpoint control. Faithful port of the design handoff's SgMasthead. */
import { useState } from 'react';
import { ChevronDown, Landmark, Lock } from 'lucide-react';

function SgFlag() {
  return (
    <svg width="20" height="14" viewBox="0 0 20 14" aria-hidden="true" className="rounded-[2px] shrink-0 shadow-[0_0_0_0.5px_rgba(0,0,0,0.15)]">
      <rect width="20" height="7" fill="#ED2939" />
      <rect y="7" width="20" height="7" fill="#fff" />
      <circle cx="4.3" cy="3.5" r="2.3" fill="#fff" />
      <circle cx="5.4" cy="3.5" r="2.3" fill="#ED2939" />
      <g fill="#fff">
        {[[7.2, 2.0], [8.6, 2.0], [6.75, 3.3], [9.05, 3.3], [7.9, 4.2]].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="0.42" />
        ))}
      </g>
    </svg>
  );
}

export default function SgMasthead() {
  const [open, setOpen] = useState(false);
  return (
    <div className="w-full bg-bg-subtle border-b border-border text-fg-muted" role="region" aria-label="Singapore Government masthead">
      <div className="mx-auto max-w-[1280px] px-4 md:px-8 h-7 flex items-center gap-2 text-[12px]">
        <SgFlag />
        <span>A Singapore Government Agency Website</span>
        <button
          className="inline-flex items-center gap-1 font-semibold text-fg-muted hover:text-accent transition-colors"
          aria-expanded={open}
          onClick={() => setOpen(o => !o)}
        >
          How to identify
          <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>
      {open && (
        <div className="bg-surface border-t border-border">
          <div className="mx-auto max-w-[1280px] px-4 md:px-8 py-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="flex items-start gap-3">
              <Landmark size={18} className="text-accent mt-0.5 shrink-0" />
              <div>
                <p className="text-body-sm font-semibold text-fg mb-0.5">Official website links end with .gov.sg</p>
                <p className="text-[13px] text-fg-muted leading-relaxed">
                  Government agencies communicate via <strong className="text-fg">.gov.sg</strong> websites
                  (e.g. go.gov.sg/open). <span className="text-accent">Trusted websites</span>
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Lock size={18} className="text-accent mt-0.5 shrink-0" />
              <div>
                <p className="text-body-sm font-semibold text-fg mb-0.5">Secure websites use HTTPS</p>
                <p className="text-[13px] text-fg-muted leading-relaxed">
                  Look for a lock (<Lock size={11} className="inline -mt-0.5" />) or <strong className="text-fg">https://</strong> as
                  an added precaution. Share sensitive information only on official, secure websites.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
