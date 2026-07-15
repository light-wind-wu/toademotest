'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { UserRole } from './types';

const ROLE_KEY = 'dsta_role';

export interface RoleProfile {
  name:     string;
  initials: string;
  email:    string;
  title:    string;
}

// Persona names align to the official "DSTA TOA Consolidated Personas" set:
//   Internship Officer = Davina · Director (TA&D) = Abbey · Internship Applicant = Jenny ·
//   Scholarship Applicant = Marcus. mentor (Wei Jian Lim) and ad-pnc (Ng Shu Qi) are
//   host-PC / contracts roles outside the persona set. io-admin carries the Davina IO
//   persona; the plain `io` seat is a second officer (Rachel Koh) so it doesn't collide
//   with Marcus. The scholar applicant is Marcus — its email (marcus.tan@dsta.gov.sg) is
//   kept in lock-step with seed applications APP-0028/APP-0029 so their records stay linked.
export const ROLE_PROFILES: Record<UserRole, RoleProfile> = {
  'io-admin':                   { name: 'Davina Tan',    initials: 'DT', email: 'davina.tan@dsta.gov.sg',    title: 'Senior Internship Officer'  },
  'io':                         { name: 'Rachel Koh',    initials: 'RK', email: 'rachel.koh@dsta.gov.sg',     title: 'Internship Officer'         },
  'mentor':                     { name: 'Wei Jian Lim',  initials: 'WJ', email: 'weijian.lim@dsta.gov.sg',    title: 'Project Mentor'             },
  'ad-pnc':                     { name: 'Ng Shu Qi',     initials: 'SQ', email: 'shuqi.ng@dsta.gov.sg',       title: 'AD (Personnel & Contracts)' },
  'director':                   { name: 'Abbey Chua',    initials: 'AC', email: 'abbey.chua@dsta.gov.sg',     title: 'Director, DSTA'             },
  'new-applicant':              { name: 'Jenny Aw',      initials: 'JA', email: 'jenny.aw@u.nus.edu',         title: 'Internship Applicant'       },
  'existing-scholar-applicant': { name: 'Marcus Tan',    initials: 'MT', email: 'marcus.tan@dsta.gov.sg',     title: 'Scholarship Applicant'      },
};

export const ROLE_LABELS: Record<UserRole, string> = {
  'io-admin':                   'IO Admin',
  'io':                         'Internship Officer',
  'mentor':                     'Mentor',
  'ad-pnc':                     'AD (P&C)',
  'director':                   'Director',
  'new-applicant':              'Internship Applicant',
  'existing-scholar-applicant': 'Scholarship Applicant',
};

interface RoleCtx {
  role:      UserRole;
  setRole:   (r: UserRole) => void;
  profile:   RoleProfile;
  roleReady: boolean;
}

const RoleContext = createContext<RoleCtx>({
  role:      'io-admin',
  setRole:   () => {},
  profile:   ROLE_PROFILES['io-admin'],
  roleReady: false,
});

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role,      setRoleState] = useState<UserRole>('io-admin');
  const [roleReady, setRoleReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(ROLE_KEY) as UserRole | null;
      if (saved && saved in ROLE_PROFILES) setRoleState(saved);
    } catch {}
    setRoleReady(true);
  }, []);

  function setRole(r: UserRole) {
    setRoleState(r);
    try { localStorage.setItem(ROLE_KEY, r); } catch {}
  }

  return (
    <RoleContext.Provider value={{ role, setRole, profile: ROLE_PROFILES[role], roleReady }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}
