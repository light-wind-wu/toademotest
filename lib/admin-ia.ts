/* ─────────────────────────────────────────────────────────────────────────────
   Admin Settings IA (TOA-handoff-3 AdminConsole).

   The settings surface is a hub + persistent "settings sub-rail": the handoff's
   12 data.js settings groups reorganised into 6 CATEGORIES → 14 AREAS. Each area
   either renders an in-console PANEL (existing app functionality), navigates to an
   existing ROUTE (e.g. Template Management lives at /templates), or is a SOON
   placeholder (a screen still to be built in a later phase).

   Source: /tmp/toa-handoff-3/toa/project/ia/flows-admin.jsx (ALL_AREAS).
   ──────────────────────────────────────────────────────────────────────────── */
import {
  Users, ShieldCheck, List, Mail, FileText, Bell, Send, ExternalLink,
  ClipboardList, Repeat, Sparkles, LayoutGrid, Calendar, Settings, RotateCcw,
  BookOpen, Wand2,
  type LucideIcon,
} from 'lucide-react';

/** What an area resolves to. */
export type AreaDest =
  | { kind: 'panel'; panel: AdminPanel }   // rendered inside the console
  | { kind: 'route'; route: string }       // navigate to an existing page
  | { kind: 'soon' };                      // placeholder — later phase

/** Built-in panels backed by existing functionality. */
export type AdminPanel =
  | 'users' | 'scoring' | 'automation' | 'reset' | 'sysconfig' | 'dropdowns'
  | 'menu' | 'edm' | 'microsite' | 'forms' | 'formbuilder' | 'placement' | 'calendar' | 'taxonomy' | 'components';

export interface AdminArea {
  id:    string;
  label: string;
  desc:  string;
  meta?: string;       // small count/status chip on the hub card
  icon:  LucideIcon;
  dest:  AreaDest;
}
export interface AdminCategory {
  id:    string;
  label: string;
  note:  string;
  areas: AdminArea[];
}

export const ADMIN_CATEGORIES: AdminCategory[] = [
  { id: 'access', label: 'Access & permissions', note: 'Who uses the portal and what they can see', areas: [
    { id: 'users', label: 'Users',              desc: 'Invite, suspend and remove people; assign roles.', meta: 'Manage accounts', icon: Users,       dest: { kind: 'panel', panel: 'users' } },
    { id: 'roles', label: 'Roles & permissions', desc: 'Each role and what it can access — assigned in the Users table.', meta: '2 roles', icon: ShieldCheck, dest: { kind: 'panel', panel: 'users' } },
    { id: 'menu',  label: 'Menu visibility',     desc: 'Choose which sections each role sees in the nav.',  icon: List,        dest: { kind: 'panel', panel: 'menu' } },
  ] },
  { id: 'comms', label: 'Communications', note: 'Automated messages to applicants and staff', areas: [
    { id: 'email',   label: 'Email templates',        desc: 'System emails sent across the lifecycle.', meta: 'Template Management', icon: Mail,     dest: { kind: 'route', route: '/templates' } },
    { id: 'letters', label: 'Letter templates',       desc: 'Offer letters, welcome letters, certificates.',                        icon: FileText, dest: { kind: 'route', route: '/templates' } },
    { id: 'notifs',  label: 'Notification templates', desc: 'In-app alerts for officers and mentors.',                              icon: Bell,     dest: { kind: 'route', route: '/templates' } },
    { id: 'edm',     label: 'EDM campaigns',          desc: 'Outreach mailers to prospective applicants.',                          icon: Send,     dest: { kind: 'panel', panel: 'edm' } },
  ] },
  { id: 'experience', label: 'Applicant experience', note: 'The public-facing apply journey', areas: [
    { id: 'microsite', label: 'Microsite',         desc: 'The public landing site for the programme.',     icon: ExternalLink,  dest: { kind: 'panel', panel: 'microsite' } },
    { id: 'forms',       label: 'Application forms', desc: 'Build and edit the forms applicants fill in.',          icon: ClipboardList, dest: { kind: 'panel', panel: 'forms' } },
    { id: 'formbuilder', label: 'Form builder',      desc: 'Compose a new application form and preview it live.', meta: 'New', icon: Wand2, dest: { kind: 'panel', panel: 'formbuilder' } },
  ] },
  { id: 'workflow', label: 'Workflow & approvals', note: 'How work routes and when reminders fire', areas: [
    { id: 'automation', label: 'Automation & reminders', desc: 'Triggered emails — rejection, welcome letter, certificate timing.', meta: 'Active', icon: Repeat, dest: { kind: 'panel', panel: 'automation' } },
  ] },
  { id: 'capacity', label: 'Capacity & scheduling', note: 'Slots, placements and the calendar', areas: [
    { id: 'placement', label: 'Placement & slots',        desc: 'Utilisation by programme and category; adjust slots.', icon: LayoutGrid, dest: { kind: 'panel', panel: 'placement' } },
    { id: 'calendar',  label: 'Calendar & officer hours', desc: 'Officer hours and public holidays.',                   icon: Calendar,   dest: { kind: 'panel', panel: 'calendar' } },
  ] },
  { id: 'system', label: 'System', note: 'Low-level configuration', areas: [
    { id: 'scoring',   label: 'Suitability scoring',  desc: 'Reference data the matching engine uses to score applicants.', meta: 'Reference data', icon: Sparkles,  dest: { kind: 'panel', panel: 'scoring' } },
    { id: 'taxonomy',  label: 'Recognised subjects',  desc: 'Add or remove recognised subjects per qualification — used in eligibility criteria.', meta: 'Configurable', icon: BookOpen, dest: { kind: 'panel', panel: 'taxonomy' } },
    { id: 'dropdowns', label: 'Dropdown lists',       desc: 'Managed list values with versioning history.',                icon: List,      dest: { kind: 'panel', panel: 'dropdowns' } },
    { id: 'config',    label: 'System configuration', desc: 'Global parameters and feature switches.',                     icon: Settings,  dest: { kind: 'panel', panel: 'sysconfig' } },
    { id: 'components',     label: 'PRIZM components',      desc: 'A live gallery of every component used in this project.', meta: 'Utility', icon: RotateCcw, dest: { kind: 'panel', panel: 'components' } },
    { id: 'reset',     label: 'Reset demo data',      desc: 'Clear local data and reseed everything from the seed files.', meta: 'Utility', icon: RotateCcw, dest: { kind: 'panel', panel: 'reset' } },
  ] },
];

export const ALL_ADMIN_AREAS: AdminArea[] = ADMIN_CATEGORIES.flatMap(c => c.areas);
export const findAdminArea = (id: string): AdminArea | undefined => ALL_ADMIN_AREAS.find(a => a.id === id);
