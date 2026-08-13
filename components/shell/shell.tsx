'use client';

import {
  Bell,
  ChevronDown,
  LogOut,
  Menu as MenuIcon,
  Search,
  UserCog,
} from "lucide-react";
import {
  Children,
  isValidElement,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Input } from "@/components/ui/input";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

import { ROLE_LABELS, type Actor } from "@/lib/data-layer";

import { ThemeToggle } from "@/components/theme-toggle";

import { NAV, visibleNav, type NavSection } from "./nav-config";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Shell — the application chrome: a full-width sticky header, a sticky,
 *  role-aware side-nav beneath it, and a main content slot.
 * ─────────────────────────────────────────────────────────────────────────────
 *  RBAC lives in the nav model ({@link NavSection}); the Shell just renders the
 *  items the actor may see via `visibleNav(actor)`. Adding roles or pages is a
 *  data change in `nav-config.ts`, not a change here.
 *
 *  Composed entirely from PRIZM primitives + tokens, so it themes across every
 *  zone/mode without edits. App-authored (not a PRIZM template — Enterprise has
 *  none yet), so it lives in `app/components/`.
 */

/**
 * Single source of truth for the header height. Exposed as a CSS variable on the
 * root so the header sizes to it and the sticky sidebar offsets/sizes against it
 * — change it here and all three stay in sync. (A JS-interpolated Tailwind class
 * wouldn't survive the JIT scan; a CSS var referenced by static `*-[var(--…)]`
 * classes does.)
 */
const HEADER_HEIGHT = "4rem";
const headerStyle = { "--shell-header-h": HEADER_HEIGHT } as CSSProperties;

export interface ShellUser {
  /** Display name, e.g. "Davina Tan". */
  name: string;
  /** Optional email shown in the user menu. */
  email?: string;
}

export interface ShellProps {
  /** The signed-in actor — drives which nav items are visible (RBAC). */
  actor: Actor;
  /** Display identity for the header user menu. */
  user: ShellUser;
  /** Brand wordmark in the header. */
  appName?: string;
  /** Page title shown at the top of the main content. */
  title?: string;
  /** Workstream label in the sidebar switcher (e.g. "Internship"). */
  workstream?: string;
  /** Nav model. Defaults to the project {@link NAV}; pass your own to reshape it. */
  nav?: NavSection[];
  /** Actions aligned opposite the page title (e.g. a Create button). */
  actions?: ReactNode;
  /**
   * Main content. A single {@link ShellFooter} (`<Shell.Footer>`) among the
   * children is lifted out and pinned to the bottom of the viewport as a sticky
   * action bar; everything else renders in the scrolling content area.
   */
  children: ReactNode;
}

/**
 * Marker for the sticky bottom action bar. Rendered nowhere on its own — the
 * {@link Shell} finds it among its children and wraps its content in the pinned
 * footer region, so pages get a consistent bottom bar without re-implementing
 * the sticky/full-height layout each time.
 *
 * @example
 *   <Shell …>
 *     …page content…
 *     <Shell.Footer>
 *       <span>1 request · 1 slot</span>
 *       <Button>Review</Button>
 *     </Shell.Footer>
 *   </Shell>
 */
function ShellFooter({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

/** Up-to-two-letter initials for the avatar fallback. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

/** Logo + app wordmark, linking home. */
function Brand({ appName }: { appName: string }) {
  return (
    <Link
      href="/"
      className="flex items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      {/* Repo-local asset — air-gap clean. */}
      <img src="/images/dsta-logo.svg" alt="DSTA" className="h-9 w-auto shrink-0" />
      <span className="hidden truncate text-lg font-semibold text-accent sm:block">
        {appName}
      </span>
    </Link>
  );
}

/**
 * Workstream switcher at the top of the sidebar. A single workstream today; the
 * menu is the seam for adding more without touching the Shell.
 */
function WorkstreamSwitcher({ workstream }: { workstream: string }) {
  return (
    <Menu>
      <MenuTrigger className="flex w-full items-center justify-between gap-1 rounded-md border border-border bg-bg px-2 py-1.5 text-left outline-none transition-colors hover:bg-bg-muted focus-visible:ring-2 focus-visible:ring-accent">
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-fg-subtle">
            Workstream
          </span>
          <span className="truncate text-xs font-medium text-fg">{workstream}</span>
        </span>
        <ChevronDown className="size-3.5 shrink-0 text-fg-muted" />
      </MenuTrigger>
      <MenuContent className="w-56">
        <MenuItem className="font-medium">{workstream}</MenuItem>
      </MenuContent>
    </Menu>
  );
}

/**
 * The nav list. Two layouts for two surfaces:
 *  - `rail` — stacked icon-over-label, centred, for the thin desktop sidebar.
 *  - `row`  — horizontal icon + label, for the wider mobile drawer.
 */
function SidebarNav({
  sections,
  layout = "rail",
  onNavigate,
}: {
  sections: NavSection[];
  layout?: "rail" | "row";
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const isRail = layout === "rail";
  return (
    <nav className={cn("flex flex-col", isRail ? "gap-1" : "gap-6")}>
      {sections.map((section, index) => (
        <div
          key={section.label ?? `section-${index}`}
          role="group"
          // In the rail the heading is dropped for space, so name the group here
          // to keep the grouping legible to assistive tech on both layouts.
          aria-label={section.label || undefined}
          className="flex flex-col gap-1"
        >
          {section.label && !isRail ? (
            <Text
              as="span"
              size="xs"
              variant="subtle"
              weight="semibold"
              className="px-3 pb-1 uppercase tracking-wide"
            >
              {section.label}
            </Text>
          ) : null}
          {/* In the rail there's no room for a heading — separate the group instead. */}
          {section.label && isRail && index > 0 ? (
            <div className="mx-2 my-1 h-px bg-border" />
          ) : null}
          {section.items.map((item) => {
            const isActive = item.end ? pathname === item.to : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                href={item.to}
                onClick={onNavigate}
                title={isRail ? item.label : undefined}
                className={cn(
                  "group relative rounded-md transition-colors",
                  isRail
                    ? "flex flex-col items-center gap-1 px-1 py-2.5 text-center text-[11px] leading-tight"
                    : "flex items-center gap-3 px-3 py-2 text-sm",
                  isActive
                    ? "bg-accent/10 font-medium text-accent"
                    : "text-fg-muted hover:bg-bg-muted hover:text-fg",
                )}
              >
                <span className="relative shrink-0">
                  <item.icon className="size-5" />
                  {typeof item.badge === "number" && isRail ? (
                    <Badge
                      variant="solid"
                      className="absolute -right-2.5 -top-1.5 h-4 min-w-4 justify-center rounded-full px-1 text-[10px] leading-none"
                    >
                      {item.badge}
                    </Badge>
                  ) : null}
                </span>
                <span className={isRail ? "w-full break-words" : "flex-1 truncate"}>
                  {item.label}
                </span>
                {typeof item.badge === "number" && !isRail ? (
                  <Badge variant="solid" className="px-1.5 py-0 text-[10px] leading-5">
                    {item.badge}
                  </Badge>
                ) : null}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

/** Avatar + name + role, opening a menu with identity actions. */
function UserMenu({ actor, user }: { actor: Actor; user: ShellUser }) {
  return (
    <Menu>
      <MenuTrigger className="flex items-center gap-2 rounded-md px-1.5 py-1 text-left outline-none transition-colors hover:bg-bg-muted focus-visible:ring-2 focus-visible:ring-accent">
        <span className="hidden flex-col items-end leading-tight sm:flex">
          <span className="text-sm font-medium text-fg">{user.name}</span>
          <span className="text-xs text-fg-muted">{ROLE_LABELS[actor.role]}</span>
        </span>
        <Avatar size="md">
          <AvatarFallback>{initials(user.name)}</AvatarFallback>
        </Avatar>
        <ChevronDown className="hidden size-4 text-fg-muted sm:block" />
      </MenuTrigger>
      <MenuContent className="w-56">
        <div className="px-2 py-1.5">
          <p className="truncate text-sm font-medium text-fg">{user.name}</p>
          <p className="truncate text-xs text-fg-muted">
            {user.email ?? ROLE_LABELS[actor.role]}
          </p>
        </div>
        <MenuSeparator />
        <MenuItem render={<Link href="/admin?area=users" />}>
          <UserCog className="size-4" />
          Switch identity
        </MenuItem>
        <MenuItem
          onClick={() => { /* no-op sign out */ }}
          className="w-full text-danger data-[highlighted]:text-danger"
        >
          <LogOut className="size-4" />
          Sign out
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}

export function Shell({
  actor,
  user,
  appName = "Talent Outreach & Acquisition",
  title,
  workstream = "Internship",
  nav = NAV,
  actions,
  children,
}: ShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const sections = visibleNav(actor, nav);

  // Lift a `<Shell.Footer>` out of the children so it can be pinned to the
  // bottom of the content column; the rest flows in the scrolling area.
  const childArray = Children.toArray(children);
  const isFooter = (node: ReactNode) =>
    isValidElement(node) && node.type === ShellFooter;
  const footer = childArray.find(isFooter);
  const content = childArray.filter((node) => !isFooter(node));

  return (
    <div className="flex min-h-screen flex-col bg-bg text-fg" style={headerStyle}>
      {/* Full-width sticky header. */}
      <header className="sticky top-0 z-40 flex h-[var(--shell-header-h)] items-center gap-3 border-b border-border bg-surface px-4 sm:px-6">
        {/* Mobile nav trigger + drawer. */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger
            aria-label="Open navigation"
            className="inline-grid size-9 place-items-center rounded-md text-fg-muted outline-none hover:bg-bg-muted focus-visible:ring-2 focus-visible:ring-accent lg:hidden"
          >
            <MenuIcon className="size-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            {/* Names the dialog for assistive tech; not shown visually. */}
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <div className="border-b border-border px-4 py-4">
              <WorkstreamSwitcher workstream={workstream} />
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-4">
              <SidebarNav
                sections={sections}
                layout="row"
                onNavigate={() => setMobileOpen(false)}
              />
            </div>
          </SheetContent>
        </Sheet>

        <Brand appName={appName} />

        <div className="ml-auto flex items-center gap-1.5">
          <div className="relative hidden w-56 md:block lg:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
            <Input
              type="search"
              aria-label="Search candidates by keyword, ID or profile information"
              placeholder="Search candidates…"
              className="pl-9"
            />
          </div>

          <Button variant="ghost" size="icon" aria-label="Notifications">
            <Bell className="size-5" />
          </Button>

          <ThemeToggle />

          <UserMenu actor={actor} user={user} />
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sticky sidebar — desktop and up, offset beneath the header. */}
        <aside className="sticky top-[var(--shell-header-h)] hidden h-[calc(100vh-var(--shell-header-h))] w-28 shrink-0 flex-col border-r border-border bg-surface lg:flex">
          <div className="border-b border-border px-2 py-3">
            <WorkstreamSwitcher workstream={workstream} />
          </div>
          <div className="flex-1 overflow-y-auto px-2 py-3">
            <SidebarNav sections={sections} layout="rail" />
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          {/* Scrolling content area — grows to fill the column so a short page
              still pushes the footer to the bottom of the viewport. */}
          <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            {title || actions ? (
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                {title ? (
                  <Heading as="h1" size="3xl">
                    {title}
                  </Heading>
                ) : (
                  <span />
                )}
                {actions ? (
                  <div className="flex items-center gap-2">{actions}</div>
                ) : null}
              </div>
            ) : null}
            {content}
          </div>

          {/* Sticky action bar — pinned to the bottom of the content column,
              staying in view as the content area scrolls. */}
          {footer ? (
            <div className="sticky bottom-0 z-30 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
              {footer}
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}

/** Sticky bottom action bar. Place a single `<Shell.Footer>` inside `<Shell>`. */
Shell.Footer = ShellFooter;
