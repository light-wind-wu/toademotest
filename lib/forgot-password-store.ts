/* Forgot password flow state persisted in sessionStorage.
   Cleared once the reset flow is completed. */

export const FORGOT_PASSWORD_STATE_KEY = 'dsta_forgot_state';

export interface ForgotPasswordState {
  email: string;
}

const DEFAULT_STATE: ForgotPasswordState = {
  email: '',
};

export function loadForgotPasswordState(): ForgotPasswordState {
  if (typeof window === 'undefined') return { ...DEFAULT_STATE };
  try {
    const raw = sessionStorage.getItem(FORGOT_PASSWORD_STATE_KEY);
    return raw ? { ...DEFAULT_STATE, ...JSON.parse(raw) } : { ...DEFAULT_STATE };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function saveForgotPasswordState(state: Partial<ForgotPasswordState>) {
  const next = { ...loadForgotPasswordState(), ...state };
  try {
    sessionStorage.setItem(FORGOT_PASSWORD_STATE_KEY, JSON.stringify(next));
  } catch {
    /* noop */
  }
}

export function clearForgotPasswordState() {
  try {
    sessionStorage.removeItem(FORGOT_PASSWORD_STATE_KEY);
  } catch {
    /* noop */
  }
}
