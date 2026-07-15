'use client';

import { FileText, Eye, Download } from 'lucide-react';

/* A clear uploaded-document card with explicit View + Download buttons,
   or a muted "not uploaded" state. Shared by the shortlist + Candidate 360 pages. */
export default function DocLink({ label, name, data }: { label: string; name?: string; data?: string }) {
  if (!data) {
    return (
      <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-dashed border-border">
        <FileText size={15} className="text-fg-subtle shrink-0" />
        <span className="text-body-sm text-fg-muted">{label}</span>
        <span className="ml-auto text-[12px] text-fg-subtle">Not uploaded</span>
      </div>
    );
  }
  const btn = 'flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-body-sm font-semibold text-fg hover:border-accent hover:text-accent hover:bg-accent/5 transition-colors';
  return (
    <div className="px-3 py-2.5 rounded-lg border border-border bg-surface">
      <div className="flex items-center gap-2.5 mb-2.5">
        <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
          <FileText size={16} className="text-accent" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-body-sm font-semibold text-fg truncate">{label}</p>
          {name && <p className="text-[12px] text-fg-muted truncate">{name}</p>}
        </div>
      </div>
      <div className="flex gap-2">
        <a href={data} target="_blank" rel="noreferrer" className={btn}>
          <Eye size={14} /> View
        </a>
        <a href={data} download={name || label} className={btn}>
          <Download size={14} /> Download
        </a>
      </div>
    </div>
  );
}
