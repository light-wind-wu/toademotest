'use client';

import { useState, useEffect } from 'react';
import Shell from '@/components/layout/shell';
import {
  Plus, Pencil, Trash2, Shield, X,
  FileText, Mail, FileSignature, Award, Wrench, Download, TableProperties, Check,
} from 'lucide-react';
import { RowMenuButton, RowDropdown, DropdownItem, DropdownDivider } from '@/components/ui-legacy/row-actions';
import Button from '@/components/ui-legacy/button';
import Modal from '@/components/ui-legacy/modal';
import { Toast, useToast } from '@/components/ui-legacy/toast';
import TableToolbar from '@/components/ui-legacy/table-toolbar';
import type { FilterDef, ActiveFilter } from '@/components/filter-panel';
import { AppFormTemplate, EmailTemplate, OfferLetterTemplate, WelcomeLetterTemplate, CertificateTemplate } from '@/lib/types';
import { exportToCSV, exportProjectTemplateXLSX } from '@/lib/utils';
import { PROJECT_SUBMISSION_COLUMNS, COLUMN_SECTIONS, loadLiveProgrammeOptions, type ProjectSubmissionColumn, type ColumnSection } from '@/lib/data';
import { loadRequests } from '@/lib/storage';
import { useRole } from '@/lib/role';
import { useRouter } from 'next/navigation';
import appFormSeed from '@/data/app-form-templates.json';
import emailSeed from '@/data/email-templates.json';
import offerLetterSeed from '@/data/offer-letter-templates.json';
import welcomeLetterSeed from '@/data/welcome-letter-templates.json';
import certificateSeed from '@/data/certificate-templates.json';
import { loadActiveCertStyle, saveActiveCertStyle, type CertStyle } from '@/components/certificate-preview';


const AFT_KEY      = 'dsta_app_form_templates';
const AFT_SEED_VER = '23';
const AFT_VER_KEY  = 'dsta_app_form_templates_seed_v';
const ET_KEY       = 'dsta_email_templates';
const ET_SEED_VER  = '9';
const ET_VER_KEY   = 'dsta_email_templates_seed_v';

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ─── WIP placeholder ────────────────────────────────────────────────────── */
function WipTab({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <div className="w-14 h-14 rounded-full bg-bg-subtle flex items-center justify-center">
        <Wrench size={22} className="text-fg-subtle" />
      </div>
      <div>
        <p className="text-headline-sm text-fg font-semibold">{label}</p>
        <p className="text-body-sm text-fg-muted mt-1 max-w-xs">
          This feature is under development and will be available in a future release.
        </p>
      </div>
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-warning-bg text-warning text-caption-bold font-bold uppercase text-[13px]">
        <Wrench size={11} />Work in Progress
      </span>
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════════════════
   APPLICATION FORM TEMPLATES
══════════════════════════════════════════════════════════════════════════ */
const AFT_COL_DEFS = [
  { key: 'name',      label: 'Template Name' },
  { key: 'updatedAt', label: 'Last Updated'  },
] as const;
type AftColKey = typeof AFT_COL_DEFS[number]['key'];

const AFT_FILTER_DEFS: FilterDef[] = [];

function AppFormsTab() {
  const [templates, setTemplates]       = useState<AppFormTemplate[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<AppFormTemplate | null>(null);
  const { toast, showToast }            = useToast();
  const [search, setSearch]             = useState('');
  const [aftFilters, setAftFilters]     = useState<ActiveFilter[]>([]);
  const [aftCols, setAftCols]           = useState<Record<AftColKey, boolean>>({ name: true, updatedAt: true });
  const [menuOpen, setMenuOpen]         = useState(false);
  const [menuPos, setMenuPos]           = useState({ top: 0, right: 0 });
  const [menuTarget, setMenuTarget]     = useState<AppFormTemplate | null>(null);
  const router = useRouter();

  function openMenu(e: React.MouseEvent, t: AppFormTemplate) {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    setMenuTarget(t);
    setMenuOpen(true);
  }

  useEffect(() => {
    const seed = appFormSeed as AppFormTemplate[];
    const savedVer = localStorage.getItem(AFT_VER_KEY);
    if (savedVer !== AFT_SEED_VER) {
      localStorage.setItem(AFT_KEY, JSON.stringify(seed));
      localStorage.setItem(AFT_VER_KEY, AFT_SEED_VER);
      setTemplates(seed);
      return;
    }
    const raw = localStorage.getItem(AFT_KEY);
    if (raw) {
      setTemplates(JSON.parse(raw));
    } else {
      localStorage.setItem(AFT_KEY, JSON.stringify(seed));
      setTemplates(seed);
    }
  }, []);

  function doDelete(t: AppFormTemplate) {
    const next = templates.filter(x => x.id !== t.id);
    setTemplates(next);
    localStorage.setItem(AFT_KEY, JSON.stringify(next));
    setDeleteTarget(null);
    showToast('Template deleted.');
  }

  const AFT_COLS_KEY = 'dsta_tmpl_aft_cols';
  useEffect(() => {
    try { const s = localStorage.getItem(AFT_COLS_KEY); if (s) setAftCols(prev => ({ ...prev, ...JSON.parse(s) })); } catch {}
  }, []);
  function toggleAftCol(key: string) {
    setAftCols(prev => {
      const next = { ...prev, [key]: !prev[key as AftColKey] };
      try { localStorage.setItem(AFT_COLS_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  const filtered = templates.filter(t =>
    !search || t.name.toLowerCase().includes(search.toLowerCase())
  );

  const visibleColCount = AFT_COL_DEFS.filter(c => aftCols[c.key]).length + 1; // +1 for actions

  return (
    <>
      

      <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-sm">
        <TableToolbar
          search={search}
          onSearch={setSearch}
          placeholder="Search templates…"
          filterDefs={AFT_FILTER_DEFS}
          filters={aftFilters}
          onFiltersChange={setAftFilters}
          colDefs={AFT_COL_DEFS as unknown as { key: string; label: string }[]}
          visibleCols={aftCols}
          onToggleCol={toggleAftCol}
          onExport={() => exportToCSV(
            'app-form-templates.csv',
            ['Template Name', 'Last Updated'],
            filtered.map(t => [t.name, t.updatedAt]),
          )}
        />

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-bg-subtle border-b border-border">
              <tr>
                {aftCols.name      && <th className="px-4 py-3 text-table-header tracking-wider text-fg">Template Name</th>}
                {aftCols.updatedAt && <th className="px-4 py-3 text-table-header tracking-wider text-fg">Last Updated</th>}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 && (
                <tr><td colSpan={visibleColCount} className="px-6 py-16 text-center text-body-md text-fg-muted">
                  {search || aftFilters.length > 0 ? 'No templates match your search.' : 'No templates configured.'}
                </td></tr>
              )}
              {filtered.map(t => (
                <tr key={t.id} onClick={() => router.push(`/templates/${t.id}`)} className="hover:bg-bg-subtle/50 transition-colors cursor-pointer">
                  {aftCols.name      && <td className="px-4 py-3 text-body-md font-semibold text-fg">{t.name}</td>}
                  {aftCols.updatedAt && <td className="px-4 py-3 text-body-sm text-fg-muted">{formatDate(t.updatedAt)}</td>}
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <RowMenuButton onClick={e => openMenu(e, t)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-border text-body-sm text-fg-muted bg-surface">
          {filtered.length} of {templates.length} template{templates.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* 3-dot menu */}
      {menuOpen && menuTarget && (
        <RowDropdown pos={menuPos} onClose={() => setMenuOpen(false)}>
          <DropdownItem icon={<Pencil size={15} className="text-fg-muted" />} label="Edit" onClick={() => { router.push(`/templates/${menuTarget.id}`); setMenuOpen(false); }} />
          <DropdownDivider />
          <DropdownItem icon={<Trash2 size={15} />} label="Delete" danger onClick={() => { setDeleteTarget(menuTarget); setMenuOpen(false); }} />
        </RowDropdown>
      )}

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} labelledBy="appform-delete-title">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-danger-bg flex items-center justify-center shrink-0">
            <Trash2 size={18} className="text-danger" />
          </div>
          <div>
            <h3 id="appform-delete-title" className="text-headline-sm text-fg font-semibold">Delete template?</h3>
            <p className="text-body-sm text-fg-muted mt-1">
              <span className="font-semibold text-fg">"{deleteTarget?.name}"</span> will be permanently removed.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="danger" onClick={() => deleteTarget && doDelete(deleteTarget)}><Trash2 size={15} />Delete</Button>
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
        </div>
      </Modal>
      <Toast message={toast} />
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   EMAIL TEMPLATES
══════════════════════════════════════════════════════════════════════════ */
const ET_COL_DEFS = [
  { key: 'name',      label: 'Template Name' },
  { key: 'trigger',   label: 'Trigger'       },
  { key: 'updatedAt', label: 'Last Updated'  },
] as const;
type EtColKey = typeof ET_COL_DEFS[number]['key'];

const ET_FILTER_DEFS: FilterDef[] = [
  {
    key: 'trigger',
    label: 'Trigger',
    options: [
      { value: 'Manual',    label: 'Manual'    },
      { value: 'Automatic', label: 'Automatic' },
    ],
  },
];

function EmailTemplatesTab() {
  const [templates, setTemplates]       = useState<EmailTemplate[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<EmailTemplate | null>(null);
  const { toast, showToast }            = useToast();
  const [search, setSearch]             = useState('');
  const [etFilters, setEtFilters]       = useState<ActiveFilter[]>([]);
  const [etCols, setEtCols]             = useState<Record<EtColKey, boolean>>({ name: true, trigger: true, updatedAt: true });
  const [menuOpen, setMenuOpen]         = useState(false);
  const [menuPos, setMenuPos]           = useState({ top: 0, right: 0 });
  const [menuTarget, setMenuTarget]     = useState<EmailTemplate | null>(null);
  const [panel, setPanel]               = useState<EmailTemplate | null>(null);
  const [panelMode, setPanelMode]       = useState<'view' | 'edit'>('view');
  const [editName, setEditName]         = useState('');
  const [editSubject, setEditSubject]   = useState('');
  const [editBody, setEditBody]         = useState('');
  const [editCategory, setEditCategory] = useState<'project-request' | 'application'>('application');

  function openMenu(e: React.MouseEvent, t: EmailTemplate) {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    setMenuTarget(t);
    setMenuOpen(true);
  }

  function openPanel(t: EmailTemplate, mode: 'view' | 'edit' = 'view') {
    setPanel(t);
    setPanelMode(mode);
    setEditName(t.name);
    setEditSubject(t.subject);
    setEditBody(t.body);
    setEditCategory(t.category ?? 'application');
  }

  function saveEdit() {
    if (!panel) return;
    const updated: EmailTemplate = {
      ...panel,
      name: editName.trim(),
      subject: editSubject.trim(),
      body: editBody,
      category: editCategory,
      updatedAt: new Date().toISOString().split('T')[0],
    };
    const next = templates.map(t => t.id === updated.id ? updated : t);
    setTemplates(next);
    localStorage.setItem(ET_KEY, JSON.stringify(next));
    setPanel(updated);
    setPanelMode('view');
    showToast('Template saved.');
  }

  useEffect(() => {
    const seed = emailSeed as EmailTemplate[];
    const savedVer = localStorage.getItem(ET_VER_KEY);
    if (savedVer !== ET_SEED_VER) {
      localStorage.setItem(ET_KEY, JSON.stringify(seed));
      localStorage.setItem(ET_VER_KEY, ET_SEED_VER);
      setTemplates(seed);
      return;
    }
    const raw = localStorage.getItem(ET_KEY);
    if (raw) {
      setTemplates(JSON.parse(raw));
    } else {
      localStorage.setItem(ET_KEY, JSON.stringify(seed));
      setTemplates(seed);
    }
  }, []);

  function doDelete(t: EmailTemplate) {
    const next = templates.filter(x => x.id !== t.id);
    setTemplates(next);
    localStorage.setItem(ET_KEY, JSON.stringify(next));
    setDeleteTarget(null);
    if (panel?.id === t.id) setPanel(null);
    showToast('Template deleted.');
  }

  const ET_COLS_KEY = 'dsta_tmpl_et_cols';
  useEffect(() => {
    try { const s = localStorage.getItem(ET_COLS_KEY); if (s) setEtCols(prev => ({ ...prev, ...JSON.parse(s) })); } catch {}
  }, []);
  function toggleEtCol(key: string) {
    setEtCols(prev => {
      const next = { ...prev, [key]: !prev[key as EtColKey] };
      try { localStorage.setItem(ET_COLS_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  const triggerFilter = etFilters.find(f => f.key === 'trigger');
  const filtered = templates.filter(t => {
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (triggerFilter && triggerFilter.values.length > 0 && !triggerFilter.values.includes(t.trigger)) return false;
    return true;
  });

  const visibleColCount = ET_COL_DEFS.filter(c => etCols[c.key]).length + 1;

  return (
    <>
      

      <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-sm">
        <TableToolbar
          search={search}
          onSearch={setSearch}
          placeholder="Search templates…"
          filterDefs={ET_FILTER_DEFS}
          filters={etFilters}
          onFiltersChange={setEtFilters}
          colDefs={ET_COL_DEFS as unknown as { key: string; label: string }[]}
          visibleCols={etCols}
          onToggleCol={toggleEtCol}
          onExport={() => exportToCSV(
            'email-templates.csv',
            ['Template Name', 'Trigger', 'Subject', 'Last Updated'],
            filtered.map(t => [t.name, t.trigger, t.subject, t.updatedAt]),
          )}
        />

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-bg-subtle border-b border-border">
              <tr>
                {etCols.name      && <th className="px-4 py-3 text-table-header tracking-wider text-fg">Template Name</th>}
                {etCols.trigger   && <th className="px-4 py-3 text-table-header tracking-wider text-fg">Trigger</th>}
                {etCols.updatedAt && <th className="px-4 py-3 text-table-header tracking-wider text-fg">Last Updated</th>}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 && (
                <tr><td colSpan={visibleColCount} className="px-6 py-16 text-center text-body-md text-fg-muted">
                  {search || etFilters.length > 0 ? 'No templates match your search.' : 'No templates configured.'}
                </td></tr>
              )}
              {filtered.map(t => (
                <tr key={t.id} onClick={() => openPanel(t)} className="hover:bg-bg-subtle/50 transition-colors cursor-pointer">
                  {etCols.name      && <td className="px-4 py-3 text-body-md font-semibold text-fg">{t.name}</td>}
                  {etCols.trigger   && <td className="px-4 py-3 text-body-sm text-fg-muted">{t.trigger}</td>}
                  {etCols.updatedAt && <td className="px-4 py-3 text-body-sm text-fg-muted">{formatDate(t.updatedAt)}</td>}
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <RowMenuButton onClick={e => openMenu(e, t)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-border text-body-sm text-fg-muted bg-surface">
          {filtered.length} of {templates.length} template{templates.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* 3-dot menu */}
      {menuOpen && menuTarget && (
        <RowDropdown pos={menuPos} onClose={() => setMenuOpen(false)}>
          <DropdownItem icon={<Pencil size={15} className="text-fg-muted" />} label="Edit" onClick={() => { openPanel(menuTarget, 'edit'); setMenuOpen(false); }} />
          <DropdownDivider />
          <DropdownItem icon={<Trash2 size={15} />} label="Delete" danger onClick={() => { setDeleteTarget(menuTarget); setMenuOpen(false); }} />
        </RowDropdown>
      )}

      {/* Detail / Edit modal */}
      {panel && (
        <>
          <div className="fixed inset-0 bg-fg/30 z-[210]" onClick={() => setPanel(null)} />
          <div className="fixed top-1/2 left-1/2 bg-surface rounded-2xl shadow-2xl z-[220] w-full max-w-2xl flex flex-col modal-animate" style={{ transform: 'translate(-50%,-50%)', maxHeight: '90vh' }}>
            <div className="flex items-start justify-between px-6 py-5 border-b border-border shrink-0">
              <div>
                <p className="text-[13px] font-bold uppercase tracking-wider text-fg-muted mb-1">Email Template</p>
                <h2 className="text-headline-md text-fg">{panelMode === 'edit' ? 'Edit Template' : panel.name}</h2>
              </div>
              <button onClick={() => setPanel(null)} className="p-2 rounded-full hover:bg-bg-subtle text-fg-muted transition-all ml-4 shrink-0">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {panelMode === 'view' ? (
                <>
                  <div className="bg-surface border border-border rounded-xl overflow-hidden">
                    <div className="px-5 py-3 bg-bg-subtle border-b border-border space-y-1.5">
                      {([['To', '{{pc_email}}'], ['Subject', panel.subject]] as [string, string][]).map(([k, v]) => (
                        <div key={k} className="flex gap-3 text-body-sm">
                          <span className="text-fg-muted w-16 shrink-0 font-medium">{k}</span>
                          <span className="text-fg font-medium">{v}</span>
                        </div>
                      ))}
                    </div>
                    <div className="px-5 py-4 text-body-sm text-fg leading-6 whitespace-pre-wrap font-sans">
                      {panel.body}
                    </div>
                    <div className="px-5 py-2 border-t border-border bg-bg-subtle">
                      <p className="text-[13px] text-fg-muted">
                        {'{{placeholders}}'} are filled automatically when the email is sent.
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-table-header tracking-wider text-fg-muted mb-1.5">Last Updated</p>
                    <p className="text-body-sm text-fg-muted">{formatDate(panel.updatedAt)}</p>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-label-md text-fg mb-1.5">Template Name <span className="text-danger">*</span></label>
                    <input value={editName} onChange={e => setEditName(e.target.value)} className="input w-full" />
                  </div>
                  <div>
                    <label className="block text-label-md text-fg mb-1.5">Category</label>
                    <select value={editCategory} onChange={e => setEditCategory(e.target.value as 'project-request' | 'application')} className="input w-full">
                      <option value="project-request">Project Request (shown when IO raises a project request)</option>
                      <option value="application">Applicant communication</option>
                    </select>
                    <p className="mt-1 text-caption text-fg-muted">Only “Project Request” templates appear in the Create Project Request email dropdown.</p>
                  </div>
                  <div>
                    <label className="block text-label-md text-fg mb-1.5">Subject <span className="text-danger">*</span></label>
                    <input value={editSubject} onChange={e => setEditSubject(e.target.value)} className="input w-full" />
                  </div>
                  <div>
                    <label className="block text-label-md text-fg mb-1.5">Body <span className="text-danger">*</span></label>
                    <textarea value={editBody} onChange={e => setEditBody(e.target.value)} rows={14} className="input w-full resize-none font-mono text-body-sm" />
                  </div>
                </>
              )}
            </div>

            <div className="px-6 py-4 border-t border-border bg-bg-subtle flex justify-end gap-3 shrink-0">
              {panelMode === 'view' ? (
                <>
                  <button onClick={() => setPanelMode('edit')} className="btn-primary"><Pencil size={15} />Edit</button>
                  <button onClick={() => setPanel(null)} className="btn-outline">Close</button>
                </>
              ) : (
                <>
                  <button onClick={saveEdit} disabled={!editName.trim() || !editSubject.trim()} className="btn-primary">Save Changes</button>
                  <button onClick={() => setPanelMode('view')} className="btn-outline">Cancel</button>
                </>
              )}
            </div>
          </div>
        </>
      )}

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} labelledBy="email-delete-title">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-danger-bg flex items-center justify-center shrink-0">
            <Trash2 size={18} className="text-danger" />
          </div>
          <div>
            <h3 id="email-delete-title" className="text-headline-sm text-fg font-semibold">Delete template?</h3>
            <p className="text-body-sm text-fg-muted mt-1">
              <span className="font-semibold text-fg">"{deleteTarget?.name}"</span> will be permanently removed.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="danger" onClick={() => deleteTarget && doDelete(deleteTarget)}><Trash2 size={15} />Delete</Button>
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
        </div>
      </Modal>
      <Toast message={toast} />
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   OFFER LETTER TEMPLATES
══════════════════════════════════════════════════════════════════════════ */
const OL_KEY      = 'dsta_offer_letters';
const OL_SEED_VER = '4';
const OL_VER_KEY  = 'dsta_offer_letters_seed_v';

function OfferLettersTab() {
  const [templates,    setTemplates]    = useState<OfferLetterTemplate[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<OfferLetterTemplate | null>(null);
  const [search,       setSearch]       = useState('');
  const [panel,        setPanel]        = useState<OfferLetterTemplate | null>(null);
  const [panelMode,    setPanelMode]    = useState<'view' | 'edit'>('view');
  const [editName,     setEditName]     = useState('');
  const [editBody,     setEditBody]     = useState('');
  const [menuOpen,     setMenuOpen]     = useState(false);
  const [menuPos,      setMenuPos]      = useState({ top: 0, right: 0 });
  const [menuTarget,   setMenuTarget]   = useState<OfferLetterTemplate | null>(null);
  const { showToast }                   = useToast();

  useEffect(() => {
    const seed = offerLetterSeed as OfferLetterTemplate[];
    const savedVer = localStorage.getItem(OL_VER_KEY);
    if (savedVer !== OL_SEED_VER) {
      localStorage.setItem(OL_KEY, JSON.stringify(seed));
      localStorage.setItem(OL_VER_KEY, OL_SEED_VER);
      setTemplates(seed);
      return;
    }
    const raw = localStorage.getItem(OL_KEY);
    setTemplates(raw ? JSON.parse(raw) : seed);
  }, []);

  function persist(next: OfferLetterTemplate[]) {
    setTemplates(next);
    localStorage.setItem(OL_KEY, JSON.stringify(next));
  }

  function openPanel(t: OfferLetterTemplate, mode: 'view' | 'edit' = 'view') {
    setPanel(t); setPanelMode(mode); setEditName(t.name); setEditBody(t.body);
  }

  function saveEdit() {
    if (!panel) return;
    const updated: OfferLetterTemplate = {
      ...panel,
      name:      editName.trim(),
      body:      editBody,
      updatedAt: new Date().toISOString().split('T')[0],
    };
    persist(templates.map(t => t.id === updated.id ? updated : t));
    setPanel(updated); setPanelMode('view');
    showToast('Offer letter template saved.');
  }

  function doDelete(t: OfferLetterTemplate) {
    persist(templates.filter(x => x.id !== t.id));
    setDeleteTarget(null);
    if (panel?.id === t.id) setPanel(null);
    showToast('Template deleted.');
  }

  function openMenu(e: React.MouseEvent, t: OfferLetterTemplate) {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    setMenuTarget(t); setMenuOpen(true);
  }

  const filtered = templates.filter(t =>
    !search || t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      

      <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search offer letter templates…"
            className="input flex-1"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-bg-subtle border-b border-border">
              <tr>
                <th className="px-4 py-3 text-table-header tracking-wider text-fg">Template Name</th>
                <th className="px-4 py-3 text-table-header tracking-wider text-fg">Trigger</th>
                <th className="px-4 py-3 text-table-header tracking-wider text-fg">Last Updated</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 && (
                <tr><td colSpan={4} className="px-6 py-16 text-center text-body-md text-fg-muted">
                  {search ? 'No templates match your search.' : 'No offer letter templates configured.'}
                </td></tr>
              )}
              {filtered.map(t => (
                <tr key={t.id} onClick={() => openPanel(t)} className="hover:bg-bg-subtle/50 transition-colors cursor-pointer">
                  <td className="px-4 py-3 text-body-md font-semibold text-fg">{t.name}</td>
                  <td className="px-4 py-3 text-body-sm text-fg-muted">{t.trigger}</td>
                  <td className="px-4 py-3 text-body-sm text-fg-muted">{formatDate(t.updatedAt)}</td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <RowMenuButton onClick={e => openMenu(e, t)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-border text-body-sm text-fg-muted bg-surface">
          {filtered.length} of {templates.length} template{templates.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* 3-dot menu */}
      {menuOpen && menuTarget && (
        <RowDropdown pos={menuPos} onClose={() => setMenuOpen(false)}>
          <DropdownItem icon={<Pencil size={15} className="text-fg-muted" />} label="Edit" onClick={() => { openPanel(menuTarget, 'edit'); setMenuOpen(false); }} />
          <DropdownDivider />
          <DropdownItem icon={<Trash2 size={15} />} label="Delete" danger onClick={() => { setDeleteTarget(menuTarget); setMenuOpen(false); }} />
        </RowDropdown>
      )}

      {/* Detail / edit panel */}
      {panel && (
        <>
          <div className="fixed inset-0 bg-fg/30 z-[210]" onClick={() => setPanel(null)} />
          <div className="fixed top-1/2 left-1/2 bg-surface rounded-2xl shadow-2xl z-[220] w-full max-w-2xl flex flex-col modal-animate"
            style={{ transform: 'translate(-50%,-50%)', maxHeight: '90vh' }}>
            <div className="flex items-start justify-between px-6 py-5 border-b border-border shrink-0">
              <div>
                <p className="text-[13px] font-bold uppercase tracking-wider text-fg-muted mb-1">Offer Letter Template</p>
                <h2 className="text-headline-md text-fg">{panelMode === 'edit' ? 'Edit Template' : panel.name}</h2>
              </div>
              <button onClick={() => setPanel(null)} className="p-2 rounded-full hover:bg-bg-subtle text-fg-muted transition-all ml-4 shrink-0">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {panelMode === 'view' ? (
                <>
                  <div className="bg-surface border border-border rounded-xl overflow-hidden">
                    <div className="px-5 py-2.5 bg-bg-subtle border-b border-border">
                      <div className="flex gap-3 text-body-sm">
                        <span className="text-fg-muted w-16 shrink-0 font-medium">Trigger</span>
                        <span className="text-fg font-medium">{panel.trigger}</span>
                      </div>
                    </div>
                    <div className="px-5 py-4 text-body-sm text-fg leading-6 whitespace-pre-wrap font-sans">
                      {panel.body}
                    </div>
                    <div className="px-5 py-2 border-t border-border bg-bg-subtle">
                      <p className="text-[13px] text-fg-muted">
                        {'{{placeholders}}'} are substituted automatically when the letter is generated.
                      </p>
                    </div>
                  </div>
                  <p className="text-body-sm text-fg-muted">Last updated: {formatDate(panel.updatedAt)}</p>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-label-md text-fg mb-1.5">Template Name <span className="text-danger">*</span></label>
                    <input value={editName} onChange={e => setEditName(e.target.value)} className="input w-full" />
                  </div>
                  <div>
                    <label className="block text-label-md text-fg mb-1.5">Body <span className="text-danger">*</span></label>
                    <p className="text-[13px] text-fg-muted mb-2">
                      Available placeholders: {[
                        '{{offer_date}}','{{applicant_name}}','{{project_title}}','{{mentor_name}}',
                        '{{programme_name}}','{{internship_duration}}','{{working_location}}',
                        '{{monthly_stipend}}','{{portal_link}}',
                        '{{reporting_venue}}','{{internship_start_date}}','{{reporting_time}}','{{reporting_contact}}',
                      ].join(', ')}
                    </p>
                    <textarea value={editBody} onChange={e => setEditBody(e.target.value)}
                      rows={16} className="input w-full resize-none font-mono text-body-sm" />
                  </div>
                </>
              )}
            </div>

            <div className="px-6 py-4 border-t border-border bg-bg-subtle flex justify-end gap-3 shrink-0">
              {panelMode === 'view' ? (
                <>
                  <button onClick={() => setPanelMode('edit')} className="btn-primary"><Pencil size={15} />Edit</button>
                  <button onClick={() => setPanel(null)} className="btn-outline">Close</button>
                </>
              ) : (
                <>
                  <button onClick={saveEdit} disabled={!editName.trim()} className="btn-primary">Save Changes</button>
                  <button onClick={() => setPanelMode('view')} className="btn-outline">Cancel</button>
                </>
              )}
            </div>
          </div>
        </>
      )}

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} labelledBy="offer-letter-delete-title">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-danger-bg flex items-center justify-center shrink-0">
            <Trash2 size={18} className="text-danger" />
          </div>
          <div>
            <h3 id="offer-letter-delete-title" className="text-headline-sm text-fg font-semibold">Delete template?</h3>
            <p className="text-body-sm text-fg-muted mt-1">
              <span className="font-semibold text-fg">"{deleteTarget?.name}"</span> will be permanently removed.
            </p>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={() => deleteTarget && doDelete(deleteTarget)} className="btn-danger">Delete</button>
          <button onClick={() => setDeleteTarget(null)} className="btn-outline">Cancel</button>
        </div>
      </Modal>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   WELCOME LETTER TEMPLATES
══════════════════════════════════════════════════════════════════════════ */
const WL_KEY      = 'dsta_welcome_letters';
const WL_SEED_VER = '1';
const WL_VER_KEY  = 'dsta_welcome_letters_seed_v';

function WelcomeLettersTab() {
  const [templates,    setTemplates]    = useState<WelcomeLetterTemplate[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<WelcomeLetterTemplate | null>(null);
  const [search,       setSearch]       = useState('');
  const [panel,        setPanel]        = useState<WelcomeLetterTemplate | null>(null);
  const [panelMode,    setPanelMode]    = useState<'view' | 'edit'>('view');
  const [editName,     setEditName]     = useState('');
  const [editBody,     setEditBody]     = useState('');
  const [menuOpen,     setMenuOpen]     = useState(false);
  const [menuPos,      setMenuPos]      = useState({ top: 0, right: 0 });
  const [menuTarget,   setMenuTarget]   = useState<WelcomeLetterTemplate | null>(null);
  const { showToast }                   = useToast();

  useEffect(() => {
    const seed = welcomeLetterSeed as WelcomeLetterTemplate[];
    const savedVer = localStorage.getItem(WL_VER_KEY);
    if (savedVer !== WL_SEED_VER) {
      localStorage.setItem(WL_KEY, JSON.stringify(seed));
      localStorage.setItem(WL_VER_KEY, WL_SEED_VER);
      setTemplates(seed);
      return;
    }
    const raw = localStorage.getItem(WL_KEY);
    setTemplates(raw ? JSON.parse(raw) : seed);
  }, []);

  function persist(next: WelcomeLetterTemplate[]) {
    setTemplates(next);
    localStorage.setItem(WL_KEY, JSON.stringify(next));
  }

  function openPanel(t: WelcomeLetterTemplate, mode: 'view' | 'edit' = 'view') {
    setPanel(t); setPanelMode(mode); setEditName(t.name); setEditBody(t.body);
  }

  function saveEdit() {
    if (!panel) return;
    const updated: WelcomeLetterTemplate = {
      ...panel,
      name:      editName.trim(),
      body:      editBody,
      updatedAt: new Date().toISOString().split('T')[0],
    };
    persist(templates.map(t => t.id === updated.id ? updated : t));
    setPanel(updated); setPanelMode('view');
    showToast('Welcome letter template saved.');
  }

  function doDelete(t: WelcomeLetterTemplate) {
    persist(templates.filter(x => x.id !== t.id));
    setDeleteTarget(null);
    if (panel?.id === t.id) setPanel(null);
    showToast('Template deleted.');
  }

  function openMenu(e: React.MouseEvent, t: WelcomeLetterTemplate) {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    setMenuTarget(t); setMenuOpen(true);
  }

  const filtered = templates.filter(t =>
    !search || t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      

      <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search welcome letter templates…"
            className="input flex-1"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-bg-subtle border-b border-border">
              <tr>
                <th className="px-4 py-3 text-table-header tracking-wider text-fg">Template Name</th>
                <th className="px-4 py-3 text-table-header tracking-wider text-fg">Trigger</th>
                <th className="px-4 py-3 text-table-header tracking-wider text-fg">Last Updated</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 && (
                <tr><td colSpan={4} className="px-6 py-16 text-center text-body-md text-fg-muted">
                  {search ? 'No templates match your search.' : 'No welcome letter templates configured.'}
                </td></tr>
              )}
              {filtered.map(t => (
                <tr key={t.id} onClick={() => openPanel(t)} className="hover:bg-bg-subtle/50 transition-colors cursor-pointer">
                  <td className="px-4 py-3 text-body-md font-semibold text-fg">{t.name}</td>
                  <td className="px-4 py-3 text-body-sm text-fg-muted">{t.trigger}</td>
                  <td className="px-4 py-3 text-body-sm text-fg-muted">{formatDate(t.updatedAt)}</td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <RowMenuButton onClick={e => openMenu(e, t)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-border text-body-sm text-fg-muted bg-surface">
          {filtered.length} of {templates.length} template{templates.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* 3-dot menu */}
      {menuOpen && menuTarget && (
        <RowDropdown pos={menuPos} onClose={() => setMenuOpen(false)}>
          <DropdownItem icon={<Pencil size={15} className="text-fg-muted" />} label="Edit" onClick={() => { openPanel(menuTarget, 'edit'); setMenuOpen(false); }} />
          <DropdownDivider />
          <DropdownItem icon={<Trash2 size={15} />} label="Delete" danger onClick={() => { setDeleteTarget(menuTarget); setMenuOpen(false); }} />
        </RowDropdown>
      )}

      {/* Detail / edit panel */}
      {panel && (
        <>
          <div className="fixed inset-0 bg-fg/30 z-[210]" onClick={() => setPanel(null)} />
          <div className="fixed top-1/2 left-1/2 bg-surface rounded-2xl shadow-2xl z-[220] w-full max-w-2xl flex flex-col modal-animate"
            style={{ transform: 'translate(-50%,-50%)', maxHeight: '90vh' }}>
            <div className="flex items-start justify-between px-6 py-5 border-b border-border shrink-0">
              <div>
                <p className="text-[13px] font-bold uppercase tracking-wider text-fg-muted mb-1">Welcome Letter Template</p>
                <h2 className="text-headline-md text-fg">{panelMode === 'edit' ? 'Edit Template' : panel.name}</h2>
              </div>
              <button onClick={() => setPanel(null)} className="p-2 rounded-full hover:bg-bg-subtle text-fg-muted transition-all ml-4 shrink-0">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {panelMode === 'view' ? (
                <>
                  <div className="bg-surface border border-border rounded-xl overflow-hidden">
                    <div className="px-5 py-2.5 bg-bg-subtle border-b border-border">
                      <div className="flex gap-3 text-body-sm">
                        <span className="text-fg-muted w-16 shrink-0 font-medium">Trigger</span>
                        <span className="text-fg font-medium">{panel.trigger}</span>
                      </div>
                    </div>
                    <div className="px-5 py-4 text-body-sm text-fg leading-6 whitespace-pre-wrap font-sans">
                      {panel.body}
                    </div>
                    <div className="px-5 py-2 border-t border-border bg-bg-subtle">
                      <p className="text-[13px] text-fg-muted">
                        {'{{placeholders}}'} are substituted automatically when the letter is generated.
                      </p>
                    </div>
                  </div>
                  <p className="text-body-sm text-fg-muted">Last updated: {formatDate(panel.updatedAt)}</p>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-label-md text-fg mb-1.5">Template Name <span className="text-danger">*</span></label>
                    <input value={editName} onChange={e => setEditName(e.target.value)} className="input w-full" />
                  </div>
                  <div>
                    <label className="block text-label-md text-fg mb-1.5">Body <span className="text-danger">*</span></label>
                    <p className="text-[13px] text-fg-muted mb-2">
                      Available placeholders: {[
                        '{{first_name}}','{{applicant_name}}','{{school}}',
                        '{{start_date}}','{{end_date}}',
                        '{{programme_name}}','{{project_title}}','{{supervisor_name}}',
                      ].join(', ')}
                    </p>
                    <textarea value={editBody} onChange={e => setEditBody(e.target.value)}
                      rows={16} className="input w-full resize-none font-mono text-body-sm" />
                  </div>
                </>
              )}
            </div>

            <div className="px-6 py-4 border-t border-border bg-bg-subtle flex justify-end gap-3 shrink-0">
              {panelMode === 'view' ? (
                <>
                  <button onClick={() => setPanelMode('edit')} className="btn-primary"><Pencil size={15} />Edit</button>
                  <button onClick={() => setPanel(null)} className="btn-outline">Close</button>
                </>
              ) : (
                <>
                  <button onClick={saveEdit} disabled={!editName.trim()} className="btn-primary">Save Changes</button>
                  <button onClick={() => setPanelMode('view')} className="btn-outline">Cancel</button>
                </>
              )}
            </div>
          </div>
        </>
      )}

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} labelledBy="welcome-letter-delete-title">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-danger-bg flex items-center justify-center shrink-0">
            <Trash2 size={18} className="text-danger" />
          </div>
          <div>
            <h3 id="welcome-letter-delete-title" className="text-headline-sm text-fg font-semibold">Delete template?</h3>
            <p className="text-body-sm text-fg-muted mt-1">
              <span className="font-semibold text-fg">"{deleteTarget?.name}"</span> will be permanently removed.
            </p>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={() => deleteTarget && doDelete(deleteTarget)} className="btn-danger">Delete</button>
          <button onClick={() => setDeleteTarget(null)} className="btn-outline">Cancel</button>
        </div>
      </Modal>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   PROJECT SUBMISSION TEMPLATE
══════════════════════════════════════════════════════════════════════════ */
const PROJ_TPL_KEY      = 'dsta_proj_template_columns';
const PROJ_TPL_SEED_VER = '13';
const PROJ_TPL_VER_KEY  = 'dsta_proj_template_columns_seed_v';

type ColDraft = { name: string; required: boolean; description: string; example: string; fieldType: 'text' | 'dropdown'; dropdownValues: string[]; section: ColumnSection };
const EMPTY_DRAFT: ColDraft = { name: '', required: true, description: '', example: '', fieldType: 'text', dropdownValues: [], section: 'Classification' };

function ProjectSubmissionTab() {
  const [columns, setColumns]           = useState<ProjectSubmissionColumn[]>([]);
  const [progLabels, setProgLabels]     = useState<string[]>([]);
  const [editTarget, setEditTarget]     = useState<{ col: ProjectSubmissionColumn; idx: number } | null>(null);
  const [addOpen, setAddOpen]           = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ col: ProjectSubmissionColumn; idx: number } | null>(null);
  const [draft, setDraft]               = useState<ColDraft>(EMPTY_DRAFT);
  const { toast, showToast }            = useToast();

  useEffect(() => {
    // Load template columns
    try {
      if (localStorage.getItem(PROJ_TPL_VER_KEY) !== PROJ_TPL_SEED_VER) {
        localStorage.setItem(PROJ_TPL_KEY, JSON.stringify(PROJECT_SUBMISSION_COLUMNS));
        localStorage.setItem(PROJ_TPL_VER_KEY, PROJ_TPL_SEED_VER);
      }
      const raw = localStorage.getItem(PROJ_TPL_KEY);
      setColumns(raw ? JSON.parse(raw) : PROJECT_SUBMISSION_COLUMNS);
    } catch {
      setColumns(PROJECT_SUBMISSION_COLUMNS);
    }

    // Derive programme labels from active requests
    try {
      const progOpts = loadLiveProgrammeOptions();
      const progMap  = Object.fromEntries(progOpts.map(p => [p.value, p.label]));
      const reqs     = loadRequests();
      const uniqueIds: string[] = Array.from(new Set(reqs.map(r => r.educationLevel)));
      setProgLabels(uniqueIds.map((id: string) => progMap[id] ?? id).filter(Boolean));
    } catch {}
  }, []);

  function persist(next: ProjectSubmissionColumn[]) {
    setColumns(next);
    try { localStorage.setItem(PROJ_TPL_KEY, JSON.stringify(next)); } catch {}
  }

  function openAdd() {
    setDraft(EMPTY_DRAFT);
    setAddOpen(true);
  }

  function openEdit(col: ProjectSubmissionColumn, idx: number) {
    setDraft({ name: col.name, required: col.required, description: col.description, example: col.example, fieldType: col.fieldType ?? 'text', dropdownValues: col.dropdownValues ?? [], section: col.section ?? 'Classification' });
    setEditTarget({ col, idx });
  }

  function saveAdd() {
    if (!draft.name.trim()) return;
    const next: ProjectSubmissionColumn = { ...draft, name: draft.name.trim(), usedForMatching: false };
    persist([...columns, next]);
    setAddOpen(false);
    showToast('Column added.');
  }

  function saveEdit() {
    if (!editTarget || !draft.name.trim()) return;
    const next = columns.map((c, i) =>
      i === editTarget.idx ? { ...c, ...draft, name: draft.name.trim() } : c
    );
    persist(next);
    setEditTarget(null);
    showToast('Column updated.');
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    const next = columns.filter((_, i) => i !== deleteTarget.idx);
    persist(next);
    setDeleteTarget(null);
    showToast('Column deleted.');
  }

  return (
    <div className="space-y-5">
      {/* Header card */}
      <div className="card p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-headline-sm text-fg font-semibold mb-1">Project Request Template</h2>
            <p className="text-body-sm text-fg-muted max-w-xl">
              This is the standardised Excel template distributed to all Programme Centre (PC) Heads and the Assistant Director, Planning &amp; Control (AD P&amp;C) when a project request is raised.
            </p>
          </div>
          <button
            onClick={() => {
              const withProg = columns.map(c =>
                c.name === 'Programme'
                  ? { ...c, dropdownValues: progLabels }
                  : c
              );
              exportProjectTemplateXLSX(withProg);
            }}
            className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-accent text-white rounded-xl text-body-sm font-semibold hover:bg-accent/90 transition-colors shadow-sm whitespace-nowrap"
          >
            <Download size={15} />Download Template
          </button>
        </div>
      </div>

      {/* Column list */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border bg-bg-subtle flex items-center gap-2">
          <TableProperties size={15} className="text-fg-muted" />
          <p className="text-body-sm font-semibold text-fg">Template Columns</p>
          <span className="text-body-sm text-fg-muted ml-1">({columns.length})</span>
          <button
            onClick={openAdd}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-[12px] font-semibold hover:bg-accent/90 transition-colors"
          >
            <Plus size={13} />Add Column
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-bg-subtle border-b border-border">
              <tr>
                <th className="px-4 py-3 text-table-header tracking-wider text-fg">#</th>
                <th className="px-4 py-3 text-table-header tracking-wider text-fg">Column Name</th>
                <th className="px-4 py-3 text-table-header tracking-wider text-fg">Section</th>
                <th className="px-4 py-3 text-table-header tracking-wider text-fg">Required</th>
                <th className="px-4 py-3 text-table-header tracking-wider text-fg">Field Type</th>
                <th className="px-4 py-3 text-table-header tracking-wider text-fg">Description</th>
                <th className="px-4 py-3 text-table-header tracking-wider text-fg"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {columns.map((col, i) => {
                const isProg = col.name === 'Programme';
                return (
                <tr key={i} className="hover:bg-bg-subtle/50 group transition-colors">
                  <td className="px-4 py-3 text-body-sm text-fg-muted">{i + 1}</td>
                  <td className="px-4 py-3 text-body-sm font-semibold text-fg whitespace-nowrap">{col.name}</td>
                  <td className="px-4 py-3">
                    <span className="text-[13px] font-semibold text-fg-muted whitespace-nowrap">{col.section ?? '—'}</span>
                  </td>
                  <td className="px-4 py-3">
                    {col.required
                      ? <span className="inline-flex items-center gap-1 text-[13px] font-bold text-danger"><Check size={11} />Required</span>
                      : <span className="text-body-sm text-fg-subtle">Optional</span>}
                  </td>
                  <td className="px-4 py-3">
                    {col.fieldType === 'dropdown'
                      ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[13px] font-bold">Dropdown</span>
                      : <span className="text-body-sm text-fg-subtle">Text</span>}
                  </td>
                  <td className="px-4 py-3 text-body-sm text-fg-muted max-w-xs">
                    {isProg
                      ? <span>Options derived from active <strong className="text-fg">Project Requests</strong> — {progLabels.length > 0 ? `${progLabels.length} programme${progLabels.length !== 1 ? 's' : ''} currently active` : 'no active requests yet'}</span>
                      : col.description}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEdit(col, i)}
                        className="p-1.5 rounded-lg hover:bg-bg-muted text-fg-muted hover:text-fg transition-colors"
                        title="Edit column"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget({ col, idx: i })}
                        className="p-1.5 rounded-lg hover:bg-danger-bg text-fg-muted hover:text-danger transition-colors"
                        title="Delete column"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} maxWidth="md" labelledBy="add-column-title">
        <h3 id="add-column-title" className="text-headline-sm text-fg font-semibold mb-4">Add Column</h3>
        <ColForm draft={draft} onChange={setDraft} />
        <div className="flex justify-end gap-2 mt-5">
          <Button onClick={saveAdd} disabled={!draft.name.trim()}>Add Column</Button>
          <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
        </div>
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} maxWidth="md" labelledBy="edit-column-title">
        <h3 id="edit-column-title" className="text-headline-sm text-fg font-semibold mb-4">Edit Column</h3>
        <ColForm draft={draft} onChange={setDraft} />
        <div className="flex justify-end gap-2 mt-5">
          <Button onClick={saveEdit} disabled={!draft.name.trim()}>Save Changes</Button>
          <Button variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} labelledBy="delete-column-title">
        <h3 id="delete-column-title" className="text-headline-sm text-fg font-semibold mb-2">Delete Column?</h3>
        <p className="text-body-sm text-fg-muted mb-5">
          <span className="font-semibold text-fg">{deleteTarget?.col.name}</span> will be permanently removed from the template.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="danger" onClick={confirmDelete}><Trash2 size={15} />Delete</Button>
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
        </div>
      </Modal>

      <Toast message={toast} />
    </div>
  );
}

function ColForm({ draft, onChange }: { draft: ColDraft; onChange: (d: ColDraft) => void }) {
  const [tagInput, setTagInput] = useState('');

  function addTag() {
    const v = tagInput.trim();
    if (!v || draft.dropdownValues.includes(v)) { setTagInput(''); return; }
    onChange({ ...draft, dropdownValues: [...draft.dropdownValues, v] });
    setTagInput('');
  }

  function removeTag(v: string) {
    onChange({ ...draft, dropdownValues: draft.dropdownValues.filter(x => x !== v) });
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-body-sm font-semibold text-fg mb-1.5">Column Name <span className="text-danger">*</span></label>
        <input
          className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-body-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
          value={draft.name}
          onChange={e => onChange({ ...draft, name: e.target.value })}
          placeholder="e.g. Working Location"
        />
      </div>

      {/* Section */}
      <div>
        <label className="block text-body-sm font-semibold text-fg mb-1.5">Section <span className="text-danger">*</span></label>
        <select
          className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-body-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
          value={draft.section}
          onChange={e => onChange({ ...draft, section: e.target.value as ColumnSection })}
        >
          {COLUMN_SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <p className="text-caption text-fg-subtle mt-1">Determines where this field appears on the project detail page.</p>
      </div>

      {/* Field type selector */}
      <div>
        <label className="block text-body-sm font-semibold text-fg mb-1.5">Field Type</label>
        <div className="flex gap-2">
          {(['text', 'dropdown'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => onChange({ ...draft, fieldType: t, dropdownValues: t === 'text' ? [] : draft.dropdownValues })}
              className={`flex-1 py-2 rounded-lg border text-body-sm font-medium capitalize transition-colors ${
                draft.fieldType === t
                  ? 'bg-accent/10 border-accent text-accent'
                  : 'border-border text-fg-muted hover:border-fg-muted'
              }`}
            >
              {t === 'text' ? 'Text (free input)' : 'Dropdown (fixed options)'}
            </button>
          ))}
        </div>
      </div>

      {/* Dropdown values tag input */}
      {draft.fieldType === 'dropdown' && (
        <div>
          <label className="block text-body-sm font-semibold text-fg mb-1.5">Dropdown Options</label>
          {draft.dropdownValues.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {draft.dropdownValues.map(v => (
                <span key={v} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-bg-subtle border border-border text-body-sm text-fg">
                  {v}
                  <button type="button" onClick={() => removeTag(v)} className="text-fg-muted hover:text-danger transition-colors">
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              className="flex-1 px-3 py-2 rounded-lg border border-border bg-surface text-body-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
              placeholder="Type an option and press Enter"
            />
            <button
              type="button"
              onClick={addTag}
              disabled={!tagInput.trim()}
              className="px-3 py-2 rounded-lg bg-accent text-white text-body-sm font-semibold hover:bg-accent/90 disabled:opacity-40 transition-colors"
            >
              Add
            </button>
          </div>
          <p className="text-caption text-fg-subtle mt-1">Press Enter or click Add after each option.</p>
        </div>
      )}

      <div>
        <label className="block text-body-sm font-semibold text-fg mb-1.5">Description</label>
        <textarea
          rows={3}
          className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-body-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent resize-none"
          value={draft.description}
          onChange={e => onChange({ ...draft, description: e.target.value })}
          placeholder="Guidance text shown to PC Heads filling the template"
        />
      </div>
      <div>
        <label className="block text-body-sm font-semibold text-fg mb-1.5">Example Value</label>
        <input
          className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-body-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
          value={draft.example}
          onChange={e => onChange({ ...draft, example: e.target.value })}
          placeholder="e.g. Hybrid"
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange({ ...draft, required: !draft.required })}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${draft.required ? 'bg-accent' : 'bg-border'}`}
        >
          <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${draft.required ? 'translate-x-4' : 'translate-x-0.5'}`} />
        </button>
        <span className="text-body-sm text-fg">Required field</span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   CERTIFICATE TEMPLATES
══════════════════════════════════════════════════════════════════════════ */
const COC_KEY      = 'dsta_certificate_templates';
const COC_SEED_VER = '1';
const COC_VER_KEY  = 'dsta_certificate_templates_seed_v';

function CertificatesTab() {
  const [templates,    setTemplates]    = useState<CertificateTemplate[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<CertificateTemplate | null>(null);
  const [search,       setSearch]       = useState('');
  const [panel,        setPanel]        = useState<CertificateTemplate | null>(null);
  const [panelMode,    setPanelMode]    = useState<'view' | 'edit'>('view');
  const [editName,     setEditName]     = useState('');
  const [editBody,     setEditBody]     = useState('');
  const [menuOpen,     setMenuOpen]     = useState(false);
  const [menuPos,      setMenuPos]      = useState({ top: 0, right: 0 });
  const [menuTarget,   setMenuTarget]   = useState<CertificateTemplate | null>(null);
  const [activeStyle,  setActiveStyle]  = useState<CertStyle>('classic');
  const { showToast }                   = useToast();

  useEffect(() => {
    const seed = certificateSeed as CertificateTemplate[];
    const savedVer = localStorage.getItem(COC_VER_KEY);
    if (savedVer !== COC_SEED_VER) {
      localStorage.setItem(COC_KEY, JSON.stringify(seed));
      localStorage.setItem(COC_VER_KEY, COC_SEED_VER);
      setTemplates(seed);
    } else {
      const raw = localStorage.getItem(COC_KEY);
      setTemplates(raw ? JSON.parse(raw) : seed);
    }
    setActiveStyle(loadActiveCertStyle());
  }, []);

  function setAsDefault(t: CertificateTemplate) {
    const st = (t.style ?? 'classic') as CertStyle;
    saveActiveCertStyle(st);
    setActiveStyle(st);
    showToast(`"${t.name}" set as the default certificate style.`);
  }

  function persist(next: CertificateTemplate[]) {
    setTemplates(next);
    localStorage.setItem(COC_KEY, JSON.stringify(next));
  }

  function openPanel(t: CertificateTemplate, mode: 'view' | 'edit' = 'view') {
    setPanel(t); setPanelMode(mode); setEditName(t.name); setEditBody(t.body);
  }

  function saveEdit() {
    if (!panel) return;
    const updated: CertificateTemplate = {
      ...panel,
      name:      editName.trim(),
      body:      editBody,
      updatedAt: new Date().toISOString().split('T')[0],
    };
    persist(templates.map(t => t.id === updated.id ? updated : t));
    setPanel(updated); setPanelMode('view');
    showToast('Certificate template saved.');
  }

  function doDelete(t: CertificateTemplate) {
    persist(templates.filter(x => x.id !== t.id));
    setDeleteTarget(null);
    if (panel?.id === t.id) setPanel(null);
    showToast('Template deleted.');
  }

  function openMenu(e: React.MouseEvent, t: CertificateTemplate) {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    setMenuTarget(t); setMenuOpen(true);
  }

  const filtered = templates.filter(t =>
    !search || t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      

      <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search certificate templates…"
            className="input flex-1"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-bg-subtle border-b border-border">
              <tr>
                <th className="px-4 py-3 text-table-header tracking-wider text-fg">Template Name</th>
                <th className="px-4 py-3 text-table-header tracking-wider text-fg">Default</th>
                <th className="px-4 py-3 text-table-header tracking-wider text-fg">Trigger</th>
                <th className="px-4 py-3 text-table-header tracking-wider text-fg">Last Updated</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-16 text-center text-body-md text-fg-muted">
                  {search ? 'No templates match your search.' : 'No certificate templates configured.'}
                </td></tr>
              )}
              {filtered.map(t => {
                const isDefault = (t.style ?? 'classic') === activeStyle;
                return (
                <tr key={t.id} onClick={() => openPanel(t)} className="hover:bg-bg-subtle/50 transition-colors cursor-pointer">
                  <td className="px-4 py-3 text-body-md font-semibold text-fg">{t.name}</td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    {isDefault ? (
                      <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-2 py-0.5 rounded-full bg-success-bg text-success border border-success/20">
                        <Check size={11} /> Default
                      </span>
                    ) : (
                      <button onClick={() => setAsDefault(t)}
                        className="text-[12px] font-semibold text-accent hover:underline">Set as default</button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-body-sm text-fg-muted">{t.trigger}</td>
                  <td className="px-4 py-3 text-body-sm text-fg-muted">{formatDate(t.updatedAt)}</td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <RowMenuButton onClick={e => openMenu(e, t)} />
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-border text-body-sm text-fg-muted bg-surface">
          {filtered.length} of {templates.length} template{templates.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* 3-dot menu */}
      {menuOpen && menuTarget && (
        <RowDropdown pos={menuPos} onClose={() => setMenuOpen(false)}>
          <DropdownItem icon={<Pencil size={15} className="text-fg-muted" />} label="Edit" onClick={() => { openPanel(menuTarget, 'edit'); setMenuOpen(false); }} />
          <DropdownDivider />
          <DropdownItem icon={<Trash2 size={15} />} label="Delete" danger onClick={() => { setDeleteTarget(menuTarget); setMenuOpen(false); }} />
        </RowDropdown>
      )}

      {/* Detail / edit panel */}
      {panel && (
        <>
          <div className="fixed inset-0 bg-fg/30 z-[210]" onClick={() => setPanel(null)} />
          <div className="fixed top-1/2 left-1/2 bg-surface rounded-2xl shadow-2xl z-[220] w-full max-w-2xl flex flex-col modal-animate"
            style={{ transform: 'translate(-50%,-50%)', maxHeight: '90vh' }}>
            <div className="flex items-start justify-between px-6 py-5 border-b border-border shrink-0">
              <div>
                <p className="text-[13px] font-bold uppercase tracking-wider text-fg-muted mb-1">Certificate Template</p>
                <h2 className="text-headline-md text-fg">{panelMode === 'edit' ? 'Edit Template' : panel.name}</h2>
              </div>
              <button onClick={() => setPanel(null)} className="p-2 rounded-full hover:bg-bg-subtle text-fg-muted transition-all ml-4 shrink-0">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {panelMode === 'view' ? (
                <>
                  <div className="bg-surface border border-border rounded-xl overflow-hidden">
                    <div className="px-5 py-2.5 bg-bg-subtle border-b border-border">
                      <div className="flex gap-3 text-body-sm">
                        <span className="text-fg-muted w-16 shrink-0 font-medium">Trigger</span>
                        <span className="text-fg font-medium">{panel.trigger}</span>
                      </div>
                    </div>
                    <div className="px-5 py-4 text-body-sm text-fg leading-6 whitespace-pre-wrap font-mono">
                      {panel.body}
                    </div>
                    <div className="px-5 py-2 border-t border-border bg-bg-subtle">
                      <p className="text-[13px] text-fg-muted">
                        {'{{placeholders}}'} are substituted automatically when the certificate is generated.
                      </p>
                    </div>
                  </div>
                  <p className="text-body-sm text-fg-muted">Last updated: {formatDate(panel.updatedAt)}</p>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-label-md text-fg mb-1.5">Template Name <span className="text-danger">*</span></label>
                    <input value={editName} onChange={e => setEditName(e.target.value)} className="input w-full" />
                  </div>
                  <div>
                    <label className="block text-label-md text-fg mb-1.5">Body <span className="text-danger">*</span></label>
                    <p className="text-[13px] text-fg-muted mb-2">
                      Available placeholders: {[
                        '{{intern_name}}','{{first_name}}','{{school}}',
                        '{{start_date}}','{{end_date}}','{{issue_date}}',
                        '{{programme_name}}','{{project_title}}','{{supervisor_name}}',
                      ].join(', ')}
                    </p>
                    <textarea value={editBody} onChange={e => setEditBody(e.target.value)}
                      rows={18} className="input w-full resize-none font-mono text-body-sm" />
                  </div>
                </>
              )}
            </div>

            <div className="px-6 py-4 border-t border-border bg-bg-subtle flex justify-end gap-3 shrink-0">
              {panelMode === 'view' ? (
                <>
                  <button onClick={() => setPanelMode('edit')} className="btn-primary"><Pencil size={15} />Edit</button>
                  <button onClick={() => setPanel(null)} className="btn-outline">Close</button>
                </>
              ) : (
                <>
                  <button onClick={saveEdit} disabled={!editName.trim()} className="btn-primary">Save Changes</button>
                  <button onClick={() => setPanelMode('view')} className="btn-outline">Cancel</button>
                </>
              )}
            </div>
          </div>
        </>
      )}

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} labelledBy="certificate-delete-title">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-danger-bg flex items-center justify-center shrink-0">
            <Trash2 size={18} className="text-danger" />
          </div>
          <div>
            <h3 id="certificate-delete-title" className="text-headline-sm text-fg font-semibold">Delete template?</h3>
            <p className="text-body-sm text-fg-muted mt-1">
              <span className="font-semibold text-fg">"{deleteTarget?.name}"</span> will be permanently removed.
            </p>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={() => deleteTarget && doDelete(deleteTarget)} className="btn-danger">Delete</button>
          <button onClick={() => setDeleteTarget(null)} className="btn-outline">Cancel</button>
        </div>
      </Modal>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   LETTERS TAB — combined Offer + Welcome with internal segmented control
══════════════════════════════════════════════════════════════════════════ */
function LettersTab() {
  const [sub, setSub] = useState<'offer' | 'welcome'>('offer');
  return (
    <div>
      {/* Segmented control */}
      <div className="inline-flex rounded-xl border border-border bg-bg-subtle p-1 mb-5">
        {([
          { id: 'offer',   label: 'Offer Letters'   },
          { id: 'welcome', label: 'Welcome Letters' },
        ] as const).map(s => (
          <button
            key={s.id}
            onClick={() => setSub(s.id)}
            className={`px-4 py-1.5 rounded-lg text-label-md transition-all ${
              sub === s.id
                ? 'bg-surface shadow-sm text-fg font-semibold border border-border'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Description */}
      <p className="text-body-sm text-fg-muted mb-4">
        {sub === 'offer'
          ? 'Formal offer documents sent to applicants upon offer extension. Includes T&Cs, declarations, and acceptance instructions.'
          : 'Welcome correspondence sent to confirmed interns ahead of their start date. Includes reporting details and pre-commencement checklist.'}
      </p>

      {sub === 'offer'   && <OfferLettersTab />}
      {sub === 'welcome' && <WelcomeLettersTab />}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════════════════════════════════ */
type TemplateTab = 'appforms' | 'autoemail' | 'letters' | 'certificate' | 'projectsubmission';

const TABS: { id: TemplateTab; label: string; icon: React.ElementType }[] = [
  { id: 'appforms',          label: 'Application Forms', icon: FileText        },
  { id: 'autoemail',         label: 'Automated Emails',  icon: Mail            },
  { id: 'letters',           label: 'Letters',           icon: FileSignature   },
  { id: 'certificate',       label: 'Certificates',      icon: Award           },
  { id: 'projectsubmission', label: 'Project Submission', icon: TableProperties },
];

export default function TemplatesPage() {
  const { role } = useRole();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TemplateTab>('appforms');


  useEffect(() => {
    if (role !== 'io-admin') router.replace('/dashboard');
  }, [role, router]);

  if (role !== 'io-admin') return null;

  return (
    <Shell activeRoute="/templates">
      {/* Header */}
      <div className="mb-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-headline-lg text-fg">Templates</h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[13px] font-bold uppercase">
                <Shield size={10} />Admin
              </span>
            </div>
          </div>
          {activeTab === 'appforms' && (
            <Button className="self-start" onClick={() => router.push('/templates/new')}><Plus size={16} />Add Application Form</Button>
          )}
          {activeTab === 'autoemail' && (
            <Button className="self-start"><Plus size={16} />Add Email Template</Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-end border-b border-border mb-4 gap-1">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 text-label-md border-b-2 -mb-px transition-all flex items-center gap-2 whitespace-nowrap ${
                isActive
                  ? 'border-accent text-accent'
                  : 'border-transparent text-fg-muted hover:text-accent'
              }`}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'appforms'          && <AppFormsTab />}
      {activeTab === 'autoemail'         && <EmailTemplatesTab />}
      {activeTab === 'letters'           && <LettersTab />}
      {activeTab === 'certificate'       && <CertificatesTab />}
      {activeTab === 'projectsubmission' && <ProjectSubmissionTab />}
    </Shell>
  );
}
