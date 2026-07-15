'use client';

import { useState, useEffect, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import Shell from '@/components/layout/shell';
import { AppStatusBadge, CategoryBadge, StatusDot } from '@/components/ui-legacy/badge';
import ProgToggle from '@/components/ui-legacy/prog-toggle';
import Button from '@/components/ui-legacy/button';
import {
  Plus, Pencil, Copy, Trash2, Info, SearchX,
  ChevronRight, CircleCheck, CirclePlay, Filter,
} from 'lucide-react';
import { RowMenuButton, RowDropdown, DropdownItem, DropdownDivider } from '@/components/ui-legacy/row-actions';
import TableToolbar from '@/components/ui-legacy/table-toolbar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import EmptyState from '@/components/ui-legacy/empty-state';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EDUCATION_LEVELS, internCategoriesForLevel } from '@/lib/data';
import { loadProgrammes, saveProgrammes } from '@/lib/storage';
import { PROGRAMMES_CHANGED_EVENT } from '@/lib/programme-context';
import Modal from '@/components/ui-legacy/modal';
import { Toast, useToast } from '@/components/ui-legacy/toast';
import SortTh from '@/components/ui-legacy/sort-th';
import { cn, exportToCSV, deriveAppStatus } from '@/lib/utils';
import { programmeIntakes } from '@/lib/intakes';
import type { Programme, ProgStatus } from '@/lib/types';

type AppStat = { total: number; newCount: number };

/* ── Application count helpers ────────────────────────────────────────────── */
const APP_KEY = 'dsta_applications';

function loadAppCounts(): Record<string, { total: number; newCount: number }> {
  try {
    const raw = localStorage.getItem(APP_KEY);
    if (!raw) return {};
    const apps: { programmeId: string; status: string }[] = JSON.parse(raw);
    const counts: Record<string, { total: number; newCount: number }> = {};
    for (const a of apps) {
      if (!counts[a.programmeId]) counts[a.programmeId] = { total: 0, newCount: 0 };
      counts[a.programmeId].total++;
      if (a.status === 'Pending Screening' || a.status === 'Pending Review') {
        counts[a.programmeId].newCount++;
      }
    }
    return counts;
  } catch { return {}; }
}

/* Per-intake application stats. Apps tagged with an `intakeId` are counted against
   that intake; untagged (legacy/seed) apps are bucketed by programme and attributed
   to the programme's first intake by the table. */
function loadAppIntakeStats(): { byIntake: Record<string, AppStat>; untagged: Record<string, AppStat> } {
  try {
    const raw = localStorage.getItem(APP_KEY);
    if (!raw) return { byIntake: {}, untagged: {} };
    const apps: { programmeId: string; intakeId?: string; status: string }[] = JSON.parse(raw);
    const byIntake: Record<string, AppStat> = {};
    const untagged: Record<string, AppStat> = {};
    for (const a of apps) {
      const isNew = a.status === 'Pending Screening' || a.status === 'Pending Review';
      const bucket = a.intakeId ? (byIntake[a.intakeId] ??= { total: 0, newCount: 0 })
                                : (untagged[a.programmeId] ??= { total: 0, newCount: 0 });
      bucket.total++;
      if (isNew) bucket.newCount++;
    }
    return { byIntake, untagged };
  } catch { return { byIntake: {}, untagged: {} }; }
}

const fmtDate = (d: string) => {
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' });
};
const fmtMonth = (d: string) => {
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('en-SG', { month: 'short', year: 'numeric' });
};
/* ── Main page ────────────────────────────────────────────────────────────── */
type Tab = 'all' | 'active' | 'draft' | 'completed';
type SortDir = 1 | -1;
type HeaderFilterKey = 'programmeStatus' | 'educationLevel' | 'applicationStatus';
const PAGE_SIZE_OPTIONS = [10, 20, 50];

const HEADER_FILTERS: Record<HeaderFilterKey, { label: string; options: string[] }> = {
  programmeStatus: { label: 'Programme Status', options: ['Active', 'Draft', 'Completed'] },
  educationLevel: { label: 'Intern Category', options: [...EDUCATION_LEVELS] },
  applicationStatus: { label: 'Application Status', options: ['Open', 'Closed'] },
};

export default function ProgrammesPage() {
  const router = useRouter();

  const [progs, setProgs]             = useState<Programme[]>([]);
  const [appCounts, setAppCounts]     = useState<Record<string, { total: number; newCount: number }>>({});
  const [appIntake, setAppIntake]     = useState<{ byIntake: Record<string, AppStat>; untagged: Record<string, AppStat> }>({ byIntake: {}, untagged: {} });
  const [expanded, setExpanded]       = useState<Set<string>>(new Set());
  const [search, setSearch]           = useState('');
  const [activeTab, setActiveTab]     = useState<Tab>('active');
  const [progStatusCF, setProgStatusCF] = useState<string[]>([]);
  const [categoryCF,   setCategoryCF]   = useState<string[]>([]);
  const [appStatusCF,  setAppStatusCF]  = useState<string[]>([]);
  const [activeCat,    setActiveCat]    = useState('all');   // intern-category filter
  const [openHeaderFilter, setOpenHeaderFilter] = useState<HeaderFilterKey | null>(null);
  const [headerFilterPos, setHeaderFilterPos] = useState({ top: 0, left: 0 });
  const [sortCol, setSortCol]         = useState<string | null>(null);
  const [sortDir, setSortDir]         = useState<SortDir>(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(PAGE_SIZE_OPTIONS[0]);

  const COL_DEFS = [
    { key: 'id',           label: 'Programme ID'       },
    { key: 'title',        label: 'Programme Title'    },
    { key: 'progStatus',   label: 'Programme Status'   },
    { key: 'status',       label: 'Application Status' },
    { key: 'appwindow',    label: 'Application Window' },
    { key: 'applications', label: 'Applications'       },
  ] as const;
  type ColKey = typeof COL_DEFS[number]['key'];
  const COLS_STORAGE_KEY = 'dsta_prog_visible_cols';
  const DEFAULT_COLS: Record<ColKey, boolean> = {
    id: true, title: true, progStatus: true, status: true, appwindow: true, applications: true,
  };
  const [visibleCols, setVisibleCols] = useState<Record<ColKey, boolean>>(DEFAULT_COLS);
  function toggleCol(key: ColKey) {
    setVisibleCols(prev => {
      const next = { ...prev, [key]: !prev[key] };
      try { localStorage.setItem(COLS_STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  const [menuOpen, setMenuOpen]       = useState(false);
  const [menuPos, setMenuPos]         = useState({ top: 0, right: 0 });
  const [activeProgId, setActiveProgId] = useState<string | null>(null);

  const [deleteProg, setDeleteProg]   = useState<Programme | null>(null);
  const [dupProg, setDupProg]         = useState<Programme | null>(null);
  const [dupTitle, setDupTitle]       = useState('');
  const [dupError, setDupError]       = useState(false);


  const { toast, showToast }          = useToast();

  useEffect(() => {
    try {
      const saved = localStorage.getItem(COLS_STORAGE_KEY);
      if (saved) setVisibleCols({ ...DEFAULT_COLS, ...JSON.parse(saved) });
    } catch {}
    const loaded = loadProgrammes();
    setProgs(loaded);
    setAppCounts(loadAppCounts());
    setAppIntake(loadAppIntakeStats());
    const msg = sessionStorage.getItem('dsta_pending_toast');
    if (msg) { sessionStorage.removeItem('dsta_pending_toast'); showToast(msg); }
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, activeTab, progStatusCF, activeCat, appStatusCF, sortCol, sortDir]);

  function save(p: Programme[]) {
    setProgs(p);
    saveProgrammes(p);
    window.dispatchEvent(new Event(PROGRAMMES_CHANGED_EVENT));
  }

  function tabMatch(p: Programme): boolean {
    if (activeTab === 'active')    return p.status === 'Active';
    if (activeTab === 'draft')     return p.status === 'Draft';
    if (activeTab === 'completed') return p.status === 'Completed';
    return true;
  }

  function sort(col: string) {
    if (sortCol !== col) {
      setSortCol(col);
      setSortDir(1);
      return;
    }
    if (sortDir === 1) {
      setSortDir(-1);
      return;
    }
    setSortCol(null);
    setSortDir(1);
  }

  function getHeaderFilterValues(key: HeaderFilterKey) {
    if (key === 'programmeStatus') return progStatusCF;
    if (key === 'educationLevel') return categoryCF;
    return appStatusCF;
  }

  function setHeaderFilterValues(key: HeaderFilterKey, values: string[]) {
    if (key === 'programmeStatus') setProgStatusCF(values);
    else if (key === 'educationLevel') setCategoryCF(values);
    else setAppStatusCF(values);
  }

  function toggleHeaderFilterValue(key: HeaderFilterKey, value: string) {
    const current = getHeaderFilterValues(key);
    setHeaderFilterValues(key, current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value]
    );
  }

  function openFilter(key: HeaderFilterKey, e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    const r = e.currentTarget.getBoundingClientRect();
    setHeaderFilterPos({ top: r.bottom + 6, left: r.left });
    setOpenHeaderFilter(prev => prev === key ? null : key);
  }

  function headerFilterButton(key: HeaderFilterKey) {
    const selected = getHeaderFilterValues(key);
    const active = selected.length > 0 || openHeaderFilter === key;
    return (
      <button
        type="button"
        onClick={e => openFilter(key, e)}
        aria-label={`Filter ${HEADER_FILTERS[key].label}`}
        className={cn(
          'p-0.5 rounded transition-colors ml-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
          active ? 'text-accent bg-accent/10' : 'text-fg-subtle hover:text-fg hover:bg-bg-muted',
        )}
      >
        <Filter size={11} />
      </button>
    );
  }

  const APP_STATUS_SORT: Record<string, number>  = { Open: 0, Closed: 1 };
  const PROG_STATUS_SORT: Record<string, number> = { Active: 0, Draft: 1, Completed: 2 };
  const filtered = progs
    .filter(p =>
      tabMatch(p) &&
      (!search || (() => { const q = search.toLowerCase(); return (
        p.id.toLowerCase().includes(q) ||
        p.title.toLowerCase().includes(q) ||
        p.educationLevel.toLowerCase().includes(q) ||
        p.status.toLowerCase().includes(q) ||
        (p.appOpen     && new Date(p.appOpen).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' }).toLowerCase().includes(q)) ||
        (p.appDeadline && new Date(p.appDeadline).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' }).toLowerCase().includes(q))
      ); })()) &&
      (progStatusCF.length === 0 || progStatusCF.includes(p.status)) &&
      (activeCat === 'all' || internCategoriesForLevel(p.educationLevel).includes(activeCat)) &&
      (appStatusCF.length  === 0 || (!!p.appOpen && !!p.appDeadline && appStatusCF.includes(deriveAppStatus(p.appOpen, p.appDeadline))))
    )
    .sort((a, b) => {
      if (!sortCol) return 0;
      let va: string | number = '', vb: string | number = '';
      if      (sortCol === 'id')         { va = a.id;       vb = b.id; }
      else if (sortCol === 'title')      { va = a.title;    vb = b.title; }
      else if (sortCol === 'progStatus') { va = PROG_STATUS_SORT[a.status] ?? 99; vb = PROG_STATUS_SORT[b.status] ?? 99; }
      else if (sortCol === 'category')   { va = a.educationLevel; vb = b.educationLevel; }
      else if (sortCol === 'status')     { va = APP_STATUS_SORT[deriveAppStatus(a.appOpen, a.appDeadline)] ?? 99; vb = APP_STATUS_SORT[deriveAppStatus(b.appOpen, b.appDeadline)] ?? 99; }
      else if (sortCol === 'appwindow')    { va = a.appDeadline; vb = b.appDeadline; }
      else if (sortCol === 'applications') { va = appCounts[a.id]?.total ?? 0; vb = appCounts[b.id]?.total ?? 0; }
      if (va < vb) return -1 * sortDir;
      if (va > vb) return  1 * sortDir;
      return 0;
    });

  const counts = {
    all:       progs.length,
    active:    progs.filter(p => p.status === 'Active').length,
    draft:     progs.filter(p => p.status === 'Draft').length,
    completed: progs.filter(p => p.status === 'Completed').length,
  };
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedProgrammes = filtered.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

  function openMenu(e: React.MouseEvent, progId: string) {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    setActiveProgId(progId);
    setMenuOpen(true);
  }

  function closeMenu() { setMenuOpen(false); setActiveProgId(null); }

  function menuAction(action: string) {
    const prog = progs.find(p => p.id === activeProgId);
    closeMenu();
    if (!prog) return;
    if (action === 'edit')      openEdit(prog);
    if (action === 'duplicate') openDup(prog);
    if (action === 'delete')    setDeleteProg(prog);
    if (action === 'complete')  changeProgStatus(prog.id, 'Completed');
    if (action === 'activate')  changeProgStatus(prog.id, 'Active');
  }

  function changeProgStatus(id: string, status: ProgStatus) {
    const next = progs.map(p => p.id === id ? { ...p, status } : p);
    save(next);
    showToast(`Programme marked as ${status}.`);
  }

  function viewDetail(prog: Programme) {
    localStorage.setItem('dsta_programme_view', JSON.stringify(prog));
    router.push(`/programmes/${prog.id}`);
  }

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function openCreate() {
    router.push('/programmes/new');
  }

  function openEdit(prog: Programme) {
    localStorage.setItem('dsta_edit_pending', prog.id);
    router.push('/programmes/edit');
  }

  function openDup(prog: Programme) {
    setDupProg(prog);
    setDupTitle(`Copy of ${prog.title}`);
    setDupError(false);
  }

  function confirmDup() {
    if (!dupTitle.trim()) { setDupError(true); return; }
    const d = new Date();
    const newId = `PROG${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${String(progs.length+1).padStart(5,'0')}`;
    const dup: Programme = { ...dupProg!, id: newId, title: dupTitle.trim(), status: 'Draft', requirements: JSON.parse(JSON.stringify(dupProg!.requirements ?? [])) };
    save([dup, ...progs]);
    setDupProg(null);
    showToast(`"${dupTitle}" created as a draft duplicate.`);
  }

  function confirmDelete() {
    if (!deleteProg) return;
    save(progs.filter(p => p.id !== deleteProg.id));
    setDeleteProg(null);
    showToast(`"${deleteProg.title}" has been deleted.`);
  }


  return (
    <Shell activeRoute="/programmes">

      {/* Header */}
      <div className="mb-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
          <div>
            <h1 className="text-headline-lg text-fg">Programmes</h1>
          </div>
          <Button onClick={openCreate} className="self-start"><Plus size={16} />Create Programme</Button>
        </div>
      </div>

      {/* Intern-category filter — IOs manage programmes by intern category */}
      <div className="mb-4">
        <ProgToggle
          options={[{ value: 'all', label: 'All categories' }, ...EDUCATION_LEVELS.map(c => ({ value: c, label: c }))]}
          value={activeCat}
          onChange={setActiveCat}
        />
      </div>

      {/* Table card */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-sm">

        {/* Search + Filters toolbar — at the top, searches across all tabs */}
        <TableToolbar
          search={search} onSearch={setSearch} placeholder="Search by ID or Title…"
          colDefs={COL_DEFS.map(c => ({ key: c.key, label: c.label }))}
          visibleCols={visibleCols} onToggleCol={k => toggleCol(k as ColKey)}
          onExport={() => exportToCSV('programmes.csv',
            ['ID', 'Title', 'Intern Category', 'Status', 'App Open', 'App Deadline'],
            filtered.map(p => [p.id, p.title, p.educationLevel, p.status, p.appOpen ?? '', p.appDeadline ?? ''])
          )}
        />

        {/* Tabs */}
        <div className="border-b border-border px-3 py-3 overflow-x-auto">
          <Tabs
            value={activeTab}
            onValueChange={(k) => setActiveTab(k as Tab)}
          >
            <TabsList aria-label="Programme status">
              <TabsTrigger value="draft">
                Draft <span className="ml-2 text-body-sm font-semibold text-current">({counts.draft})</span>
              </TabsTrigger>
              <TabsTrigger value="active">
                Active <span className="ml-2 text-body-sm font-semibold text-current">({counts.active})</span>
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed <span className="ml-2 text-body-sm font-semibold text-current">({counts.completed})</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>


        {/* Mobile card list */}
        <div className="sm:hidden divide-y divide-border">
          {filtered.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title={progs.length === 0 ? 'No programmes yet' : 'No programmes match your filters'}
              description={progs.length === 0 ? 'Create a programme to start configuring intakes and applications.' : 'Adjust your search, tab, or table filters to see more programmes.'}
              action={progs.length === 0 ? <Button onClick={openCreate}><Plus size={16} />Create Programme</Button> : undefined}
              size="sm"
            />
          ) : paginatedProgrammes.map(p => {
            const appStatus = p.appOpen && p.appDeadline ? deriveAppStatus(p.appOpen, p.appDeadline) : null;
            const total = appCounts[p.id]?.total ?? 0;
            const intakes = programmeIntakes(p);
            const isOpen = expanded.has(p.id);
            return (
              <Fragment key={p.id}>
                <div
                  onClick={() => viewDetail(p)}
                  className="flex items-start gap-3 px-4 py-4 hover:bg-bg-subtle/50 active:bg-bg-subtle cursor-pointer transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); toggleExpand(p.id); }}
                        aria-label={isOpen ? 'Collapse intakes' : 'Expand intakes'}
                        aria-expanded={isOpen}
                        className="p-0.5 rounded text-fg-subtle hover:text-fg hover:bg-bg-muted transition-colors shrink-0"
                      >
                        <ChevronRight
                          size={14}
                          className={cn('transition-transform duration-150', isOpen && 'rotate-90')}
                        />
                      </button>
                      <p className="text-body-md font-semibold text-fg group-hover:text-accent transition-colors truncate">{p.title}</p>
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); toggleExpand(p.id); }}
                        className="text-caption font-normal text-accent hover:underline whitespace-nowrap"
                      >
                        {intakes.length} intake{intakes.length !== 1 ? 's' : ''}
                      </button>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <CategoryBadge category={p.educationLevel} />
                      {appStatus && <AppStatusBadge status={appStatus} />}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap text-body-sm text-fg-muted">
                      {p.appOpen && p.appDeadline
                        ? <span>{new Date(p.appOpen).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })} – {new Date(p.appDeadline).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        : <span>No dates set</span>}
                      <span className="font-medium text-fg flex items-center gap-1">
                        {total} applications
                      </span>
                    </div>
                  </div>
                  <RowMenuButton onClick={e => { e.stopPropagation(); openMenu(e, p.id); }} />
                </div>
                {isOpen && intakes.map((intake, idx) => {
                  const apps = (appIntake.byIntake[intake.id]?.total ?? 0) + (idx === 0 ? (appIntake.untagged[p.id]?.total ?? 0) : 0);
                  const status = intake.appOpen && intake.appClose ? deriveAppStatus(intake.appOpen, intake.appClose) : null;
                  return (
                    <div key={`${p.id}-${intake.id}`} className="px-8 py-3 bg-surface border-t border-border">
                      <p className="text-sm text-fg">
                        <span className="text-fg-muted">Internship Window</span>
                        <span className="mx-2 text-fg-muted">-</span>
                        <span>{intake.start && intake.end ? `${fmtDate(intake.start)} – ${fmtDate(intake.end)}` : 'Intake'}</span>
                      </p>
                      <div className="mt-2 flex items-center gap-3 flex-wrap text-sm text-fg-muted">
                        {status ? <AppStatusBadge status={status} /> : <span>—</span>}
                        <span>{intake.appOpen && intake.appClose ? `${fmtDate(intake.appOpen)} – ${fmtDate(intake.appClose)}` : '—'}</span>
                        <span className="text-fg">{p.status === 'Draft' ? '—' : apps} applications</span>
                      </div>
                    </div>
                  );
                })}
              </Fragment>
            );
          })}
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block">
          <Table className="text-left">
            <TableHeader className="bg-bg-subtle">
              <TableRow>
                {visibleCols.id           && <SortTh col="id"           label="Programme ID"        sortCol={sortCol} sortDir={sortDir} onSort={sort} />}
                {visibleCols.title        && <SortTh col="title"        label="Programme Title"     sortCol={sortCol} sortDir={sortDir} onSort={sort} className="min-w-[250px]" />}
                {visibleCols.progStatus   && <SortTh col="progStatus"   label="Programme Status"   sortCol={sortCol} sortDir={sortDir} onSort={sort} filter={headerFilterButton('programmeStatus')} />}
                {visibleCols.status       && <SortTh col="status"       label="Application Status"  sortCol={sortCol} sortDir={sortDir} onSort={sort} filter={headerFilterButton('applicationStatus')} />}
                {visibleCols.appwindow    && <SortTh col="appwindow"    label="Application Window"  sortCol={sortCol} sortDir={sortDir} onSort={sort} />}
                {visibleCols.applications && <SortTh col="applications" label="Applications"        sortCol={sortCol} sortDir={sortDir} onSort={sort} />}
                <TableHead className="px-4 py-3" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={Object.values(visibleCols).filter(Boolean).length + 1} className="px-6 py-0">
                    <EmptyState
                      icon={SearchX}
                      title={progs.length === 0 ? 'No programmes yet' : 'No programmes match your filters'}
                      description={progs.length === 0 ? 'Create a programme to start configuring intakes and applications.' : 'Adjust your search, tab, or table filters to see more programmes.'}
                      action={progs.length === 0 ? <Button onClick={openCreate}><Plus size={16} />Create Programme</Button> : undefined}
                      size="sm"
                    />
                  </TableCell>
                </TableRow>
              ) : paginatedProgrammes.map(p => {
                const intakes = programmeIntakes(p);
                const multi = intakes.length > 1;
                const expandable = intakes.length > 0;
                const isOpen = expanded.has(p.id);
                return (
                  <Fragment key={p.id}>
                  <TableRow
                    onClick={() => viewDetail(p)}
                    className="hover:bg-bg-subtle/50 transition-colors cursor-pointer group"
                  >
                    {visibleCols.id         && (
                      <TableCell className="px-4 py-3 text-body-sm font-medium text-fg-muted">
                        <div className="flex items-center gap-2">
                          {expandable ? (
                            <button
                              type="button"
                              onClick={e => { e.stopPropagation(); toggleExpand(p.id); }}
                              aria-label={isOpen ? 'Collapse intakes' : 'Expand intakes'}
                              aria-expanded={isOpen}
                              className="p-0.5 rounded text-fg-subtle hover:text-fg hover:bg-bg-muted transition-colors shrink-0"
                            >
                              <ChevronRight
                                size={14}
                                className={cn('transition-transform duration-150', isOpen && 'rotate-90')}
                              />
                            </button>
                          ) : (
                            <span className="w-[18px] shrink-0" aria-hidden="true" />
                          )}
                          <span>{p.id}</span>
                        </div>
                      </TableCell>
                    )}
                    {visibleCols.title      && <TableCell className="px-4 py-3 min-w-[250px]">
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                        <p className="min-w-0 text-sm font-medium text-fg group-hover:text-accent transition-colors">{p.title}</p>
                        {expandable && (
                          <button
                            type="button"
                            onClick={e => { e.stopPropagation(); toggleExpand(p.id); }}
                            className="justify-self-end text-caption font-normal text-accent hover:underline whitespace-nowrap"
                          >
                            {intakes.length} intake{intakes.length !== 1 ? 's' : ''}
                          </button>
                        )}
                      </div>
                    </TableCell>}
                    {visibleCols.progStatus && <TableCell className="px-4 py-3"><StatusDot status={p.status} /></TableCell>}
                    {visibleCols.status    && <TableCell className="px-4 py-3">
                      {multi
                        ? <button type="button" onClick={e => { e.stopPropagation(); toggleExpand(p.id); }} className="text-body-sm text-accent hover:underline">{intakes.length} intakes</button>
                        : (intakes[0].appOpen && intakes[0].appClose
                            ? <AppStatusBadge status={deriveAppStatus(intakes[0].appOpen, intakes[0].appClose)} />
                            : <span className="text-fg-subtle text-body-sm">—</span>)}
                    </TableCell>}
                    {visibleCols.appwindow && <TableCell className="px-4 py-3 text-body-sm text-fg">
                      {multi
                        ? <span className="text-fg-muted">Expand to view windows</span>
                        : (intakes[0].appOpen && intakes[0].appClose
                            ? `${fmtDate(intakes[0].appOpen)} – ${fmtDate(intakes[0].appClose)}`
                            : '—')}
                    </TableCell>}
                    {visibleCols.applications && (() => {
                      const total = appCounts[p.id]?.total ?? 0;
                      return (
                        <TableCell className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-fg">{total}</span>
                          </div>
                        </TableCell>
                      );
                    })()}
                    <TableCell className="px-4 py-3">
                      <RowMenuButton onClick={e => openMenu(e, p.id)} />
                    </TableCell>
                  </TableRow>
                  {isOpen && intakes.map((intake, idx) => {
                    const apps = (appIntake.byIntake[intake.id]?.total ?? 0) + (idx === 0 ? (appIntake.untagged[p.id]?.total ?? 0) : 0);
                    const status = intake.appOpen && intake.appClose ? deriveAppStatus(intake.appOpen, intake.appClose) : null;
                    return (
                      <TableRow
                        key={`${p.id}-${intake.id}`}
                        className="bg-surface hover:bg-bg-subtle/40 transition-colors"
                      >
                        {(visibleCols.id || visibleCols.title) && (
                          <TableCell
                            colSpan={(visibleCols.id ? 1 : 0) + (visibleCols.title ? 1 : 0)}
                            className="pl-8 pr-4 py-2.5"
                          >
                            <p className="text-sm text-fg whitespace-nowrap">
                              <span className="text-fg-muted">Internship Window</span>
                              <span className="mx-2 text-fg-muted">-</span>
                              <span>{intake.start && intake.end ? `${fmtDate(intake.start)} – ${fmtDate(intake.end)}` : 'Intake'}</span>
                            </p>
                          </TableCell>
                        )}
                        {visibleCols.progStatus && <TableCell className="px-4 py-2.5" />}
                        {visibleCols.status && (
                          <TableCell className="px-4 py-2.5">
                            {status ? <AppStatusBadge status={status} /> : <span className="text-fg-subtle text-sm">—</span>}
                          </TableCell>
                        )}
                        {visibleCols.appwindow && (
                          <TableCell className="px-4 py-2.5 text-sm text-fg-muted">
                            {intake.appOpen && intake.appClose ? `${fmtDate(intake.appOpen)} – ${fmtDate(intake.appClose)}` : '—'}
                          </TableCell>
                        )}
                        {visibleCols.applications && (
                          <TableCell className="px-4 py-2.5 text-sm font-medium text-fg">
                            {p.status === 'Draft' ? '—' : apps}
                          </TableCell>
                        )}
                        <TableCell className="px-4 py-2.5" />
                      </TableRow>
                    );
                  })}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-surface border-t border-border flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-body-sm text-fg-muted">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <Select
              value={String(rowsPerPage)}
              onValueChange={value => {
                setRowsPerPage(Number(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-[88px] text-body-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map(value => (
                  <SelectItem key={value} value={String(value)}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {filtered.length > 0 && (
            <Pagination className="mx-0 w-auto justify-end">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    aria-disabled={safePage === 1}
                    className={cn(safePage === 1 && 'pointer-events-none opacity-50')}
                    onClick={e => {
                      e.preventDefault();
                      if (safePage > 1) setCurrentPage(safePage - 1);
                    }}
                  />
                </PaginationItem>
                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(page => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      href="#"
                      isActive={page === safePage}
                      onClick={e => {
                        e.preventDefault();
                        setCurrentPage(page);
                      }}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    aria-disabled={safePage === totalPages}
                    className={cn(safePage === totalPages && 'pointer-events-none opacity-50')}
                    onClick={e => {
                      e.preventDefault();
                      if (safePage < totalPages) setCurrentPage(safePage + 1);
                    }}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      </div>

      {openHeaderFilter && (
        <>
          <div className="fixed inset-0 z-[150]" onClick={() => setOpenHeaderFilter(null)} />
          <div
            className="fixed bg-surface border border-border rounded-lg shadow-lg z-[200] py-1.5 min-w-[13rem]"
            style={{ top: headerFilterPos.top, left: headerFilterPos.left }}
            onClick={e => e.stopPropagation()}
          >
            <p className="px-3 py-1 text-caption font-semibold text-fg-subtle uppercase tracking-widest">
              {HEADER_FILTERS[openHeaderFilter].label}
            </p>
            {HEADER_FILTERS[openHeaderFilter].options.map(opt => {
              const checked = getHeaderFilterValues(openHeaderFilter).includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggleHeaderFilterValue(openHeaderFilter, opt)}
                  className="w-full flex items-center gap-2.5 px-3 py-1.5 text-body-sm text-fg hover:bg-bg-subtle transition-colors text-left"
                >
                  <Checkbox
                    checked={checked}
                    aria-label={`Toggle ${opt}`}
                    tabIndex={-1}
                    className="pointer-events-none"
                  />
                  {opt}
                </button>
              );
            })}
            {getHeaderFilterValues(openHeaderFilter).length > 0 && (
              <button
                type="button"
                onClick={() => setHeaderFilterValues(openHeaderFilter, [])}
                className="mt-1 w-full px-3 py-1.5 text-left text-body-sm text-fg-muted hover:text-danger hover:bg-bg-subtle transition-colors"
              >
                Clear filter
              </button>
            )}
          </div>
        </>
      )}

      {/* Action menu */}
      {menuOpen && (() => {
        const menuProg = progs.find(p => p.id === activeProgId);
        return (
          <RowDropdown pos={menuPos} onClose={closeMenu}>
            <DropdownItem icon={<Pencil size={15} className="text-fg-muted" />}    label="Edit"      onClick={() => menuAction('edit')} />
            <DropdownItem icon={<Copy size={15} className="text-fg-muted" />}      label="Duplicate" onClick={() => menuAction('duplicate')} />
            {menuProg?.status === 'Active' && (
              <>
                <DropdownDivider />
                <DropdownItem icon={<CircleCheck size={15} className="text-fg-muted" />} label="Mark as Completed" onClick={() => menuAction('complete')} />
              </>
            )}
            {menuProg?.status === 'Completed' && (
              <>
                <DropdownDivider />
                <DropdownItem icon={<CirclePlay size={15} className="text-fg-muted" />} label="Mark as Active" onClick={() => menuAction('activate')} />
              </>
            )}
            <DropdownDivider />
            <DropdownItem icon={<Trash2 size={15} />} label="Delete" danger onClick={() => menuAction('delete')} />
          </RowDropdown>
        );
      })()}




      {/* Duplicate Modal */}
      <Modal open={!!dupProg} onClose={() => setDupProg(null)} labelledBy="duplicate-programme-title">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-info-bg flex items-center justify-center shrink-0">
            <Copy size={18} className="text-accent" />
          </div>
          <h2 id="duplicate-programme-title" className="text-headline-md text-fg">Duplicate Programme</h2>
        </div>
        <div className="mb-4">
          <label className="block text-body-md font-semibold text-fg mb-1.5">New Programme Title <span className="text-danger">*</span></label>
          <input
            value={dupTitle}
            onChange={e => { setDupTitle(e.target.value); setDupError(false); }}
            placeholder="Enter a title for the duplicate"
            className={cn('input', dupError && 'border-danger')}
            autoFocus
          />
          {dupError && <p className="text-body-sm text-danger mt-1.5">Please enter a programme title.</p>}
        </div>
        <div className="flex items-start gap-2.5 px-4 py-3 bg-bg-subtle rounded-lg border border-border mb-6">
          <Info size={16} className="text-accent shrink-0 mt-0.5" />
          <p className="text-body-sm text-fg-muted">The duplicate will start as <strong className="text-fg">Draft</strong>. All eligibility requirements and settings will be copied over — you can edit them afterwards.</p>
        </div>
        <div className="flex gap-3 justify-end">
          <Button onClick={confirmDup}><Copy size={16} />Duplicate</Button>
          <Button variant="outline" onClick={() => setDupProg(null)}>Cancel</Button>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal open={!!deleteProg} onClose={() => setDeleteProg(null)} labelledBy="delete-programme-title">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-danger-bg flex items-center justify-center shrink-0">
            <Trash2 size={18} className="text-danger" />
          </div>
          <h2 id="delete-programme-title" className="text-headline-md text-fg">Delete Programme</h2>
        </div>
        <p className="text-body-md text-fg-muted mb-1">Are you sure you want to delete</p>
        <p className="text-body-md font-semibold text-fg mb-1">"{deleteProg?.title}"</p>
        <p className="text-body-sm text-fg-muted mb-6">This action cannot be undone.</p>
        <div className="flex gap-3 justify-end">
          <Button variant="danger" onClick={confirmDelete}><Trash2 size={16} />Delete</Button>
          <Button variant="outline" onClick={() => setDeleteProg(null)}>Cancel</Button>
        </div>
      </Modal>

      <Toast message={toast} />
    </Shell>
  );
}
