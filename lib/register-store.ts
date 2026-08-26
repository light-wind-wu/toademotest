/* Temporary email registration state persisted in sessionStorage.
   Cleared once the account is created. */

import type { MyinfoProfile } from './myinfo';

export const REGISTER_STATE_KEY = 'dsta_register_state';

export interface RegisterState {
  email: string;
  password: string;
  personal?: Partial<MyinfoProfile>;
}

const DEFAULT_STATE: RegisterState = {
  email: '',
  password: '',
  personal: {},
};

export function loadRegisterState(): RegisterState {
  if (typeof window === 'undefined') return { ...DEFAULT_STATE };
  try {
    const raw = sessionStorage.getItem(REGISTER_STATE_KEY);
    return raw ? { ...DEFAULT_STATE, ...JSON.parse(raw) } : { ...DEFAULT_STATE };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function saveRegisterState(state: Partial<RegisterState>) {
  const next = { ...loadRegisterState(), ...state };
  try {
    sessionStorage.setItem(REGISTER_STATE_KEY, JSON.stringify(next));
  } catch {
    /* noop */
  }
}

export function clearRegisterState() {
  try {
    sessionStorage.removeItem(REGISTER_STATE_KEY);
  } catch {
    /* noop */
  }
}
