'use client';

import { Award } from 'lucide-react';
import type { Application, ProjectEntry } from '@/lib/types';

export type CertStyle = 'classic' | 'modern' | 'formal';

/* The active certificate style is configured in Templates → Certificates and
   used by both the automatic issue and the manual IO-triggered issue. */
export const ACTIVE_COC_STYLE_KEY = 'dsta_coc_active_style';
export function loadActiveCertStyle(): CertStyle {
  try {
    const s = localStorage.getItem(ACTIVE_COC_STYLE_KEY);
    return s === 'modern' || s === 'formal' || s === 'classic' ? s : 'classic';
  } catch { return 'classic'; }
}
export function saveActiveCertStyle(style: CertStyle) {
  try { localStorage.setItem(ACTIVE_COC_STYLE_KEY, style); } catch {}
}

function fmtDate(d: string | undefined) {
  return d ? new Date(d).toLocaleDateString('en-SG', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
}

/* Shared certificate renderer — used by the issue flow (preview) and the
   interns table (view an already-issued certificate). */
export default function CertificatePreview({ app, project, style, issueDateIso }: {
  app: Application;
  project: ProjectEntry | null;
  style: CertStyle;
  issueDateIso?: string;
}) {
  const issueDate = fmtDate(issueDateIso ?? new Date().toISOString().split('T')[0]);

  if (style === 'classic') return (
    <div style={{
      background: '#fff',
      border: '10px double #00328a',
      outline: '2px solid #c9a84c',
      outlineOffset: '-18px',
      padding: '48px 56px',
      fontFamily: 'Georgia, "Times New Roman", serif',
      position: 'relative',
      minHeight: 520,
    }}>
      {/* Corner ornaments */}
      {['top-2 left-2', 'top-2 right-2', 'bottom-2 left-2', 'bottom-2 right-2'].map(pos => (
        <div key={pos} className={`absolute ${pos} w-8 h-8 text-[#c9a84c] text-xl font-bold flex items-center justify-center`}>✦</div>
      ))}

      {/* Header */}
      <div className="text-center mb-6">
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#00328a', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Award size={26} color="#fff" />
        </div>
        <p style={{ fontSize: 11, letterSpacing: 4, color: '#666', textTransform: 'uppercase', marginBottom: 6 }}>Defence Science and Technology Agency</p>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#00328a', letterSpacing: 2, textTransform: 'uppercase', margin: 0 }}>Certificate of Completion</h1>
        <div style={{ width: 80, height: 2, background: '#c9a84c', margin: '12px auto' }} />
      </div>

      {/* Body */}
      <div className="text-center space-y-3">
        <p style={{ fontSize: 14, color: '#555', fontStyle: 'italic' }}>This is to certify that</p>
        <p style={{ fontSize: 30, fontWeight: 700, color: '#00328a', letterSpacing: 1, lineHeight: 1.2 }}>{app.name}</p>
        <p style={{ fontSize: 13, color: '#666' }}>{app.school}</p>
        <p style={{ fontSize: 14, color: '#444', maxWidth: 480, margin: '0 auto', lineHeight: 1.8 }}>
          has successfully completed an internship with DSTA from{' '}
          <strong>{fmtDate(app.internshipStartDate)}</strong> to <strong>{fmtDate(app.internshipEndDate)}</strong>
        </p>
        {project && (
          <div style={{ background: '#f4f6fb', borderLeft: '3px solid #00328a', padding: '10px 16px', maxWidth: 400, margin: '0 auto', textAlign: 'left' }}>
            <p style={{ fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Programme · Project</p>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', margin: 0 }}>{app.programmeName}</p>
            <p style={{ fontSize: 12, color: '#555', margin: '2px 0 0' }}>{project.title}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 40 }}>
        <p style={{ fontSize: 12, color: '#888' }}>Issued: {issueDate}</p>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 120, borderTop: '1px solid #333', marginBottom: 4 }} />
          <p style={{ fontSize: 11, color: '#555', margin: 0 }}>Director, Internship Office</p>
          <p style={{ fontSize: 10, color: '#888', margin: '2px 0 0' }}>Defence Science and Technology Agency</p>
        </div>
      </div>
    </div>
  );

  if (style === 'modern') return (
    <div style={{
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderLeft: '8px solid #00328a',
      borderRadius: 4,
      padding: '44px 52px',
      fontFamily: '"Segoe UI", system-ui, sans-serif',
      position: 'relative',
      minHeight: 520,
      boxShadow: '0 4px 24px rgba(0,50,138,0.08)',
    }}>
      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 36, paddingBottom: 20, borderBottom: '2px solid #f0f0f0' }}>
        <div style={{ width: 48, height: 48, borderRadius: 10, background: '#00328a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Award size={24} color="#fff" />
        </div>
        <div>
          <p style={{ fontSize: 10, letterSpacing: 3, color: '#00328a', textTransform: 'uppercase', margin: 0, fontWeight: 700 }}>Defence Science and Technology Agency</p>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: '4px 0 0', letterSpacing: 0.5 }}>Certificate of Completion</h1>
        </div>
        <p style={{ marginLeft: 'auto', fontSize: 12, color: '#94a3b8', flexShrink: 0 }}>{issueDate}</p>
      </div>

      {/* Recipient */}
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>Awarded to</p>
        <p style={{ fontSize: 34, fontWeight: 800, color: '#00328a', margin: '0 0 4px', lineHeight: 1.1 }}>{app.name}</p>
        <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>{app.school}</p>
      </div>

      {/* Description */}
      <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.8, marginBottom: 28 }}>
        has successfully completed an internship programme with DSTA from{' '}
        <span style={{ fontWeight: 600, color: '#0f172a' }}>{fmtDate(app.internshipStartDate)}</span>
        {' '}to{' '}
        <span style={{ fontWeight: 600, color: '#0f172a' }}>{fmtDate(app.internshipEndDate)}</span>.
      </p>

      {/* Details grid */}
      <div style={{ display: 'grid', gridTemplateColumns: project ? '1fr 1fr' : '1fr', gap: 12, marginBottom: 40 }}>
        <div style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 16px' }}>
          <p style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 }}>Programme</p>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', margin: 0 }}>{app.programmeName}</p>
        </div>
        {project && (
          <div style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 16px' }}>
            <p style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 }}>Project</p>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', margin: 0 }}>{project.title}</p>
          </div>
        )}
      </div>

      {/* Signature */}
      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
        <div>
          <div style={{ width: 140, borderTop: '2px solid #00328a', marginBottom: 8 }} />
          <p style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', margin: 0 }}>Director, Internship Office</p>
          <p style={{ fontSize: 11, color: '#64748b', margin: '2px 0 0' }}>Defence Science and Technology Agency</p>
        </div>
      </div>
    </div>
  );

  /* Formal */
  return (
    <div style={{
      background: '#fdfbf7',
      border: '2px solid #b8975a',
      padding: '4px',
      fontFamily: 'Georgia, "Times New Roman", serif',
      minHeight: 520,
    }}>
      <div style={{ border: '1px solid #b8975a', padding: '44px 56px', background: '#fdfbf7', minHeight: 508 }}>

        {/* Top ornament */}
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' }}>
            <div style={{ height: 1, flex: 1, background: 'linear-gradient(to right, transparent, #b8975a)' }} />
            <span style={{ color: '#b8975a', fontSize: 18 }}>✦ ✦ ✦</span>
            <div style={{ height: 1, flex: 1, background: 'linear-gradient(to left, transparent, #b8975a)' }} />
          </div>
        </div>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <p style={{ fontSize: 10, letterSpacing: 5, color: '#b8975a', textTransform: 'uppercase', margin: '8px 0' }}>Defence Science and Technology Agency</p>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1a1209', letterSpacing: 3, textTransform: 'uppercase', margin: '8px 0' }}>Certificate of Completion</h1>
          <div style={{ width: 60, height: 1, background: '#b8975a', margin: '12px auto' }} />
        </div>

        {/* Body */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <p style={{ fontSize: 14, color: '#5a4a2a', fontStyle: 'italic', marginBottom: 12 }}>This is to certify that</p>
          <p style={{ fontSize: 32, fontWeight: 700, color: '#1a1209', letterSpacing: 1, lineHeight: 1.2, marginBottom: 6 }}>{app.name}</p>
          <p style={{ fontSize: 12, color: '#7a6040', letterSpacing: 1, marginBottom: 20 }}>{app.school}</p>
          <p style={{ fontSize: 14, color: '#3a2c1a', lineHeight: 2, maxWidth: 460, margin: '0 auto' }}>
            has successfully fulfilled the requirements of the{' '}
            <em style={{ fontWeight: 600 }}>{app.programmeName}</em>{' '}
            internship programme, serving from{' '}
            <strong>{fmtDate(app.internshipStartDate)}</strong>{' '}
            to <strong>{fmtDate(app.internshipEndDate)}</strong>.
          </p>
          {project && (
            <p style={{ fontSize: 13, color: '#5a4a2a', marginTop: 12, fontStyle: 'italic' }}>
              Project: {project.title}
            </p>
          )}
        </div>

        {/* Bottom ornament + signature */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 20 }}>
          <p style={{ fontSize: 11, color: '#9a8060' }}>{issueDate}</p>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 130, borderTop: '1px solid #b8975a', marginBottom: 6 }} />
            <p style={{ fontSize: 11, color: '#3a2c1a', fontWeight: 600, margin: 0 }}>Director, Internship Office</p>
            <p style={{ fontSize: 10, color: '#9a8060', margin: '2px 0 0' }}>Defence Science and Technology Agency</p>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' }}>
            <div style={{ height: 1, flex: 1, background: 'linear-gradient(to right, transparent, #b8975a)' }} />
            <span style={{ color: '#b8975a', fontSize: 14 }}>✦ ✦ ✦</span>
            <div style={{ height: 1, flex: 1, background: 'linear-gradient(to left, transparent, #b8975a)' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
