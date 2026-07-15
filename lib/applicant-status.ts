import {
  FileText, XCircle, Calendar, Hourglass,
  CheckCircle2, CalendarSearch, type LucideIcon,
} from 'lucide-react';
import type { ApplicationStatus } from './types';

export interface StatusMeta {
  label:   string;
  color:   string;
  bgColor: string;
  icon:    LucideIcon;
}

const GREY   = { color: 'text-fg-muted', bgColor: 'bg-bg-subtle border-border'        };
const AMBER  = { color: 'text-warning',  bgColor: 'bg-warning-bg border-warning/30'   };
const GREEN  = { color: 'text-success',  bgColor: 'bg-success-bg border-success/30'   };
const RED    = { color: 'text-danger',   bgColor: 'bg-danger-bg border-danger/30'     };

export const APPLICANT_STATUS_META: Record<ApplicationStatus, StatusMeta> = {
  // ── Neutral / in-queue ──────────────────────────────────────────────────
  'Pending Screening':        { ...GREY,  label: 'Application Submitted', icon: FileText      },
  'Pending Review':           { ...GREY,  label: 'Application Submitted', icon: FileText      },
  'Shortlisted for Interview':{ ...GREY,  label: 'Application Submitted', icon: FileText      },
  // Interview invitation handled separately in AppCard via ioApp.interviewSlots

  // ── In progress ─────────────────────────────────────────────────────────
  'Interview Scheduled':      { ...AMBER, label: 'Interview Scheduled',   icon: Calendar      },
  'Interview Completed':      { ...AMBER, label: 'Under Review',           icon: Hourglass     },
  'Date Change Requested':     { ...AMBER, label: 'Date Change Pending',    icon: CalendarSearch},

  // ── Positive ────────────────────────────────────────────────────────────
  'Offer Extended':           { ...GREEN, label: 'Offer Received',         icon: CheckCircle2  },
  'Offer Accepted':           { ...GREEN, label: 'Offer Accepted',         icon: CheckCircle2  },
  'Accepted':                 { ...GREEN, label: 'Accepted',               icon: CheckCircle2  },
  'Active Intern':            { ...GREEN, label: 'Active Intern',          icon: CheckCircle2  },
  'Internship Completed':     { ...GREEN, label: 'Completed',              icon: CheckCircle2  },

  // ── Unsuccessful / terminal ─────────────────────────────────────────────
  'Auto-rejected':            { ...RED,   label: 'Unsuccessful',           icon: XCircle       },
  'Rejected':                 { ...RED,   label: 'Unsuccessful',           icon: XCircle       },
  'Offer Declined':           { ...RED,   label: 'Offer Declined',         icon: XCircle       },
  'Withdrawn':                { ...RED,   label: 'Withdrawn',              icon: XCircle       },
  'Terminated':               { ...RED,   label: 'Terminated',             icon: XCircle       },
};

export const TERMINAL_STATUSES: ApplicationStatus[] = [
  'Auto-rejected', 'Rejected', 'Offer Declined', 'Withdrawn', 'Terminated', 'Internship Completed',
];

export const SUCCESSFUL_STATUSES: ApplicationStatus[] = [
  'Internship Completed', 'Active Intern', 'Offer Accepted',
];
