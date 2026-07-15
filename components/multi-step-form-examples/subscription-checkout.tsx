import { useState } from "react";
import { z } from "zod";

import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Text } from "@/components/ui/text";
import { toast } from "@/components/ui/toast";

import {
  FieldError,
  MultiStepForm,
  useFormData,
  useFormField,
  type FormValues,
} from "@/components/multi-step-form";

import { SummaryRow } from "./summary-row";

const PLANS = [
  { id: "free", name: "Free", price: "£0/mo", blurb: "For trying things out." },
  { id: "pro", name: "Pro", price: "£12/mo", blurb: "For individuals shipping daily." },
  { id: "team", name: "Team", price: "£40/mo", blurb: "For small teams, with seats." },
] as const;

const planSchema = z.object({
  plan: z.string().min(1, "Please choose a plan."),
});

// Only reached for paid plans (the step is skipped for "free").
const billingSchema = z.object({
  cardholder: z.string().trim().min(1, "Please enter the cardholder's name."),
  card: z
    .string()
    .trim()
    .regex(/^[0-9 ]{12,19}$/, "Please enter a valid card number."),
});

const reviewSchema = z.object({
  confirm: z.literal(true, "Please confirm to complete checkout."),
});

function PlanStep() {
  const [plan, setPlan] = useFormField<string>("plan");

  return (
    <div className="space-y-3">
      <RadioGroup value={plan ?? ""} onValueChange={(v) => setPlan(v as string)}>
        {PLANS.map((p) => (
          <label
            key={p.id}
            htmlFor={`plan-${p.id}`}
            className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-4 hover:bg-bg-muted"
          >
            <RadioGroupItem id={`plan-${p.id}`} value={p.id} className="mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{p.name}</span>
                <span className="text-sm text-fg-muted">{p.price}</span>
              </div>
              <Text size="xs" variant="muted">
                {p.blurb}
              </Text>
            </div>
          </label>
        ))}
      </RadioGroup>
      <FieldError name="plan" />
      <Text size="xs" variant="muted">
        Pick “Free” and the payment step is skipped entirely.
      </Text>
    </div>
  );
}

function BillingStep() {
  const [cardholder, setCardholder] = useFormField<string>("cardholder");
  const [card, setCard] = useFormField<string>("card");

  return (
    <div className="space-y-4">
      <Field>
        <FieldLabel>Cardholder name</FieldLabel>
        <Input
          value={cardholder ?? ""}
          onChange={(e) => setCardholder(e.target.value)}
          placeholder="Name as printed on the card"
        />
        <FieldError name="cardholder" />
      </Field>
      <Field>
        <FieldLabel>Card number</FieldLabel>
        <Input
          inputMode="numeric"
          value={card ?? ""}
          onChange={(e) => setCard(e.target.value)}
          placeholder="4242 4242 4242 4242"
        />
        <FieldDescription>This is a demo — don&apos;t enter a real card number.</FieldDescription>
        <FieldError name="card" />
      </Field>
    </div>
  );
}

const PLAN_LABELS: Record<string, string> = Object.fromEntries(
  PLANS.map((p) => [p.id, `${p.name} — ${p.price}`]),
);

function maskCard(card: string): string {
  const digits = card.replace(/\s/g, "");
  if (digits.length < 4) return "";
  return `•••• ${digits.slice(-4)}`;
}

function ReviewStep() {
  const values = useFormData((v) => v);
  const [confirm, setConfirm] = useFormField<boolean>("confirm");
  const isPaid = values.plan && values.plan !== "free";

  return (
    <div className="space-y-4">
      <Text size="sm" variant="muted">
        Review your order before completing checkout.
      </Text>
      <dl className="divide-y divide-border rounded-md border border-border">
        <SummaryRow label="Plan" value={PLAN_LABELS[String(values.plan ?? "")] ?? ""} />
        {isPaid ? (
          <>
            <SummaryRow label="Cardholder" value={String(values.cardholder ?? "")} />
            <SummaryRow label="Card" value={maskCard(String(values.card ?? ""))} />
          </>
        ) : (
          <SummaryRow label="Payment" value="None — free plan" />
        )}
      </dl>
      <div className="flex items-center gap-2">
        <Checkbox
          id="confirm-checkout"
          checked={Boolean(confirm)}
          onCheckedChange={(checked) => setConfirm(checked)}
        />
        <Label htmlFor="confirm-checkout">I&apos;d like to start this subscription.</Label>
      </div>
      <FieldError name="confirm" />
    </div>
  );
}

/**
 * A subscription checkout. Demonstrates a richer selection step (cards as radio
 * options), a `when`-gated billing step that's skipped for the free plan, and a
 * review that masks the card number and reflects the chosen branch.
 */
export function SubscriptionCheckoutExample() {
  const [formKey, setFormKey] = useState(0);

  async function handleComplete(values: FormValues) {
    await new Promise((resolve) => setTimeout(resolve, 900));
    // eslint-disable-next-line no-console
    console.log("Submitted subscription checkout:", values);
    toast.add({
      title: "Subscription started",
      description: "Welcome aboard — your plan is now active.",
      type: "success",
    });
    setTimeout(() => setFormKey((k) => k + 1), 1200);
  }

  return (
    <MultiStepForm
      key={formKey}
      title="Choose your plan"
      description="Upgrade any time."
      submitLabel="Complete checkout"
      allowStepNavigation
      initialValues={{ plan: "", cardholder: "", card: "", confirm: false }}
      onComplete={handleComplete}
    >
      <MultiStepForm.Step id="plan" title="Plan" description="Pick a tier" schema={planSchema}>
        <PlanStep />
      </MultiStepForm.Step>

      {/* Paid plans only — free skips straight to review. */}
      <MultiStepForm.Step
        id="billing"
        title="Billing"
        description="Payment details"
        when={(v) => Boolean(v.plan) && v.plan !== "free"}
        schema={billingSchema}
      >
        <BillingStep />
      </MultiStepForm.Step>

      <MultiStepForm.Step
        id="review"
        title="Review"
        description="Confirm order"
        schema={reviewSchema}
      >
        <ReviewStep />
      </MultiStepForm.Step>
    </MultiStepForm>
  );
}
