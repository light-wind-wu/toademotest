'use client';

/* Portal configuration store — the System configuration settings (Admin Settings →
   System) made live. Components read these via useSystemConfig() and re-render when an
   admin saves (a PORTAL_CONFIG_CHANGED event is dispatched). Persisted in localStorage. */
import { useEffect, useState } from 'react';

export const SYS_CONFIG_KEY = 'dsta_system_config';
export const PORTAL_CONFIG_CHANGED = 'dsta_portal_config_changed';

export interface SysConfig {
  aiSummary:     boolean;
  aiMatching:    boolean;
  kineticScroll: boolean;
  roleSwitcher:  boolean;
  dceApproval:   boolean;   // SCI flow: route project batches to the DCE for approval (off = skip)
  categoryFormThumbnails: boolean;  // Programme form: ON = thumbnail gallery of category form previews; OFF = inline Preview link beside each category checkbox
  categoryInput: 'radio' | 'dropdown';  // Programme form: how the single-select Education Level is presented (DEV flag, will settle on one)
  offerValidityDays: number;
  maxProjectRanks:   number;
  interviewMins:     number;
}

export const SYS_DEFAULTS: SysConfig = {
  aiSummary: true, aiMatching: true, kineticScroll: true, roleSwitcher: true,
  dceApproval: false,
  categoryFormThumbnails: false,
  categoryInput: 'radio',
  offerValidityDays: 14, maxProjectRanks: 5, interviewMins: 60,
};

export function loadSystemConfig(): SysConfig {
  if (typeof window === 'undefined') return SYS_DEFAULTS;
  try {
    const raw = localStorage.getItem(SYS_CONFIG_KEY);
    if (!raw) return SYS_DEFAULTS;
    const saved = { ...SYS_DEFAULTS, ...JSON.parse(raw) } as SysConfig;
    return { ...saved, interviewMins: 60 };
  }
  catch { return SYS_DEFAULTS; }
}

/** Map the configured interview minutes to a scheduling-drawer duration option. */
export function interviewDurationLabel(mins: number): string {
  if (mins <= 30) return '30 min';
  if (mins <= 45) return '45 min';
  if (mins <= 60) return '1 hour';
  if (mins <= 90) return '1.5 hours';
  return '2 hours';
}

export function saveSystemConfig(cfg: SysConfig) {
  try { localStorage.setItem(SYS_CONFIG_KEY, JSON.stringify(cfg)); } catch {}
  try { window.dispatchEvent(new Event(PORTAL_CONFIG_CHANGED)); } catch {}
}

/* ── Menu visibility (Admin Settings → Access → Menu visibility) ──────────────
   Which rail sections each role sees, keyed by SECTION ID. Only governs the
   sections the matrix models; anything else (a role's bespoke section, applicant
   sections) is always visible. Dashboard is always on. Defaults mirror getNav so
   the live behaviour is unchanged until an admin actually hides something. */
export const MENU_VIS_KEY = 'dsta_menu_visibility';
export const MENU_SECTIONS = [
  { id: 'dashboard',    label: 'Dashboard' },
  { id: 'programmes',   label: 'Programmes' },
  { id: 'projects',     label: 'Projects' },
  { id: 'requests',     label: 'Project Requests' },
  { id: 'applications', label: 'Applications' },
  { id: 'internships',  label: 'Internships' },
  { id: 'analytics',    label: 'Analytics' },
  { id: 'settings',     label: 'Admin' },
] as const;
const MATRIX_IDS = new Set<string>(MENU_SECTIONS.map(s => s.id));

export const MENU_ROLES = [
  { id: 'io',       label: 'Internship Officer' },
  { id: 'mentor',   label: 'Mentor' },
  { id: 'ad',       label: 'AD (P&C)' },
  { id: 'director', label: 'Director' },
] as const;

export const MENU_DEFAULTS: Record<string, string[]> = {
  io:       ['dashboard', 'programmes', 'projects', 'requests', 'applications', 'internships', 'analytics', 'settings'],
  mentor:   ['dashboard', 'projects', 'applications', 'internships'],
  ad:       ['projects', 'requests'],
  director: ['applications'],
};

/** Map an app role to its menu-visibility matrix row (null = not governed). */
export function matrixRoleFor(role: string): string | null {
  if (role === 'io-admin' || role === 'io') return 'io';
  if (role === 'mentor') return 'mentor';
  if (role === 'ad-pnc') return 'ad';
  if (role === 'director') return 'director';
  return null;
}

export function loadMenuVisibility(): Record<string, string[]> {
  if (typeof window === 'undefined') return MENU_DEFAULTS;
  try { const raw = localStorage.getItem(MENU_VIS_KEY); return raw ? { ...MENU_DEFAULTS, ...JSON.parse(raw) } : MENU_DEFAULTS; }
  catch { return MENU_DEFAULTS; }
}

export function saveMenuVisibility(vis: Record<string, string[]>) {
  try { localStorage.setItem(MENU_VIS_KEY, JSON.stringify(vis)); } catch {}
  try { window.dispatchEvent(new Event(PORTAL_CONFIG_CHANGED)); } catch {}
}

/** Is a section visible in the rail for this role? Non-matrix sections + Dashboard always show. */
export function isSectionVisible(role: string, sectionId: string, vis: Record<string, string[]>): boolean {
  if (sectionId === 'dashboard') return true;
  if (!MATRIX_IDS.has(sectionId)) return true;
  const mr = matrixRoleFor(role);
  if (!mr) return true;
  return (vis[mr] ?? MENU_DEFAULTS[mr] ?? []).includes(sectionId);
}

export function useMenuVisibility(): Record<string, string[]> {
  const [vis, setVis] = useState<Record<string, string[]>>(MENU_DEFAULTS);
  useEffect(() => {
    const read = () => setVis(loadMenuVisibility());
    read();
    window.addEventListener(PORTAL_CONFIG_CHANGED, read);
    window.addEventListener('storage', read);
    return () => { window.removeEventListener(PORTAL_CONFIG_CHANGED, read); window.removeEventListener('storage', read); };
  }, []);
  return vis;
}

/** Live system config — re-reads on save (same tab) and storage (other tabs). */
export function useSystemConfig(): SysConfig {
  const [cfg, setCfg] = useState<SysConfig>(SYS_DEFAULTS);
  useEffect(() => {
    const read = () => setCfg(loadSystemConfig());
    read();
    window.addEventListener(PORTAL_CONFIG_CHANGED, read);
    window.addEventListener('storage', read);
    return () => { window.removeEventListener(PORTAL_CONFIG_CHANGED, read); window.removeEventListener('storage', read); };
  }, []);
  return cfg;
}
