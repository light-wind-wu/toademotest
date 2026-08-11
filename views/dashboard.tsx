"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Settings,
  CheckCircle,
  Clock,
  UserCheck,
  X,
  Users,
  Repeat,
  UserPlus,
  Mail,
  MessageSquare,
  Inbox,
  FileBarChart2,
  Send,
  BookOpen,
  ChevronDown,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";
import Shell from "@/components/layout/shell";
import OutOfScopeDialog from "@/components/apply/out-of-scope-dialog";
import { COHORT_DATA, WIDGET_DEFS, STATUS_COLOURS } from "@/lib/data";
import DashboardCards from "@/components/ui-legacy/dashboard-cards";
import { useRole } from "@/lib/role";
import { cn } from "@/lib/utils";


function loadWidgetState(): Record<string, boolean> {
  if (typeof window === "undefined")
    return Object.fromEntries(WIDGET_DEFS.map((w) => [w.id, w.defaultOn]));
  try {
    const raw = localStorage.getItem("dsta-widget-state");
    if (raw) {
      const saved = JSON.parse(raw);
      // Only trust saved state if it contains all current widget ids
      const allPresent = WIDGET_DEFS.every((w) => w.id in saved);
      if (allPresent) return saved;
    }
  } catch {}
  const defaults = Object.fromEntries(
    WIDGET_DEFS.map((w) => [w.id, w.defaultOn]),
  );
  localStorage.setItem("dsta-widget-state", JSON.stringify(defaults));
  return defaults;
}

function saveWidgetState(s: Record<string, boolean>) {
  localStorage.setItem("dsta-widget-state", JSON.stringify(s));
}

type LiveFunnel = {
  total: number;
  eligible: number;
  inProgress: number;
  interviewCompleted: number;
  offerExtended: number;
  accepted: number;
  rejected: number;
};
const MOCK_FUNNEL: LiveFunnel = {
  total: 29,
  eligible: 7,
  inProgress: 10,
  interviewCompleted: 6,
  offerExtended: 1,
  accepted: 0,
  rejected: 5,
};

export default function DashboardPage() {
  const router = useRouter();
  // `cohort` holds the selected intern category (or 'all') — IOs work by intern category.
  const [cohort, setCohort] = useState("all");
  const { role } = useRole();
  const [widgets, setWidgets] = useState<Record<string, boolean>>({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const newMenuRef = useRef<HTMLDivElement>(null);
  const [liveFunnel, setLiveFunnel] = useState<LiveFunnel>(MOCK_FUNNEL);
  const [exploreOpen, setExploreOpen] = useState(false);
  const [scopeDialogOpen, setScopeDialogOpen] = useState(false);

  type LiveTask = {
    icon: LucideIcon;
    color: string;
    bg: string;
    label: string;
    sub: string;
    tag: string;
    tagCls: string;
    href: string;
  };
  const [liveTasks, setLiveTasks] = useState<LiveTask[]>([]);

  useEffect(() => {
    setWidgets(loadWidgetState());
  }, []);

  // Close the "New" menu on an outside click.
  useEffect(() => {
    if (!newMenuOpen) return;
    function handler(e: MouseEvent) {
      if (newMenuRef.current && !newMenuRef.current.contains(e.target as Node)) {
        setNewMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [newMenuOpen]);

  // Quick actions for IO roles — surfaced via the header "New" menu. "Create Project"
  // opens the same upload-vs-create chooser as the Projects page (not a direct link).
  const quickActions: { label: string; icon: LucideIcon; href?: string; onClick?: () => void }[] = [
    { label: "Create Project Request", icon: Send, href: "/requests/new" },
    { label: "Create Programme", icon: BookOpen, href: "/programmes/new" },
  ];

  // Dashboard Application Overview 使用固定演示数据，不从 localStorage 实时计算。
  // 如需恢复真实数据，请把 liveFunnel 初始值改回 EMPTY_FUNNEL 并恢复下方的 useEffect。
  useEffect(() => {
    setLiveFunnel(MOCK_FUNNEL);
  }, [cohort]);

  // Application Overview / Tasks 使用固定演示数据，点击统一弹出 OutOfScopeDialog。
  function showScopeDialog() {
    setScopeDialogOpen(true);
  }

  // Tasks 使用固定演示数据，不走 seed/localStorage 的真实项目提交和请求。
  useEffect(() => {
    setLiveTasks([
      {
        icon: FileBarChart2,
        color: "text-warning",
        bg: "hover:bg-warning/5",
        label: "1 project submission awaiting review",
        sub: "Approve or reject from Project Requests → Project Submissions",
        tag: "1 pending",
        tagCls: STATUS_COLOURS.pending,
        href: "/requests?tab=submissions",
      },
      {
        icon: ShieldAlert,
        color: "text-warning",
        bg: "hover:bg-warning/5",
        label: "3 projects awaiting shortlisting",
        sub: "Review the eligible applicants and confirm the shortlist.",
        tag: "1 pending",
        tagCls: STATUS_COLOURS.pending,
        href: "/applications",
      },
    ]);
  }, []);

  const EMPTY_DATA = {
    funnel: {
      total: 0,
      shortlisted: 0,
      interview: 0,
      offersMade: 0,
      offersAccepted: 0,
      withdrawals: 0,
    },
    kpi: {
      total: "0",
      acceptance: "—",
      response: "—",
      headcount: "—",
      totalTrend: ["No data yet", "neu"] as [string, "neu"],
      acceptanceTrend: ["No data yet", "neu"] as [string, "neu"],
      responseTrend: ["No data yet", "neu"] as [string, "neu"],
      headcountSub: ["No data yet", "neu"] as [string, "neu"],
    },
    schools: [],
  };
  const data = COHORT_DATA[cohort] ?? EMPTY_DATA;

  function toggleWidget(id: string) {
    setWidgets((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      saveWidgetState(next);
      return next;
    });
  }

  const trendCls = (t: string) =>
    t === "pos"
      ? "text-success"
      : t === "neg"
        ? "text-danger"
        : "text-fg-muted";

  const maxSchool = Math.max(...data.schools.map((s) => s.count), 1);

  // Temporary: force both cards to render their empty-state placeholder on entry.
  const SHOW_EMPTY_STATE = false;

  const hasData = !SHOW_EMPTY_STATE && liveFunnel.total > 0;

  return (
    <Shell activeRoute="/dashboard">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h1 className="text-[24px] font-bold text-fg">Dashboard</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setExploreOpen(true)}
            className="flex h-9 w-[200px] items-center justify-between rounded-md border border-border bg-surface px-3 py-1 text-sm shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent cursor-pointer"
          >
            <span className="flex-1 text-left text-body-sm">
              {cohort === "all" ? "All Intern categories" : cohort}
            </span>
            <ChevronDown className="h-4 w-4 text-fg-muted" />
          </button>
          <OutOfScopeDialog open={exploreOpen} onOpenChange={setExploreOpen} />
          <OutOfScopeDialog open={scopeDialogOpen} onOpenChange={setScopeDialogOpen} />

          {(role === "io-admin" || role === "io") && (
            <div className="relative" ref={newMenuRef}>
              <button
                onClick={() => setNewMenuOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={newMenuOpen}
                className="flex items-center gap-1.5 bg-accent text-accent-fg font-normal text-[14px] px-4 py-2 rounded-lg hover:bg-accent/90 transition-all"
              >
                Quick Actions
                <ChevronDown
                  size={15}
                  className={cn("transition-transform", newMenuOpen && "rotate-180")}
                />
              </button>
              {newMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-72 rounded-xl border border-border bg-surface shadow-xl z-50 p-1.5"
                >
                  {quickActions.map((a) => (
                    <button
                      key={a.label}
                      role="menuitem"
                      onClick={() => {
                        setNewMenuOpen(false);
                        if (a.onClick) a.onClick();
                        else if (a.href) router.push(a.href);
                      }}
                      className="group flex w-full items-center gap-3 rounded-lg p-2.5 text-left transition-colors hover:bg-[#F4F2EC]"
                    >
                      <a.icon size={17} className="text-fg-muted shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-body-sm font-semibold text-fg">{a.label}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <button
            onClick={() => setDrawerOpen(true)}
            className="hidden flex items-center gap-2 text-accent font-bold text-label-md hover:bg-accent/5 px-4 py-2 rounded-lg border border-accent/20 transition-all"
          >
            <Settings size={18} />
            Customize
          </button>
        </div>
      </div>

      {/* Per-role action cards — "needs your attention" (hidden for IO roles) */}
      {role !== "io" && role !== "io-admin" && <DashboardCards />}

      {/* Grid */}
      <div className="grid grid-cols-12 gap-4">
        {/* Application Overview bar chart */}
        <div className="col-span-12 lg:col-span-6 card p-5">
          <h2 className="text-[18px] font-semibold text-fg mb-4">
            Application Overview
          </h2>
          {!hasData ? (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
              <img
                src="/images/application-overview-empty.png"
                alt=""
                className="w-[240px] h-auto"
              />
              <p className="text-body-md font-semibold text-fg">
                Dashboard content placeholder
              </p>
              <p className="text-body-sm text-fg-muted max-w-[360px]">
                This area is a preview of the future Dashboard and is not part of
                this usability test. Please continue with your task.
              </p>
            </div>
          ) : (
            (() => {
              const ROWS = [
                { label: "Eligible", val: liveFunnel.eligible },
                { label: "In Progress", val: liveFunnel.inProgress },
                { label: "Interview Completed", val: liveFunnel.interviewCompleted },
                { label: "Offer Extended", val: liveFunnel.offerExtended },
                { label: "Accepted", val: liveFunnel.accepted },
                { label: "Rejected", val: liveFunnel.rejected },
              ];
              const barMax = liveFunnel.total || 1;
              return (
                <div className="space-y-5">
                  <div className="pb-5 border-b border-border">
                    <p className="text-[14px] font-normal text-fg">
                      Total Applications <span className="text-[20px] font-semibold text-accent ml-2">{liveFunnel.total}</span>
                    </p>
                  </div>
                  <div className="space-y-3">
                    {ROWS.map((r) => (
                      <button
                        key={r.label}
                        onClick={showScopeDialog}
                        className="w-full flex items-center gap-4 group text-left"
                      >
                        <span className="text-[13px] text-[rgba(69,85,108,1)] w-36 shrink-0">
                          {r.label}
                        </span>
                        <div className="flex-1 bg-[#F4F2EC] rounded-full h-2.5 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-accent transition-all duration-500"
                            style={{ width: `${Math.max((r.val / barMax) * 100, r.val > 0 ? 3 : 0)}%` }}
                          />
                        </div>
                        <span className="text-[13px] font-semibold text-[rgba(69,85,108,1)] w-6 text-right shrink-0">
                          {r.val}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()
          )}
        </div>

        {/* Tasks */}
        <div className="col-span-12 lg:col-span-6 card p-5 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h2 className="text-[18px] font-semibold text-fg">Tasks {liveTasks.length > 0 && <span className="text-fg-muted">({liveTasks.length})</span>}</h2>
          </div>
          {liveTasks.length === 0 || SHOW_EMPTY_STATE ? (
            <div className="flex flex-col items-center justify-center py-8 text-center gap-3 flex-1">
              <img
                src="/images/tasks-empty.png"
                alt=""
                className="w-[240px] h-auto"
              />
              <p className="text-body-md font-semibold text-fg">
                Dashboard content placeholder
              </p>
              <p className="text-body-sm text-fg-muted max-w-[360px]">
                This area is a preview of the future Dashboard and is not part of
                this usability test. Please continue with your task.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {liveTasks.map((t, i) => (
                <a
                  key={i}
                  href={t.href}
                  onClick={(e) => {
                    e.preventDefault();
                    showScopeDialog();
                  }}
                  className="flex items-center gap-4 p-4 rounded-xl bg-surface border border-border cursor-pointer transition-colors no-underline hover:border-accent/30"
                >
                  <t.icon size={20} className={`${t.color} shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-body-md font-semibold text-fg truncate">
                      {t.label}
                    </p>
                    <p className="text-body-sm text-fg-muted mt-0.5">{t.sub}</p>
                  </div>
                  <span
                    className={cn(
                      "text-[12px] font-medium px-3 py-1 rounded-full shrink-0",
                      t.tagCls,
                    )}
                  >
                    {t.tag}
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* KPI Cards */}
        {widgets["kpi-cards"] && (
          <div className="col-span-12">
            <p className="text-table-header uppercase tracking-wider text-fg-muted mb-3">
              KPI Summary
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  icon: Users,
                  label: "Total Applicants",
                  val: data.kpi.total,
                  trend: data.kpi.totalTrend,
                },
                {
                  icon: CheckCircle,
                  label: "Acceptance Rate",
                  val: data.kpi.acceptance,
                  trend: data.kpi.acceptanceTrend,
                },
                {
                  icon: Clock,
                  label: "Avg. Response Time",
                  val: data.kpi.response,
                  trend: data.kpi.responseTrend,
                },
                {
                  icon: UserCheck,
                  label: "Headcount Filled",
                  val: data.kpi.headcount,
                  trend: data.kpi.headcountSub,
                },
              ].map(({ icon: Icon, label, val, trend }) => (
                <div key={label} className="card p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center shrink-0">
                      <Icon size={20} className="text-accent" />
                    </div>
                    <p className="text-body-md font-medium text-fg-muted">
                      {label}
                    </p>
                  </div>
                  <p className="text-metric text-fg">{val}</p>
                  <p
                    className={`text-body-sm mt-2 font-medium ${trendCls(trend[1])}`}
                  >
                    {trend[0]}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Interviews */}
        {widgets["upcoming-interviews"] && (
          <div className="col-span-12 lg:col-span-6 card p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-headline-md text-fg">Upcoming Interviews</h2>
              <span className="bg-accent/10 text-accent text-caption-bold px-2.5 py-1 rounded-full">
                4 This Week
              </span>
            </div>
            <div className="space-y-2">
              {[
                {
                  month: "May",
                  day: 20,
                  name: "Jenny Aw",
                  type: "Technical Interview",
                  time: "2:00 PM",
                  tagCls: "bg-danger/10 text-danger",
                  tag: "Today",
                },
                {
                  month: "May",
                  day: 21,
                  name: "Marcus Wong",
                  type: "Behavioural Interview",
                  time: "10:30 AM",
                  tagCls: "bg-warning-bg text-warning",
                  tag: "Tomorrow",
                },
                {
                  month: "May",
                  day: 22,
                  name: "Sarah Lim",
                  type: "Final Interview",
                  time: "3:00 PM",
                  tagCls: "bg-bg-muted text-fg-muted",
                  tag: "22 May",
                },
                {
                  month: "May",
                  day: 23,
                  name: "Ahmad Bin Rahim",
                  type: "Technical Interview",
                  time: "11:00 AM",
                  tagCls: "bg-bg-muted text-fg-muted",
                  tag: "23 May",
                },
              ].map((iv, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-accent/30 hover:bg-bg-subtle transition-all cursor-pointer"
                >
                  <div className="w-10 h-10 bg-accent/5 rounded-lg flex flex-col items-center justify-center shrink-0">
                    <span className="text-[12px] font-bold text-accent uppercase">
                      {iv.month}
                    </span>
                    <span className="text-base font-bold text-accent leading-none">
                      {iv.day}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-fg text-body-md">
                      {iv.name}
                    </p>
                    <p className="text-body-sm text-fg-muted mt-0.5">
                      {iv.type} · {iv.time}
                    </p>
                  </div>
                  <span
                    className={`text-caption-bold px-2 py-0.5 rounded shrink-0 ${iv.tagCls}`}
                  >
                    {iv.tag}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Schools */}
        {widgets["top-schools"] && (
          <div className="col-span-12 lg:col-span-6 card p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-headline-md text-fg">Top Schools</h2>
              <span className="text-body-sm text-fg-muted font-medium">
                By applicant count
              </span>
            </div>
            <div className="space-y-4">
              {data.schools.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
                  <Inbox size={28} className="text-fg-subtle" />
                  <p className="text-body-sm text-fg-muted">
                    No applicant data yet.
                  </p>
                </div>
              ) : (
                data.schools.map((s) => (
                  <div key={s.name} className="flex items-center gap-3">
                    <span className="text-body-sm font-medium text-fg-muted w-36 shrink-0 truncate">
                      {s.name}
                    </span>
                    <div className="flex-1 h-8 bg-bg-subtle rounded overflow-hidden relative">
                      <div
                        className="absolute left-0 top-0 h-full bg-accent/15 flex items-center px-3 transition-all duration-500"
                        style={{ width: `${(s.count / maxSchool) * 100}%` }}
                      >
                        <span className="text-body-sm font-bold text-accent">
                          {s.count}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {widgets["recent-activity"] && (
          <div className="col-span-12 card p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-headline-md text-fg">Recent Activity</h2>
              <a
                href="#"
                className="text-accent font-bold text-body-md hover:underline"
              >
                View All
              </a>
            </div>
            <div className="divide-y divide-border">
              {[
                {
                  icon: Repeat,
                  bg: "bg-accent/10",
                  ico: "text-accent",
                  text: (
                    <>
                      Jenny Aw moved to{" "}
                      <strong className="text-accent">Interview stage</strong>
                    </>
                  ),
                  sub: "University (Summer 2026) · 2 hours ago",
                },
                {
                  icon: UserPlus,
                  bg: "bg-success-bg",
                  ico: "text-success",
                  text: (
                    <>
                      New application from{" "}
                      <strong className="text-accent">Marcus Tan</strong>
                    </>
                  ),
                  sub: "University (Summer 2026) · 5 hours ago",
                },
                {
                  icon: Mail,
                  bg: "bg-accent/10",
                  ico: "text-accent",
                  text: (
                    <>
                      Offer sent to{" "}
                      <strong className="text-accent">Daniel Lee</strong>
                    </>
                  ),
                  sub: "University (Summer 2026) · Yesterday",
                },
                {
                  icon: MessageSquare,
                  bg: "bg-warning-bg",
                  ico: "text-warning",
                  text: (
                    <>
                      Interview feedback submitted for{" "}
                      <strong className="text-accent">Alicia Tan</strong>
                    </>
                  ),
                  sub: "University (Summer 2026) · Yesterday",
                },
                {
                  icon: Inbox,
                  bg: "bg-success-bg",
                  ico: "text-success",
                  text: (
                    <>
                      <strong className="text-accent">
                        3 new applications
                      </strong>{" "}
                      received
                    </>
                  ),
                  sub: "Polytechnic (Summer 2026) · 2 days ago",
                },
              ].map((a, i) => (
                <div key={i} className="flex items-center gap-3 py-3">
                  <div
                    className={`w-7 h-7 ${a.bg} rounded-full flex items-center justify-center shrink-0`}
                  >
                    <a.icon size={14} className={a.ico} />
                  </div>
                  <div className="flex-1">
                    <p className="text-body-md text-fg">{a.text}</p>
                    <p className="text-body-sm text-fg-muted mt-0.5">{a.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Customize overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-fg/30 z-[60]"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Customize drawer */}
      <div
        className={`fixed right-0 top-0 h-full w-[360px] bg-surface border-l border-border z-[70] flex flex-col shadow-2xl transition-transform duration-300 ${drawerOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex justify-between items-center px-6 py-5 border-b border-border shrink-0">
          <div>
            <h2 className="text-headline-md text-fg">Customize Dashboard</h2>
            <p className="text-body-sm text-fg-muted mt-0.5">
              Personalise your view
            </p>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            className="p-2 rounded-full hover:bg-bg-subtle transition-colors text-fg-muted"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col items-center text-center gap-5">
          <div className="w-14 h-14 rounded-full bg-bg-subtle flex items-center justify-center">
            <Settings size={22} className="text-fg-subtle" />
          </div>
          <div>
            <p className="text-headline-sm text-fg font-semibold">
              Coming Soon
            </p>
            <p className="text-body-sm text-fg-muted mt-1.5 max-w-[260px]">
              Widget customisation is being planned. Check back soon.
            </p>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-border shrink-0">
          <button
            onClick={() => setDrawerOpen(false)}
            className="w-full btn-outline justify-center"
          >
            Close
          </button>
        </div>
      </div>
    </Shell>
  );
}
