import { createContext, useCallback, useContext } from "react";
import { useStore } from "zustand";

import type { FormStore, FormValues } from "./store";

/**
 * Two contexts, deliberately separate:
 *  - the Zustand store that holds the collected *values* (selector-driven, so a
 *    change to one field doesn't re-render the others), and
 *  - the *stepper* — navigation state and actions.
 * Step bodies read whichever they need via the hooks below; nothing is drilled.
 */
const FormStoreContext = createContext<FormStore | null>(null);

export interface StepMeta {
  id: string;
  title: string;
  description?: string;
}

export type SubmitStatus = "idle" | "submitting" | "done";

export interface StepperContextValue {
  /** The currently visible steps, in order (after `when` filtering). */
  steps: StepMeta[];
  /** Index of the active step within `steps`. */
  current: number;
  isFirst: boolean;
  isLast: boolean;
  status: SubmitStatus;
  next: () => void;
  back: () => void;
  /** Jump to a visited step. */
  goTo: (index: number) => void;
}

const StepperContext = createContext<StepperContextValue | null>(null);

/** Per-field validation messages for the active step, keyed by field name. */
const FieldErrorsContext = createContext<Record<string, string>>({});

/** Internal: the providers the form mounts. Consumers use the hooks. */
export function FormProvider({
  store,
  stepper,
  fieldErrors,
  children,
}: {
  store: FormStore;
  stepper: StepperContextValue;
  fieldErrors: Record<string, string>;
  children: React.ReactNode;
}) {
  return (
    <FormStoreContext.Provider value={store}>
      <StepperContext.Provider value={stepper}>
        <FieldErrorsContext.Provider value={fieldErrors}>{children}</FieldErrorsContext.Provider>
      </StepperContext.Provider>
    </FormStoreContext.Provider>
  );
}

function useStoreApi(): FormStore {
  const store = useContext(FormStoreContext);
  if (store === null) {
    throw new Error("This hook must be used inside a <MultiStepForm>.");
  }
  return store;
}

/**
 * Select a slice of the form values. Keep selectors returning primitives (or
 * stable references) so re-renders stay scoped:
 *   const role = useFormData((v) => v.role);
 */
export function useFormData<T>(selector: (values: FormValues) => T): T {
  const store = useStoreApi();
  return useStore(store, (state) => selector(state.values));
}

/** The two setters. Stable across renders, so reading this never re-renders. */
export function useFormActions() {
  const store = useStoreApi();
  const setValue = useStore(store, (s) => s.setValue);
  const setValues = useStore(store, (s) => s.setValues);
  return { setValue, setValues };
}

/**
 * `useState`-style access to a single field. The star of the API for step
 * bodies — no props, no drilling:
 *   const [name, setName] = useFormField<string>("name");
 */
export function useFormField<T = unknown>(key: string): [T | undefined, (value: T) => void] {
  const value = useFormData((v) => v[key] as T | undefined);
  const { setValue } = useFormActions();
  const set = useCallback((next: T) => setValue(key, next), [setValue, key]);
  return [value, set];
}

/** Navigation state and actions for the active form. */
export function useStepper(): StepperContextValue {
  const ctx = useContext(StepperContext);
  if (ctx === null) {
    throw new Error("useStepper must be used inside a <MultiStepForm>.");
  }
  return ctx;
}

/**
 * The current validation message for a field, or `undefined` if it's valid.
 * Populated from the active step's zod `schema` when the user tries to advance.
 */
export function useFieldError(name: string): string | undefined {
  return useContext(FieldErrorsContext)[name];
}
