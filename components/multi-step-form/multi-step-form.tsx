import {
  Children,
  isValidElement,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { ArrowLeft, ArrowRight, Send } from "lucide-react";
import { useStore } from "zustand";
import type { ZodType } from "zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";

import { FormProvider, type StepperContextValue, type SubmitStatus } from "./context";
import { StepIndicator } from "./step-indicator";
import { createFormStore, type FormStore, type FormValues } from "./store";

export interface StepProps {
  /** Stable identifier, also the indicator key. */
  id: string;
  /** Short label shown in the step indicator. */
  title: string;
  /** Optional sub-label under the indicator title. */
  description?: string;
  /**
   * Declarative validation for this step. A zod schema describing the fields it
   * owns — failures surface as per-field messages (see `<FieldError name>`).
   * Other fields in the store are ignored, so each step validates its own slice.
   */
  schema?: ZodType;
  /**
   * Imperative escape hatch for logic a schema can't express cleanly. Return
   * `true` to allow, or a string to block with a step-level message. Runs after
   * `schema` passes.
   */
  validate?: (values: FormValues) => true | string;
  /**
   * Conditionally include this step. Return `false` and it's skipped entirely —
   * this is how an earlier answer can drop or add a later step.
   */
  when?: (values: FormValues) => boolean;
  children: ReactNode;
}

/**
 * Declares one step. Renders its children only when active (the parent decides),
 * so inactive step bodies never mount and their hooks never run.
 */
export function Step({ children }: StepProps) {
  return <>{children}</>;
}
Step.displayName = "MultiStepForm.Step";

function isStepElement(node: ReactNode): node is ReactElement<StepProps> {
  return isValidElement(node) && node.type === Step;
}

export interface MultiStepFormProps {
  /** `<Step>` children, in order. The last visible one submits. */
  children: ReactNode;
  /** Called with all collected values when the final step is submitted. */
  onComplete: (values: FormValues) => void | Promise<void>;
  /** Seed values for the store. */
  initialValues?: FormValues;
  title?: string;
  description?: string;
  /** Label for the final submit button. */
  submitLabel?: string;
  /** Let users click the indicator to jump back to a visited step. */
  allowStepNavigation?: boolean;
  className?: string;
}

/**
 * A reusable, route-free multi-step form built as a compound component. Steps
 * are JSX children; their bodies reach shared state through hooks
 * (`useFormField`, `useFormData`, `useStepper`) rather than props — so there's
 * no drilling, and any step can read any earlier step's answers.
 *
 * Values live in a per-instance Zustand store; navigation is local state.
 */
export function MultiStepForm({
  children,
  onComplete,
  initialValues,
  title,
  description,
  submitLabel = "Submit",
  allowStepNavigation = false,
  className,
}: MultiStepFormProps) {
  // One store per instance, created once.
  const storeRef = useRef<FormStore | null>(null);
  if (storeRef.current === null) {
    storeRef.current = createFormStore(initialValues);
  }
  const store = storeRef.current!;

  const [current, setCurrent] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<SubmitStatus>("idle");

  function clearErrors() {
    setError(null);
    setFieldErrors({});
  }

  // Subscribe to values so `when` filtering re-evaluates as answers change.
  const values = useStore(store, (s) => s.values);

  const visibleSteps = Children.toArray(children)
    .filter(isStepElement)
    .filter((el) => !el.props.when || el.props.when(values));

  const count = visibleSteps.length;
  // Guard against the visible set shrinking under the cursor.
  const safeCurrent = Math.max(0, Math.min(current, count - 1));
  const activeStep = visibleSteps[safeCurrent];
  const isFirst = safeCurrent === 0;
  const isLast = safeCurrent === count - 1;

  const meta = visibleSteps.map((el) => ({
    id: el.props.id,
    title: el.props.title,
    description: el.props.description,
  }));

  function validateActive(): boolean {
    const values = store.getState().values;
    const { schema, validate } = activeStep?.props ?? {};

    // 1. Declarative: run the zod schema and map issues to field messages.
    if (schema) {
      const result = schema.safeParse(values);
      if (!result.success) {
        const fields: Record<string, string> = {};
        let formLevel: string | null = null;
        for (const issue of result.error.issues) {
          const key = issue.path[0];
          if (typeof key === "string") {
            fields[key] ??= issue.message;
          } else {
            formLevel ??= issue.message;
          }
        }
        setFieldErrors(fields);
        setError(formLevel);
        return false;
      }
    }

    // 2. Imperative escape hatch for anything a schema can't express.
    const custom = validate?.(values);
    if (typeof custom === "string") {
      setFieldErrors({});
      setError(custom);
      return false;
    }

    clearErrors();
    return true;
  }

  function next() {
    if (!validateActive()) return;
    setCurrent((c) => Math.min(c + 1, count - 1));
  }

  function back() {
    clearErrors();
    setCurrent((c) => Math.max(c - 1, 0));
  }

  function goTo(index: number) {
    if (index > safeCurrent) return; // only jump to visited steps
    clearErrors();
    setCurrent(index);
  }

  async function submit() {
    if (!validateActive()) return;
    setStatus("submitting");
    try {
      await onComplete(store.getState().values);
      setStatus("done");
    } catch (err) {
      setStatus("idle");
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  const stepper: StepperContextValue = {
    steps: meta,
    current: safeCurrent,
    isFirst,
    isLast,
    status,
    next,
    back,
    goTo,
  };

  return (
    <FormProvider store={store} stepper={stepper} fieldErrors={fieldErrors}>
      <Card className={className}>
        <CardHeader>
          {title ? <CardTitle>{title}</CardTitle> : null}
          {description ? <CardDescription>{description}</CardDescription> : null}
          <div className="pt-4">
            <StepIndicator
              steps={meta}
              current={safeCurrent}
              onStepClick={allowStepNavigation ? goTo : undefined}
            />
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="py-6">
          {activeStep}
          {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
        </CardContent>

        <Separator />

        <CardFooter className="justify-between">
          <Button variant="outline" onClick={back} disabled={isFirst || status === "submitting"}>
            <ArrowLeft />
            Back
          </Button>

          {isLast ? (
            <Button onClick={submit} disabled={status !== "idle"}>
              {status === "submitting" ? <Spinner size="sm" /> : <Send />}
              {status === "done" ? "Sent" : submitLabel}
            </Button>
          ) : (
            <Button onClick={next}>
              Next
              <ArrowRight />
            </Button>
          )}
        </CardFooter>
      </Card>
    </FormProvider>
  );
}

// Allow `<MultiStepForm.Step>` as well as the named `Step` export.
MultiStepForm.Step = Step;
