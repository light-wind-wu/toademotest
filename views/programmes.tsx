'use client';

import { useState, useEffect, useMemo, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import Shell from '@/components/layout/shell';
import Button from '@/components/ui-legacy/button';
import {
  Plus, Pencil, Copy, Trash2, Info, SearchX, Eye,
  ChevronRight, CircleCheck, CirclePlay, CornerDownRight,
  ArrowUp, ArrowDown, ArrowUpDown,
} from 'lucide-react';
import { RowMenuButton, RowDropdown, DropdownItem, DropdownDivider } from '@/components/ui-legacy/row-actions';
import TableToolbar from '@/components/ui-legacy/table-toolbar';
import {
  DataTable,
  createColumnHelper,
  type ColumnDef,
  type Row,
} from '@/components/ui-legacy/data-table';
import type { Table as TanStackTable } from '@tanstack/react-table';
import {
  TableRow,
  TableCell,
} from '@/components/ui-legacy/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import EmptyState from '@/components/ui-legacy/empty-state';
import { SuccessCelebration } from '@/components/ui-legacy/success-celebration';
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
} from '@/components/ui-legacy/select';
import { EDUCATION_LEVELS, internCategoriesForLevel } from '@/lib/data';
import { loadProgrammes, saveProgrammes, loadProjects } from '@/lib/storage';
import { PROGRAMMES_CHANGED_EVENT } from '@/lib/programme-context';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Toast, useToast } from '@/components/ui-legacy/toast';
import { cn, exportToCSV } from '@/lib/utils';
import { programmeIntakes, type NormalisedIntake } from '@/lib/intakes';
import type { Programme, ProgStatus, ProjectEntry } from '@/lib/types';

/* ── Date helpers ─────────────────────────────────────────────────────────── */
const fmtDate = (d: string) => {
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' });
};

/* ── Project count helpers ──────────────────────────────────────────────────── */
function countAssignedProjects(projects: ProjectEntry[], programmeId: string): number {
  return projects.filter(p => p.programme === programmeId && !p.archived).length;
}

function countAssignedIntakeProjects(
  projects: ProjectEntry[],
  programmeId: string,
  intakeId: string,
  intakes: NormalisedIntake[],
): number {
  return projects.filter(p => {
    if (p.programme !== programmeId || p.archived) return false;
    if (p.intakeId) return p.intakeId === intakeId;
    return intakes[0]?.id === intakeId;
  }).length;
}

/* ── Main page ────────────────────────────────────────────────────────────── */
type Tab = 'all' | 'active' | 'draft' | 'completed';
type SortDir = 1 | -1;
type ColKey = 'id' | 'title' | 'internshipWindow' | 'applicationWindow' | 'assignedProjects' | 'actions';
const PAGE_SIZE_OPTIONS = [10, 20, 50];

const COL_DEFS = [
  { key: 'id', label: 'Programme ID', locked: true },
  { key: 'title', label: 'Programme Title', locked: true },
  { key: 'internshipWindow', label: 'Internship Window' },
  { key: 'applicationWindow', label: 'Application Window' },
  { key: 'assignedProjects', label: 'Assigned Projects' },
] as const;

const DEFAULT_COLS: Record<ColKey, boolean> = {
  id: true, title: true, internshipWindow: true, applicationWindow: true, assignedProjects: true, actions: true,
};
const COLS_STORAGE_KEY = 'dsta_prog_visible_cols_v2';

export default function ProgrammesPage() {
  const router = useRouter();

  const [progs, setProgs] = useState<Programme[]>([]);
  const [projects, setProjects] = useState<ProjectEntry[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('active');
  const [activeCat, setActiveCat] = useState('All Intern categories');
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(PAGE_SIZE_OPTIONS[0]);

  const [visibleCols, setVisibleCols] = useState<Record<ColKey, boolean>>(DEFAULT_COLS);
  function toggleCol(key: ColKey) {
    setVisibleCols(prev => {
      const next = { ...prev, [key]: !prev[key] };
      try { localStorage.setItem(COLS_STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const [activeProgId, setActiveProgId] = useState<string | null>(null);

  const [deleteProg, setDeleteProg] = useState<Programme | null>(null);
  const [dupProg, setDupProg] = useState<Programme | null>(null);
  const [dupTitle, setDupTitle] = useState('');
  const [dupError, setDupError] = useState(false);

  const { toast, showToast } = useToast();

  const [createdDialogOpen, setCreatedDialogOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(COLS_STORAGE_KEY);
      if (saved) setVisibleCols({ ...DEFAULT_COLS, ...JSON.parse(saved) });
    } catch {}
    setProgs(loadProgrammes());
    setProjects(loadProjects());
    const msg = sessionStorage.getItem('dsta_pending_toast');
    if (msg) { sessionStorage.removeItem('dsta_pending_toast'); showToast(msg); }
    const created = sessionStorage.getItem('dsta_programme_success_dialog');
    if (created) {
      sessionStorage.removeItem('dsta_programme_success_dialog');
      setCreatedDialogOpen(true);
    }
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, activeTab, activeCat, sortCol, sortDir]);

  function save(p: Programme[]) {
    setProgs(p);
    saveProgrammes(p);
    window.dispatchEvent(new Event(PROGRAMMES_CHANGED_EVENT));
  }

  function tabMatch(p: Programme): boolean {
    if (activeTab === 'active') return p.status === 'Active';
    if (activeTab === 'draft') return p.status === 'Draft';
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

  const filtered = useMemo(() => progs
    .filter(p =>
      tabMatch(p) &&
      (!search || (() => {
        const q = search.toLowerCase();
        const intakes = programmeIntakes(p);
        return (
          p.id.toLowerCase().includes(q) ||
          p.title.toLowerCase().includes(q) ||
          p.educationLevel.toLowerCase().includes(q) ||
          p.status.toLowerCase().includes(q) ||
          intakes.some(i =>
            (i.start && new Date(i.start).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' }).toLowerCase().includes(q)) ||
            (i.end && new Date(i.end).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' }).toLowerCase().includes(q)) ||
            (i.appOpen && new Date(i.appOpen).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' }).toLowerCase().includes(q)) ||
            (i.appClose && new Date(i.appClose).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' }).toLowerCase().includes(q))
          )
        );
      })()) &&
      (activeCat === 'All Intern categories' || internCategoriesForLevel(p.educationLevel).includes(activeCat))
    )
    .sort((a, b) => {
      if (!sortCol) return 0;
      const intakesA = programmeIntakes(a);
      const intakesB = programmeIntakes(b);
      let va: string | number = '', vb: string | number = '';
      if (sortCol === 'id') { va = a.id; vb = b.id; }
      else if (sortCol === 'title') { va = a.title; vb = b.title; }
      else if (sortCol === 'internshipWindow') { va = intakesA[0]?.start ?? ''; vb = intakesB[0]?.start ?? ''; }
      else if (sortCol === 'applicationWindow') { va = intakesA[0]?.appOpen ?? ''; vb = intakesB[0]?.appOpen ?? ''; }
      else if (sortCol === 'assignedProjects') { va = countAssignedProjects(projects, a.id); vb = countAssignedProjects(projects, b.id); }
      if (va < vb) return -1 * sortDir;
      if (va > vb) return 1 * sortDir;
      return 0;
    }), [progs, search, activeTab, activeCat, sortCol, sortDir, projects]);

  const counts = {
    all: progs.length,
    active: progs.filter(p => p.status === 'Active').length,
    draft: progs.filter(p => p.status === 'Draft').length,
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
    if (action === 'view') viewDetail(prog);
    if (action === 'edit') openEdit(prog);
    if (action === 'duplicate') openDup(prog);
    if (action === 'delete') setDeleteProg(prog);
    if (action === 'complete') changeProgStatus(prog.id, 'Completed');
    if (action === 'activate') changeProgStatus(prog.id, 'Active');
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

  function SortHeader({
    label, colId, sortCol, sortDir, onSort,
  }: {
    label: string;
    colId: string;
    sortCol: string | null;
    sortDir: SortDir;
    onSort: (col: string) => void;
  }) {
    const isSorted = sortCol === colId;
    return (
      <div
        onClick={(e) => { e.stopPropagation(); onSort(colId); }}
        className="flex h-full items-center gap-1 cursor-pointer select-none"
      >
        <span className="truncate">{label}</span>
        {isSorted ? (
          sortDir === 1 ? <ArrowUp size={13} className="text-accent shrink-0" /> : <ArrowDown size={13} className="text-accent shrink-0" />
        ) : (
          <ArrowUpDown size={13} className="text-fg-subtle shrink-0" />
        )}
      </div>
    );
  }

  const columnHelper = createColumnHelper<Programme>();

  const columns: ColumnDef<Programme, any>[] = useMemo(() => {
    const cols: ColumnDef<Programme, any>[] = [];

    if (visibleCols.id) {
      cols.push(columnHelper.display({
        id: 'id',
        header: () => <SortHeader label="Programme ID" colId="id" sortCol={sortCol} sortDir={sortDir} onSort={sort} />,
        meta: { size: 'long' },
        cell: ({ row }) => {
          const p = row.original;
          const intakes = programmeIntakes(p);
          const expandable = intakes.length > 1;
          const isOpen = expanded.has(p.id);
          return (
            <div className="flex items-center gap-2">
              {expandable ? (
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); toggleExpand(p.id); }}
                  aria-label={isOpen ? 'Collapse intakes' : 'Expand intakes'}
                  aria-expanded={isOpen}
                  className="p-0.5 rounded text-fg-subtle hover:text-fg hover:bg-bg-muted transition-colors shrink-0"
                >
                  <ChevronRight size={14} className={cn('transition-transform duration-150', isOpen && 'rotate-90')} />
                </button>
              ) : (
                <span className="w-[18px] shrink-0" aria-hidden="true" />
              )}
              <span className="text-body-sm font-medium text-fg-muted">{p.id}</span>
            </div>
          );
        },
      }));
    }

    if (visibleCols.title) {
      cols.push(columnHelper.display({
        id: 'title',
        header: () => <SortHeader label="Programme Title" colId="title" sortCol={sortCol} sortDir={sortDir} onSort={sort} />,
        meta: { size: 330 },
        cell: ({ row }) => {
          const p = row.original;
          return (
            <p className="min-w-0 text-sm font-medium text-fg transition-colors">{p.title}</p>
          );
        },
      }));
    }

    if (visibleCols.internshipWindow) {
      cols.push(columnHelper.display({
        id: 'internshipWindow',
        header: () => <SortHeader label="Internship Window" colId="internshipWindow" sortCol={sortCol} sortDir={sortDir} onSort={sort} />,
        meta: { size: 'long' },
        cell: ({ row }) => {
          const p = row.original;
          const intakes = programmeIntakes(p);
          if (intakes.length > 1) {
            return (
              <button
                type="button"
                onClick={e => { e.stopPropagation(); toggleExpand(p.id); }}
                className="text-body-sm"
              >
                {intakes.length} intake{intakes.length !== 1 ? 's' : ''}
              </button>
            );
          }
          return (
            <span className="text-body-sm text-fg">
              {intakes[0]?.start && intakes[0]?.end
                ? `${fmtDate(intakes[0].start)} – ${fmtDate(intakes[0].end)}`
                : '—'}
            </span>
          );
        },
      }));
    }

    if (visibleCols.applicationWindow) {
      cols.push(columnHelper.display({
        id: 'applicationWindow',
        header: () => <SortHeader label="Application Window" colId="applicationWindow" sortCol={sortCol} sortDir={sortDir} onSort={sort} />,
        meta: { size: 'long' },
        cell: ({ row }) => {
          const p = row.original;
          const intakes = programmeIntakes(p);
          if (intakes.length > 1) return null;
          return (
            <span className="text-body-sm text-fg">
              {intakes[0]?.appOpen && intakes[0]?.appClose
                ? `${fmtDate(intakes[0].appOpen)} – ${fmtDate(intakes[0].appClose)}`
                : '—'}
            </span>
          );
        },
      }));
    }

    if (visibleCols.assignedProjects) {
      cols.push(columnHelper.display({
        id: 'assignedProjects',
        header: () => <SortHeader label="Assigned Projects" colId="assignedProjects" sortCol={sortCol} sortDir={sortDir} onSort={sort} />,
        meta: { size: 'short' },
        cell: ({ row }) => {
          const p = row.original;
          const intakes = programmeIntakes(p);
          if (intakes.length > 1) return null;
          const count = countAssignedProjects(projects, p.id);
          return <span className="text-body-sm font-medium text-fg">{count}</span>;
        },
      }));
    }

    cols.push(columnHelper.display({
      id: 'actions',
      header: '',
      meta: { size: 'icon', sticky: 'right' },
      cell: ({ row }) => (
        <div className="text-right" onClick={e => e.stopPropagation()}>
          <RowMenuButton onClick={e => openMenu(e, row.original.id)} />
        </div>
      ),
    }));

    return cols;
  }, [visibleCols, expanded, sortCol, sortDir, projects]);

  const renderSubRows = (row: Row<Programme>, table: TanStackTable<Programme>) => {
    const p = row.original;
    if (!expanded.has(p.id)) return null;
    const intakes = programmeIntakes(p);
    return intakes.map((intake, idx) => {
      const count = countAssignedProjects(projects, p.id);
      return (
        <TableRow key={`${p.id}-${intake.id}`} className="bg-surface hover:bg-bg-subtle/40 transition-colors">
          {visibleCols.id && (
            <TableCell className="pl-8 pr-4 py-2.5" maxWidth={table.getColumn('id')?.getSize()}>
              <p className="text-sm text-fg whitespace-nowrap flex items-center gap-2">
                <CornerDownRight size={16} className="text-fg-muted" />
                Intake {idx + 1}
              </p>
            </TableCell>
          )}
          {visibleCols.title && (
            <TableCell className="px-4 py-2.5 text-sm text-fg-muted" maxWidth={table.getColumn('title')?.getSize()}>—</TableCell>
          )}
          {visibleCols.internshipWindow && (
            <TableCell className="px-4 py-2.5 text-sm text-fg" maxWidth={table.getColumn('internshipWindow')?.getSize()}>
              {intake.start && intake.end ? `${fmtDate(intake.start)} – ${fmtDate(intake.end)}` : '—'}
            </TableCell>
          )}
          {visibleCols.applicationWindow && (
            <TableCell className="px-4 py-2.5 text-sm text-fg" maxWidth={table.getColumn('applicationWindow')?.getSize()}>
              {intake.appOpen && intake.appClose ? `${fmtDate(intake.appOpen)} – ${fmtDate(intake.appClose)}` : '—'}
            </TableCell>
          )}
          {visibleCols.assignedProjects && (
            <TableCell className="px-4 py-2.5 text-sm font-medium text-fg" maxWidth={table.getColumn('assignedProjects')?.getSize()}>
              {count}
            </TableCell>
          )}
          <TableCell className="px-4 py-2.5" maxWidth={table.getColumn('actions')?.getSize()} />
        </TableRow>
      );
    });
  };

  return (
    <Shell activeRoute="/programmes">
      {/* Header */}
      <div className="mb-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
          <div>
            <h1 className="text-headline-lg text-fg">Programme List</h1>
          </div>
          <div className="flex items-center gap-3 self-start">
            <Select value={activeCat} onValueChange={v => setActiveCat(v ?? 'All Intern categories')}>
              <SelectTrigger className="min-w-[177px] text-body-sm">
                <SelectValue placeholder="All Intern categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Intern categories">All Intern categories</SelectItem>
                {EDUCATION_LEVELS.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={openCreate}><Plus size={16} />Create Programme</Button>
          </div>
        </div>
      </div>

      {/* Table card */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-sm">
        <TableToolbar
          className="border-b-0 pb-0 sm:pb-0"
          search={search} onSearch={setSearch}
          placeholder="Search by…"
          columnsLabel="Edit Columns"
          colDefs={COL_DEFS.map(c => ({ key: c.key, label: c.label, locked: (c as any).locked }))}
          visibleCols={visibleCols}
          onToggleCol={k => toggleCol(k as ColKey)}
          onExport={() => exportToCSV('programmes.csv',
            ['Programme ID', 'Programme Title', 'Internship Window', 'Application Window', 'Assigned Projects'],
            filtered.map(p => {
              const intakes = programmeIntakes(p);
              return [
                p.id,
                p.title,
                intakes.length > 1 ? `${intakes.length} intakes` : (intakes[0]?.start && intakes[0]?.end ? `${fmtDate(intakes[0].start)} – ${fmtDate(intakes[0].end)}` : '—'),
                intakes.length > 1 ? '—' : (intakes[0]?.appOpen && intakes[0]?.appClose ? `${fmtDate(intakes[0].appOpen)} – ${fmtDate(intakes[0].appClose)}` : '—'),
                intakes.length > 1 ? '—' : String(countAssignedProjects(projects, p.id)),
              ];
            })
          )}
        />

        {/* Tabs */}
        <div className="border-border px-3 py-3 overflow-x-auto">
          <Tabs value={activeTab} onValueChange={(k) => setActiveTab(k as Tab)}>
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
              description={progs.length === 0 ? 'Create a programme to start configuring intakes and applications.' : 'Adjust your search, tab, or category filter to see more programmes.'}
              action={progs.length === 0 ? <Button onClick={openCreate}><Plus size={16} />Create Programme</Button> : undefined}
              size="sm"
            />
          ) : paginatedProgrammes.map(p => {
            const intakes = programmeIntakes(p);
            const expandable = intakes.length > 1;
            const isOpen = expanded.has(p.id);
            return (
              <Fragment key={p.id}>
                <div
                  onClick={() => viewDetail(p)}
                  className="flex items-start gap-3 px-4 py-4 hover:bg-bg-subtle/50 active:bg-bg-subtle cursor-pointer transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      {expandable ? (
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); toggleExpand(p.id); }}
                          aria-label={isOpen ? 'Collapse intakes' : 'Expand intakes'}
                          aria-expanded={isOpen}
                          className="p-0.5 rounded text-fg-subtle hover:text-fg hover:bg-bg-muted transition-colors shrink-0"
                        >
                          <ChevronRight size={14} className={cn('transition-transform duration-150', isOpen && 'rotate-90')} />
                        </button>
                      ) : (
                        <span className="w-[18px] shrink-0" aria-hidden="true" />
                      )}
                      <p className="text-body-md font-semibold text-fg group-hover:text-accent transition-colors truncate">{p.title}</p>
                    </div>
                    <p className="text-body-sm text-fg-muted mb-1.5">{p.id}</p>
                    <div className="flex items-center gap-3 flex-wrap text-body-sm text-fg-muted">
                      {expandable ? (
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); toggleExpand(p.id); }}
                          className="text-accent hover:underline"
                        >
                          {intakes.length} intake{intakes.length !== 1 ? 's' : ''}
                        </button>
                      ) : (
                        <>
                          <span>{intakes[0]?.start && intakes[0]?.end ? `${fmtDate(intakes[0].start)} – ${fmtDate(intakes[0].end)}` : '—'}</span>
                          <span>{intakes[0]?.appOpen && intakes[0]?.appClose ? `${fmtDate(intakes[0].appOpen)} – ${fmtDate(intakes[0].appClose)}` : '—'}</span>
                        </>
                      )}
                      <span className="font-medium text-fg">{countAssignedProjects(projects, p.id)} assigned</span>
                    </div>
                  </div>
                  <RowMenuButton onClick={e => { e.stopPropagation(); openMenu(e, p.id); }} />
                </div>
                {isOpen && expandable && intakes.map((intake, idx) => {
                  const count = countAssignedIntakeProjects(projects, p.id, intake.id, intakes);
                  return (
                    <div key={`${p.id}-${intake.id}`} className="px-8 py-3 bg-surface border-t border-border">
                      <p className="text-sm text-fg flex items-center gap-2">
                        <CornerDownRight size={16} className="text-fg-muted" />
                        Intake {idx + 1}
                      </p>
                      <div className="mt-2 flex items-center gap-3 flex-wrap text-sm text-fg-muted">
                        <span>{intake.start && intake.end ? `${fmtDate(intake.start)} – ${fmtDate(intake.end)}` : '—'}</span>
                        <span>{intake.appOpen && intake.appClose ? `${fmtDate(intake.appOpen)} – ${fmtDate(intake.appClose)}` : '—'}</span>
                        <span className="text-fg">{count} assigned</span>
                      </div>
                    </div>
                  );
                })}
              </Fragment>
            );
          })}
        </div>

        {/* Desktop DataTable */}
        <div className="hidden sm:block">
          <DataTable
            tableKey="programmes"
            columns={columns}
            data={paginatedProgrammes}
            enableSorting={false}
            onRowClick={(p) => toggleExpand(p.id)}
            renderSubRows={renderSubRows}
            getRowId={(p) => p.id}
            emptyState={
              <EmptyState
                icon={SearchX}
                title={progs.length === 0 ? 'No programmes yet' : 'No programmes match your filters'}
                description={progs.length === 0 ? 'Create a programme to start configuring intakes and applications.' : 'Adjust your search, tab, or category filter to see more programmes.'}
                action={progs.length === 0 ? <Button onClick={openCreate}><Plus size={16} />Create Programme</Button> : undefined}
                size="sm"
              />
            }
            wrapperClassName="px-4"
          />
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

      {/* Action menu */}
      {menuOpen && (() => {
        const menuProg = progs.find(p => p.id === activeProgId);
        return (
          <RowDropdown pos={menuPos} onClose={closeMenu}>
            {menuProg && (
              <DropdownItem icon={<Eye size={15} className="text-fg-muted" />} label="View" onClick={() => menuAction('view')} />
            )}
            {menuProg?.status !== 'Completed' && (
              <DropdownItem icon={<Pencil size={15} className="text-fg-muted" />} label="Edit" onClick={() => menuAction('edit')} />
            )}
            <DropdownItem icon={<Copy size={15} className="text-fg-muted" />} label="Duplicate" onClick={() => menuAction('duplicate')} />
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

      {/* Duplicate Dialog */}
      <Dialog open={!!dupProg} onOpenChange={(open) => { if (!open) setDupProg(null); }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-info-bg flex items-center justify-center shrink-0">
                <Copy size={18} className="text-accent" />
              </div>
              Duplicate Programme
            </DialogTitle>
            <DialogDescription>
              The duplicate will start as <strong>Draft</strong>. All eligibility requirements and settings will be copied over — you can edit them afterwards.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="block text-body-md font-semibold text-fg mb-1.5">New Programme Title <span className="text-danger">*</span></label>
              <input
                value={dupTitle}
                onChange={e => { setDupTitle(e.target.value); setDupError(false); }}
                placeholder="Enter a title for the duplicate"
                className={cn('w-full rounded-md border border-border bg-surface px-3 py-2 text-body-sm text-fg outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent', dupError && 'border-danger')}
                autoFocus
              />
              {dupError && <p className="text-body-sm text-danger mt-1.5">Please enter a programme title.</p>}
            </div>
            <div className="flex items-start gap-2.5 px-4 py-3 bg-bg-subtle rounded-lg border border-border">
              <Info size={16} className="text-accent shrink-0 mt-0.5" />
              <p className="text-body-sm text-fg-muted">The duplicate will start as <strong className="text-fg">Draft</strong>. All eligibility requirements and settings will be copied over — you can edit them afterwards.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDupProg(null)}>Cancel</Button>
            <Button onClick={confirmDup}><Copy size={16} />Duplicate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteProg} onOpenChange={(open) => { if (!open) setDeleteProg(null); }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-danger-bg flex items-center justify-center shrink-0">
                <Trash2 size={18} className="text-danger" />
              </div>
              Delete Programme
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-semibold text-fg">"{deleteProg?.title}"</span>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteProg(null)}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete}><Trash2 size={16} />Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={createdDialogOpen}
        onOpenChange={(open) => {
          setCreatedDialogOpen(open);
        }}
      >
        <DialogContent className="border-none bg-transparent p-0 shadow-none">
          <SuccessCelebration
            title="Task Completed"
            message="You have successfully completed this test task. Your responses have been recorded."
            buttonText="Back to Tasks"
            onButtonClick={() => {
              setCreatedDialogOpen(false);
              router.push('/start-tasks');
            }}
          />
        </DialogContent>
      </Dialog>

      <Toast message={toast} />
    </Shell>
  );
}
