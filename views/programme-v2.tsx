'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BriefcaseBusiness,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  CirclePlay,
  Copy,
  Eye,
  FolderOpen,
  Home,
  Info,
  List,
  Pencil,
  Plus,
  SearchX,
  Trash2,
} from 'lucide-react';
import Shell from '@/components/layout/shell';
import Button from '@/components/ui-legacy/button';
import TableToolbar from '@/components/ui-legacy/table-toolbar';
import EmptyState from '@/components/ui-legacy/empty-state';
import { DropdownDivider, DropdownItem, RowDropdown, RowMenuButton } from '@/components/ui-legacy/row-actions';
import { SuccessCelebration } from '@/components/ui-legacy/success-celebration';
import { Toast, useToast } from '@/components/ui-legacy/toast';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EDUCATION_LEVELS, internCategoriesForLevel } from '@/lib/data';
import { programmeIntakes, type NormalisedIntake } from '@/lib/intakes';
import { useProgramme, PROGRAMMES_CHANGED_EVENT } from '@/lib/programme-context';
import { loadProgrammes, loadProjects, saveProgrammes } from '@/lib/storage';
import type { Programme, ProgStatus, ProjectEntry } from '@/lib/types';
import { cn, exportToCSV } from '@/lib/utils';

type StatusTab = 'active' | 'draft' | 'completed';
type SortDir = 1 | -1;
type SortKey = 'id' | 'title' | 'internshipWindow' | 'applicationWindow' | 'assignedProjects';
type ColumnKey = SortKey | 'actions';

const PAGE_SIZES = [10, 20, 50];
const COLS_STORAGE_KEY = 'dsta_prog_v2_visible_cols';
const COLUMN_DEFS = [
  { key: 'id', label: 'Programme ID', locked: true },
  { key: 'title', label: 'Programme Title', locked: true },
  { key: 'internshipWindow', label: 'Internship Window' },
  { key: 'applicationWindow', label: 'Application Window' },
  { key: 'assignedProjects', label: 'Assigned Projects' },
] as const;
const DEFAULT_COLUMNS: Record<ColumnKey, boolean> = {
  id: true,
  title: true,
  internshipWindow: true,
  applicationWindow: true,
  assignedProjects: true,
  actions: true,
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || '—';
  return date.toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatIntakeLabel(intake?: NormalisedIntake): string {
  if (!intake?.start || !intake?.end) return 'Intake not configured';
  const start = new Date(intake.start);
  const end = new Date(intake.end);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return `${intake.start} – ${intake.end}`;
  const startMonth = start.toLocaleDateString('en-SG', { month: 'short' });
  const endMonth = end.toLocaleDateString('en-SG', { month: 'short' });
  return `${startMonth}–${endMonth} ${end.getFullYear()} Intake`;
}

function assignedProjectCount(projects: ProjectEntry[], programmeId: string): number {
  return projects.filter(project => project.programme === programmeId && !project.archived).length;
}

function intakeProjectCount(
  projects: ProjectEntry[],
  programmeId: string,
  intakeId: string,
  intakes: NormalisedIntake[],
): number {
  return projects.filter(project => {
    if (project.programme !== programmeId || project.archived) return false;
    if (project.intakeId) return project.intakeId === intakeId;
    return intakes[0]?.id === intakeId;
  }).length;
}

function statusVariant(status: ProgStatus): 'success' | 'warning' | 'subtle' {
  if (status === 'Active') return 'success';
  if (status === 'Draft') return 'warning';
  return 'subtle';
}

export default function ProgrammeV2Page() {
  const router = useRouter();
  const { activeProg, setActiveProg } = useProgramme();
  const { toast, showToast } = useToast();

  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [projects, setProjects] = useState<ProjectEntry[]>([]);
  const [applicationCount, setApplicationCount] = useState(0);
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState<StatusTab>('active');
  const [category, setCategory] = useState('All Intern categories');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(1);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(PAGE_SIZES[0]);
  const [visibleColumns, setVisibleColumns] = useState<Record<ColumnKey, boolean>>(DEFAULT_COLUMNS);

  const [menuProgrammeId, setMenuProgrammeId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
  const [duplicateProgramme, setDuplicateProgramme] = useState<Programme | null>(null);
  const [duplicateTitle, setDuplicateTitle] = useState('');
  const [duplicateError, setDuplicateError] = useState(false);
  const [deleteProgramme, setDeleteProgramme] = useState<Programme | null>(null);
  const [createdDialogOpen, setCreatedDialogOpen] = useState(false);

  useEffect(() => {
    setProgrammes(loadProgrammes());
    setProjects(loadProjects());

    try {
      const saved = localStorage.getItem(COLS_STORAGE_KEY);
      if (saved) setVisibleColumns({ ...DEFAULT_COLUMNS, ...JSON.parse(saved) });
    } catch {/* keep defaults */}

    try {
      const pendingToast = sessionStorage.getItem('dsta_pending_toast');
      if (pendingToast) {
        sessionStorage.removeItem('dsta_pending_toast');
        showToast(pendingToast);
      }
      if (sessionStorage.getItem('dsta_programme_success_dialog')) {
        sessionStorage.removeItem('dsta_programme_success_dialog');
        setCreatedDialogOpen(true);
      }
    } catch {/* noop */}
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadApplicationCount() {
      try {
        const raw = localStorage.getItem('dsta_applications');
        const applications = raw
          ? JSON.parse(raw) as Array<{ programmeId?: string }>
          : (await import('@/data/applications.json')).default as Array<{ programmeId?: string }>;
        if (!cancelled) setApplicationCount(applications.filter(application => application.programmeId === activeProg).length);
      } catch {
        if (!cancelled) setApplicationCount(0);
      }
    }
    void loadApplicationCount();
    return () => { cancelled = true; };
  }, [activeProg]);

  useEffect(() => {
    setPage(1);
  }, [search, statusTab, category, sortKey, sortDir]);

  const currentProgramme = useMemo(
    () => programmes.find(programme => programme.id === activeProg) ?? programmes[0],
    [programmes, activeProg],
  );
  const currentIntake = currentProgramme ? programmeIntakes(currentProgramme)[0] : undefined;

  const counts = useMemo(() => ({
    active: programmes.filter(programme => programme.status === 'Active').length,
    draft: programmes.filter(programme => programme.status === 'Draft').length,
    completed: programmes.filter(programme => programme.status === 'Completed').length,
  }), [programmes]);

  const filteredProgrammes = useMemo(() => {
    const query = search.trim().toLowerCase();
    return programmes
      .filter(programme => {
        const matchesStatus = programme.status.toLowerCase() === statusTab;
        const matchesCategory = category === 'All Intern categories'
          || internCategoriesForLevel(programme.educationLevel).includes(category);
        if (!matchesStatus || !matchesCategory) return false;
        if (!query) return true;
        const intakes = programmeIntakes(programme);
        return programme.id.toLowerCase().includes(query)
          || programme.title.toLowerCase().includes(query)
          || programme.educationLevel.toLowerCase().includes(query)
          || intakes.some(intake => [intake.start, intake.end, intake.appOpen, intake.appClose]
            .some(value => formatDate(value).toLowerCase().includes(query)));
      })
      .sort((left, right) => {
        if (!sortKey) return 0;
        const leftIntake = programmeIntakes(left)[0];
        const rightIntake = programmeIntakes(right)[0];
        const values: Record<SortKey, [string | number, string | number]> = {
          id: [left.id, right.id],
          title: [left.title, right.title],
          internshipWindow: [leftIntake?.start ?? '', rightIntake?.start ?? ''],
          applicationWindow: [leftIntake?.appOpen ?? '', rightIntake?.appOpen ?? ''],
          assignedProjects: [assignedProjectCount(projects, left.id), assignedProjectCount(projects, right.id)],
        };
        const [a, b] = values[sortKey];
        return a < b ? -1 * sortDir : a > b ? 1 * sortDir : 0;
      });
  }, [programmes, projects, search, statusTab, category, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredProgrammes.length / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const visibleProgrammes = filteredProgrammes.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

  function persist(next: Programme[]) {
    setProgrammes(next);
    saveProgrammes(next);
    window.dispatchEvent(new Event(PROGRAMMES_CHANGED_EVENT));
  }

  function createProgramme() {
    router.push('/programmes/new');
  }

  function viewProgramme(programme: Programme) {
    setActiveProg(programme.id);
    localStorage.setItem('dsta_programme_view', JSON.stringify(programme));
    router.push(`/programmes/${programme.id}`);
  }

  function editProgramme(programme: Programme) {
    localStorage.setItem('dsta_edit_pending', programme.id);
    router.push('/programmes/edit');
  }

  function toggleExpanded(programmeId: string) {
    setExpanded(current => {
      const next = new Set(current);
      if (next.has(programmeId)) next.delete(programmeId);
      else next.add(programmeId);
      return next;
    });
  }

  function toggleColumn(key: ColumnKey) {
    setVisibleColumns(current => {
      const next = { ...current, [key]: !current[key] };
      try { localStorage.setItem(COLS_STORAGE_KEY, JSON.stringify(next)); } catch {/* noop */}
      return next;
    });
  }

  function sortBy(key: SortKey) {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir(1);
      return;
    }
    if (sortDir === 1) {
      setSortDir(-1);
      return;
    }
    setSortKey(null);
    setSortDir(1);
  }

  function openMenu(event: React.MouseEvent, programmeId: string) {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    setMenuPosition({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    setMenuProgrammeId(programmeId);
  }

  function openDuplicate(programme: Programme) {
    setMenuProgrammeId(null);
    setDuplicateProgramme(programme);
    setDuplicateTitle(`Copy of ${programme.title}`);
    setDuplicateError(false);
  }

  function confirmDuplicate() {
    if (!duplicateProgramme || !duplicateTitle.trim()) {
      setDuplicateError(true);
      return;
    }
    const now = new Date();
    const newId = `PROG${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(programmes.length + 1).padStart(5, '0')}`;
    const copy: Programme = {
      ...duplicateProgramme,
      id: newId,
      title: duplicateTitle.trim(),
      status: 'Draft',
      requirements: JSON.parse(JSON.stringify(duplicateProgramme.requirements ?? [])),
    };
    persist([copy, ...programmes]);
    setDuplicateProgramme(null);
    showToast(`“${copy.title}” created as a draft duplicate.`);
  }

  function changeStatus(programme: Programme, status: ProgStatus) {
    setMenuProgrammeId(null);
    persist(programmes.map(item => item.id === programme.id ? { ...item, status } : item));
    showToast(`Programme marked as ${status}.`);
  }

  function confirmDelete() {
    if (!deleteProgramme) return;
    persist(programmes.filter(programme => programme.id !== deleteProgramme.id));
    showToast(`“${deleteProgramme.title}” has been deleted.`);
    setDeleteProgramme(null);
  }

  function SortButton({ column, children }: { column: SortKey; children: React.ReactNode }) {
    const active = sortKey === column;
    return (
      <button
        type="button"
        onClick={() => sortBy(column)}
        className="inline-flex cursor-pointer items-center gap-1 text-left text-xs font-semibold text-fg-muted hover:text-fg"
      >
        {children}
        {active
          ? sortDir === 1
            ? <ArrowUp size={13} className="text-accent" />
            : <ArrowDown size={13} className="text-accent" />
          : <ArrowUpDown size={13} className="text-fg-subtle" />}
      </button>
    );
  }

  const programmeNavItems = currentProgramme ? [
    { label: 'Overview', icon: Home, onClick: () => router.push(`/programmes/${currentProgramme.id}`) },
    { label: 'Projects & Capacity', icon: BriefcaseBusiness, onClick: () => router.push(`/programmes/${currentProgramme.id}?view=projects`) },
    { label: 'Applications', icon: FolderOpen, count: applicationCount, onClick: () => router.push(`/applications?programme=${currentProgramme.id}`) },
    { label: 'Activity', icon: Activity, onClick: () => router.push(`/programmes/${currentProgramme.id}?view=activity`) },
  ] : [];

  return (
    <Shell activeRoute="/programmes">
      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <div className="grid min-h-[calc(100vh-128px)] lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="border-b border-border bg-surface lg:border-b-0 lg:border-r" aria-label="Programme navigation">
            <div className="p-4 lg:sticky lg:top-[80px]">
              <p className="mb-3 text-label-sm font-bold uppercase tracking-wider text-fg-muted">Programmes</p>

              <button
                type="button"
                aria-current="page"
                className="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-accent/30 bg-accent/5 px-3 py-3 text-left text-accent"
              >
                <List size={18} />
                <span className="flex-1 text-body-sm font-semibold">All Programmes</span>
                <Badge variant="subtle">{programmes.length}</Badge>
                <ChevronRight size={16} />
              </button>

              <Button variant="outline" className="mt-3 w-full" onClick={createProgramme}>
                <Plus size={16} /> New Programme
              </Button>

              {currentProgramme && (
                <div className="mt-5 border-t border-border pt-5">
                  <p className="mb-3 text-label-sm font-bold uppercase tracking-wider text-fg-muted">Current Programme</p>
                  <button
                    type="button"
                    onClick={() => viewProgramme(currentProgramme)}
                    className="flex w-full cursor-pointer items-start gap-2 rounded-lg px-2 py-2 text-left hover:bg-bg-muted"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body-sm font-semibold text-fg">{currentProgramme.title}</span>
                      <span className="mt-1 block text-caption text-fg-muted">{formatIntakeLabel(currentIntake)}</span>
                    </span>
                    <ChevronDown size={15} className="mt-0.5 text-fg-muted" />
                  </button>

                  <nav className="mt-2 space-y-1" aria-label={`${currentProgramme.title} sections`}>
                    {programmeNavItems.map(item => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.label}
                          type="button"
                          onClick={item.onClick}
                          className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-body-sm font-medium text-fg-muted hover:bg-bg-muted hover:text-fg"
                        >
                          <Icon size={18} />
                          <span className="flex-1">{item.label}</span>
                          {'count' in item && typeof item.count === 'number' && item.count > 0
                            ? <Badge variant="subtle">{item.count}</Badge>
                            : null}
                        </button>
                      );
                    })}
                  </nav>
                </div>
              )}
            </div>
          </aside>

          <section className="min-w-0 bg-bg px-4 py-5 sm:px-5 lg:px-5" aria-labelledby="programme-list-title">
            <nav className="mb-4 flex items-center gap-2 text-body-sm text-fg-muted" aria-label="Breadcrumb">
              <span className="font-medium text-accent">Programmes</span>
              <ChevronRight size={14} />
              <span>All Programmes</span>
            </nav>

            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 id="programme-list-title" className="text-headline-lg text-fg">Programme List</h1>
                <p className="mt-1 text-body-sm text-fg-muted">Create programmes, configure intake windows, and track assigned projects.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={category} onValueChange={value => setCategory(value ?? 'All Intern categories')}>
                  <SelectTrigger className="min-w-[190px]">
                    <SelectValue placeholder="All Intern categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All Intern categories">All Intern categories</SelectItem>
                    {EDUCATION_LEVELS.map(level => <SelectItem key={level} value={level}>{level}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button onClick={createProgramme}><Plus size={16} /> Create Programme</Button>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
              <TableToolbar
                search={search}
                onSearch={setSearch}
                placeholder="Search programme ID or title…"
                columnsLabel="Edit Columns"
                colDefs={COLUMN_DEFS.map(column => ({ ...column }))}
                visibleCols={visibleColumns}
                onToggleCol={key => toggleColumn(key as ColumnKey)}
                onExport={() => exportToCSV(
                  'programmes-v2.csv',
                  ['Programme ID', 'Programme Title', 'Internship Window', 'Application Window', 'Assigned Projects'],
                  filteredProgrammes.map(programme => {
                    const intakes = programmeIntakes(programme);
                    return [
                      programme.id,
                      programme.title,
                      intakes.length > 1 ? `${intakes.length} intakes` : `${formatDate(intakes[0]?.start ?? '')} – ${formatDate(intakes[0]?.end ?? '')}`,
                      intakes.length > 1 ? '—' : `${formatDate(intakes[0]?.appOpen ?? '')} – ${formatDate(intakes[0]?.appClose ?? '')}`,
                      String(assignedProjectCount(projects, programme.id)),
                    ];
                  }),
                )}
              />

              <div className="border-b border-border px-4 py-3">
                <Tabs value={statusTab} onValueChange={value => setStatusTab(value as StatusTab)}>
                  <TabsList aria-label="Programme status">
                    <TabsTrigger value="active">Active <span className="ml-1.5">({counts.active})</span></TabsTrigger>
                    <TabsTrigger value="draft">Draft <span className="ml-1.5">({counts.draft})</span></TabsTrigger>
                    <TabsTrigger value="completed">Completed <span className="ml-1.5">({counts.completed})</span></TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="hidden md:block">
                {visibleProgrammes.length === 0 ? (
                  <EmptyState
                    icon={SearchX}
                    title={programmes.length === 0 ? 'No programmes yet' : 'No programmes match your filters'}
                    description={programmes.length === 0
                      ? 'Create a programme to start configuring intakes and applications.'
                      : 'Adjust the search, status, or category filter to see more programmes.'}
                    action={programmes.length === 0 ? <Button onClick={createProgramme}><Plus size={16} /> Create Programme</Button> : undefined}
                    size="sm"
                  />
                ) : (
                  <Table className="min-w-[740px] table-fixed">
                    <TableHeader className="bg-bg-subtle/60">
                      <TableRow className="hover:bg-bg-subtle/60">
                        {visibleColumns.id && <TableHead className="w-[122px]"><SortButton column="id">Programme ID</SortButton></TableHead>}
                        {visibleColumns.title && <TableHead className="w-[190px]"><SortButton column="title">Programme Title</SortButton></TableHead>}
                        {visibleColumns.internshipWindow && <TableHead className="w-[145px]"><SortButton column="internshipWindow">Internship Window</SortButton></TableHead>}
                        {visibleColumns.applicationWindow && <TableHead className="w-[145px]"><SortButton column="applicationWindow">Application Window</SortButton></TableHead>}
                        {visibleColumns.assignedProjects && <TableHead className="w-[96px]"><SortButton column="assignedProjects">Assigned Projects</SortButton></TableHead>}
                        <TableHead className="w-[42px]"><span className="sr-only">Actions</span></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visibleProgrammes.map(programme => {
                        const intakes = programmeIntakes(programme);
                        const expandable = intakes.length > 1;
                        const open = expanded.has(programme.id);
                        return (
                          <Fragment key={programme.id}>
                            <TableRow
                              className="group cursor-pointer"
                              onClick={() => expandable ? toggleExpanded(programme.id) : viewProgramme(programme)}
                            >
                              {visibleColumns.id && (
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    {expandable ? (
                                      <button
                                        type="button"
                                        aria-label={open ? 'Collapse intakes' : 'Expand intakes'}
                                        aria-expanded={open}
                                        onClick={event => { event.stopPropagation(); toggleExpanded(programme.id); }}
                                        className="cursor-pointer rounded p-1 text-fg-muted hover:bg-bg-muted hover:text-fg"
                                      >
                                        <ChevronRight size={14} className={cn('transition-transform', open && 'rotate-90')} />
                                      </button>
                                    ) : <span className="w-[22px]" aria-hidden />}
                                    <span className="whitespace-nowrap text-body-sm font-medium text-fg-muted">{programme.id}</span>
                                  </div>
                                </TableCell>
                              )}
                              {visibleColumns.title && (
                                <TableCell>
                                  <button
                                    type="button"
                                    onClick={event => { event.stopPropagation(); viewProgramme(programme); }}
                                    className="cursor-pointer text-left"
                                  >
                                    <span className="block text-body-sm font-semibold text-accent hover:underline">{programme.title}</span>
                                    <span className="mt-1 flex items-center gap-2 text-caption text-fg-muted">
                                      {programme.educationLevel}
                                      <Badge variant={statusVariant(programme.status)}>{programme.status}</Badge>
                                    </span>
                                  </button>
                                </TableCell>
                              )}
                              {visibleColumns.internshipWindow && (
                                <TableCell className="leading-5">
                                  {expandable
                                    ? <button type="button" className="cursor-pointer font-medium text-accent hover:underline" onClick={event => { event.stopPropagation(); toggleExpanded(programme.id); }}>{intakes.length} intakes</button>
                                    : `${formatDate(intakes[0]?.start ?? '')} – ${formatDate(intakes[0]?.end ?? '')}`}
                                </TableCell>
                              )}
                              {visibleColumns.applicationWindow && (
                                <TableCell className="leading-5 text-fg-muted">
                                  {expandable ? 'Multiple windows' : `${formatDate(intakes[0]?.appOpen ?? '')} – ${formatDate(intakes[0]?.appClose ?? '')}`}
                                </TableCell>
                              )}
                              {visibleColumns.assignedProjects && (
                                <TableCell className="font-semibold">{assignedProjectCount(projects, programme.id)}</TableCell>
                              )}
                              <TableCell onClick={event => event.stopPropagation()}>
                                <RowMenuButton alwaysVisible onClick={event => openMenu(event, programme.id)} />
                              </TableCell>
                            </TableRow>
                            {open && intakes.map((intake, index) => (
                              <TableRow key={intake.id} className="bg-bg-subtle/35 hover:bg-bg-subtle/50">
                                {visibleColumns.id && <TableCell className="pl-10 text-fg-muted">Intake {index + 1}</TableCell>}
                                {visibleColumns.title && <TableCell className="text-fg-muted">{formatIntakeLabel(intake)}</TableCell>}
                                {visibleColumns.internshipWindow && <TableCell>{formatDate(intake.start)} – {formatDate(intake.end)}</TableCell>}
                                {visibleColumns.applicationWindow && <TableCell>{formatDate(intake.appOpen)} – {formatDate(intake.appClose)}</TableCell>}
                                {visibleColumns.assignedProjects && <TableCell>{intakeProjectCount(projects, programme.id, intake.id, intakes)}</TableCell>}
                                <TableCell />
                              </TableRow>
                            ))}
                          </Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>

              <div className="divide-y divide-border md:hidden">
                {visibleProgrammes.map(programme => {
                  const intakes = programmeIntakes(programme);
                  const open = expanded.has(programme.id);
                  return (
                    <div key={programme.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <button type="button" onClick={() => toggleExpanded(programme.id)} className="mt-0.5 cursor-pointer rounded p-1 text-fg-muted hover:bg-bg-muted">
                          <ChevronRight size={16} className={cn('transition-transform', open && 'rotate-90')} />
                        </button>
                        <button type="button" onClick={() => viewProgramme(programme)} className="min-w-0 flex-1 cursor-pointer text-left">
                          <span className="block text-body-md font-semibold text-accent">{programme.title}</span>
                          <span className="mt-1 block text-body-sm text-fg-muted">{programme.id} · {programme.educationLevel}</span>
                          <span className="mt-2 flex flex-wrap items-center gap-2 text-body-sm text-fg-muted">
                            <Badge variant={statusVariant(programme.status)}>{programme.status}</Badge>
                            <span>{intakes.length} intake{intakes.length !== 1 ? 's' : ''}</span>
                            <span>{assignedProjectCount(projects, programme.id)} assigned</span>
                          </span>
                        </button>
                        <RowMenuButton alwaysVisible onClick={event => openMenu(event, programme.id)} />
                      </div>
                      {open && (
                        <div className="mt-3 space-y-2 border-l border-border pl-7">
                          {intakes.map((intake, index) => (
                            <div key={intake.id} className="rounded-lg bg-bg-subtle p-3 text-body-sm text-fg-muted">
                              <p className="font-semibold text-fg">Intake {index + 1}</p>
                              <p className="mt-1">Internship: {formatDate(intake.start)} – {formatDate(intake.end)}</p>
                              <p>Applications: {formatDate(intake.appOpen)} – {formatDate(intake.appClose)}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-col gap-3 border-t border-border bg-surface px-4 py-3 text-body-sm text-fg-muted sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <span>Rows per page:</span>
                  <Select value={String(rowsPerPage)} onValueChange={value => { setRowsPerPage(Number(value)); setPage(1); }}>
                    <SelectTrigger className="h-8 w-[84px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAGE_SIZES.map(size => <SelectItem key={size} value={String(size)}>{size}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {filteredProgrammes.length > 0 && (
                  <Pagination className="mx-0 w-auto justify-end">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          aria-disabled={safePage === 1}
                          className={cn(safePage === 1 && 'pointer-events-none opacity-50')}
                          onClick={event => { event.preventDefault(); if (safePage > 1) setPage(safePage - 1); }}
                        />
                      </PaginationItem>
                      {Array.from({ length: totalPages }, (_, index) => index + 1).map(pageNumber => (
                        <PaginationItem key={pageNumber}>
                          <PaginationLink href="#" isActive={pageNumber === safePage} onClick={event => { event.preventDefault(); setPage(pageNumber); }}>
                            {pageNumber}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          aria-disabled={safePage === totalPages}
                          className={cn(safePage === totalPages && 'pointer-events-none opacity-50')}
                          onClick={event => { event.preventDefault(); if (safePage < totalPages) setPage(safePage + 1); }}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      {menuProgrammeId && (() => {
        const programme = programmes.find(item => item.id === menuProgrammeId);
        if (!programme) return null;
        return (
          <RowDropdown pos={menuPosition} onClose={() => setMenuProgrammeId(null)}>
            <DropdownItem icon={<Eye size={15} />} label="View" onClick={() => { setMenuProgrammeId(null); viewProgramme(programme); }} />
            {programme.status !== 'Completed' && <DropdownItem icon={<Pencil size={15} />} label="Edit" onClick={() => { setMenuProgrammeId(null); editProgramme(programme); }} />}
            <DropdownItem icon={<Copy size={15} />} label="Duplicate" onClick={() => openDuplicate(programme)} />
            {programme.status === 'Active' && (
              <>
                <DropdownDivider />
                <DropdownItem icon={<CircleCheck size={15} />} label="Mark as Completed" onClick={() => changeStatus(programme, 'Completed')} />
              </>
            )}
            {programme.status === 'Completed' && (
              <>
                <DropdownDivider />
                <DropdownItem icon={<CirclePlay size={15} />} label="Mark as Active" onClick={() => changeStatus(programme, 'Active')} />
              </>
            )}
            <DropdownDivider />
            <DropdownItem icon={<Trash2 size={15} />} label="Delete" danger onClick={() => { setMenuProgrammeId(null); setDeleteProgramme(programme); }} />
          </RowDropdown>
        );
      })()}

      <Dialog open={duplicateProgramme != null} onOpenChange={open => { if (!open) setDuplicateProgramme(null); }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Duplicate Programme</DialogTitle>
            <DialogDescription>The duplicate starts as Draft and keeps the original eligibility requirements and settings.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label htmlFor="duplicate-programme-title" className="mb-1.5 block text-body-sm font-semibold text-fg">
              New Programme Title <span className="text-danger">*</span>
            </label>
            <Input
              id="duplicate-programme-title"
              value={duplicateTitle}
              onChange={event => { setDuplicateTitle(event.target.value); setDuplicateError(false); }}
              aria-invalid={duplicateError}
              autoFocus
            />
            {duplicateError && <p className="mt-1.5 text-body-sm text-danger">Please enter a programme title.</p>}
            <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-border bg-bg-subtle px-4 py-3">
              <Info size={16} className="mt-0.5 shrink-0 text-info" />
              <p className="text-body-sm text-fg-muted">You can edit the copied intake windows and requirements before activating it.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDuplicateProgramme(null)}>Cancel</Button>
            <Button onClick={confirmDuplicate}><Copy size={16} /> Duplicate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteProgramme != null} onOpenChange={open => { if (!open) setDeleteProgramme(null); }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Delete Programme</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong className="text-fg">“{deleteProgramme?.title}”</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteProgramme(null)}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete}><Trash2 size={16} /> Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createdDialogOpen} onOpenChange={setCreatedDialogOpen}>
        <DialogContent className="border-none bg-transparent p-0 shadow-none">
          <SuccessCelebration
            title="Task Completed"
            message="You have successfully completed this test task. Your responses have been recorded."
            buttonText="Back to Tasks"
            onButtonClick={() => { setCreatedDialogOpen(false); router.push('/start-tasks'); }}
          />
        </DialogContent>
      </Dialog>

      <Toast message={toast} />
    </Shell>
  );
}
