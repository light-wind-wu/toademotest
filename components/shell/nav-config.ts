import {
  BarChart3,
  BookOpen,
  ClipboardList,
  Folder,
  FolderCheck,
  GitPullRequestArrow,
  GraduationCap,
  LayoutDashboard,
  Settings,
  type LucideIcon,
} from "lucide-react";

import { can, ROLES, type Action, type Actor, type Role } from "@/lib/data-layer";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  The side-nav model — a data-driven, RBAC-aware registry.
 * ─────────────────────────────────────────────────────────────────────────────
 *  The Shell renders whatever this file declares; it never hard-codes links.
 *  To add a page, add a {@link NavItem} here. To reshape the nav for a different
 *  surface, pass your own `NavSection[]` to <Shell nav={...} />.
 *
 *  RBAC is declared per item, two complementary gates (see {@link NavItem}):
 *   - `requires` — a policy check via `can()`. This reuses the SAME POLICY the
 *     data layer enforces, so a link can never appear for someone the data would
 *     then refuse. Prefer this whenever the page maps to a data resource.
 *   - `roles`    — a plain role allowlist, for nav-only links not tied to a
 *     resource. When both are set, BOTH must pass.
 */

export interface NavItem {
  /** Destination path (react-router). */
  to: string;
  /** Sidebar label. British English. */
  label: string;
  icon: LucideIcon;
  /** Match the path exactly for the active state — use for index-style routes. */
  end?: boolean;
  /** Optional trailing count pill; wire to live data at the call site. */
  badge?: number;
  /** Policy gate: show only if the actor `can` do `action` on `resource`. */
  requires?: { action: Action; resource: string };
  /** Role gate: show only if the actor's role is listed. */
  roles?: Role[];
}

export interface NavSection {
  /** Optional heading rendered above the group. */
  label?: string;
  items: NavItem[];
}

/**
 * The project's navigation. Badge counts are placeholders — replace with live
 * figures (e.g. from a loader) by passing a tailored `nav` to <Shell />.
 */
export const NAV: NavSection[] = [
  {
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
      {
        to: "/programmes",
        label: "Programmes",
        icon: BookOpen,
        requires: { action: "list", resource: "programmes" },
      },
      {
        // The live, approved project list. AD (P&C) get their own submission-centric
        // surface instead ("My Projects", below), so they're excluded here even
        // though the policy would let them list projects.
        to: "/projects",
        label: "Projects",
        icon: Folder,
        requires: { action: "list", resource: "projects" },
        roles: [ROLES.internshipOfficer, ROLES.ioAdmin, ROLES.director],
      },
      {
        // Shared button, different faces: IO/IO Admin manage the requests they
        // send to Programme Centres; AD (P&C) see the requests their centre has
        // received to fulfil. The route resolves the variant per role.
        to: "/project-requests",
        label: "Project Requests",
        icon: GitPullRequestArrow,
        badge: 3,
        roles: [ROLES.internshipOfficer, ROLES.ioAdmin, ROLES.adPnc],
      },
      {
        // AD (P&C) only: the projects their centre has submitted, with IO review
        // status. Their equivalent of the Projects list above.
        to: "/my-projects",
        label: "My Projects",
        icon: FolderCheck,
        roles: [ROLES.adPnc],
      },
      {
        to: "/applications",
        label: "Applications",
        icon: ClipboardList,
        badge: 11,
        requires: { action: "list", resource: "applications" },
      },
      {
        to: "/internships",
        label: "Internships",
        icon: GraduationCap,
        badge: 4,
        requires: { action: "list", resource: "applications" },
      },
      {
        to: "/analytics",
        label: "Analytics",
        icon: BarChart3,
        roles: [ROLES.ioAdmin, ROLES.director],
      },
    ],
  },
  {
    label: "Administration",
    items: [
      // `update` on `users` is granted to IO Admin only — Director is read/list
      // wide, so gating on `update` correctly keeps Admin hidden from them.
      {
        to: "/admin",
        label: "Admin",
        icon: Settings,
        requires: { action: "update", resource: "users" },
      },
    ],
  },
];

function itemVisible(actor: Actor, item: NavItem): boolean {
  if (item.requires && !can(actor, item.requires.action, item.requires.resource)) {
    return false;
  }
  if (item.roles && !item.roles.includes(actor.role)) {
    return false;
  }
  return true;
}

/**
 * Filter sections down to the items this actor may see, dropping any section
 * left empty. Pure — safe to call on the server (loader) or in the browser.
 */
export function visibleNav(actor: Actor, sections: NavSection[] = NAV): NavSection[] {
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => itemVisible(actor, item)),
    }))
    .filter((section) => section.items.length > 0);
}
