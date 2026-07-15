import { createStore } from "zustand/vanilla";

/**
 * The shape of the data a multi-step form collects. Kept deliberately open —
 * each consumer decides its own field keys, so the form stays reusable across
 * different step sets.
 */
export type FormValues = Record<string, unknown>;

export interface FormState {
  /** All values gathered so far, keyed by field name. */
  values: FormValues;
  /** Set a single field. */
  setValue: (key: string, value: unknown) => void;
  /** Merge several fields at once. */
  setValues: (values: FormValues) => void;
  /** Reset back to the supplied initial values. */
  reset: (initial?: FormValues) => void;
}

/**
 * Builds a fresh store instance. We create one per `<MultiStepForm>` (via the
 * context provider) rather than a single global store, so two forms on the same
 * page — or the same form reused — never clobber each other's values.
 */
export function createFormStore(initial: FormValues = {}) {
  return createStore<FormState>((set) => ({
    values: initial,
    setValue: (key, value) =>
      set((state) => ({ values: { ...state.values, [key]: value } })),
    setValues: (values) =>
      set((state) => ({ values: { ...state.values, ...values } })),
    reset: (resetTo = {}) => set({ values: resetTo }),
  }));
}

export type FormStore = ReturnType<typeof createFormStore>;
