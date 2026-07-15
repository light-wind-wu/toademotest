import { useState } from "react";
import { z } from "zod";

import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";

import {
  FieldError,
  MultiStepForm,
  useFormData,
  useFormField,
  type FormValues,
} from "@/components/multi-step-form";

import { str, SummaryRow } from "./summary-row";

/* -------------------------------------------------------------------- Schemas

   Validation is declarative: one zod schema per step, describing the fields that
   step owns. The form runs it on "Next"/"Send" and maps failures to per-field
   messages — no imperative logic living in JSX props. */

const accountSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name."),
  email: z.email("Please enter a valid email address."),
});

const businessSchema = z.object({
  company: z.string().trim().min(1, "Please enter a company name."),
});

const preferencesSchema = z.object({
  role: z.string().min(1, "Please choose a role."),
});

const reviewSchema = z.object({
  confirm: z.literal(true, "Please confirm the details are correct."),
});

/* ------------------------------------------------------------------ Step bodies

   Each step body is an ordinary component. It reaches shared form state through
   hooks — no props are passed down, so there's no drilling, and any step can
   read any other step's answers. */

function AccountStep() {
  const [name, setName] = useFormField<string>("name");
  const [email, setEmail] = useFormField<string>("email");
  const [accountType, setAccountType] = useFormField<string>("accountType");

  return (
    <div className="space-y-4">
      <Field>
        <FieldLabel>Full name</FieldLabel>
        <Input
          value={name ?? ""}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ada Lovelace"
        />
        <FieldError name="name" />
      </Field>
      <Field>
        <FieldLabel>Email address</FieldLabel>
        <Input
          type="email"
          value={email ?? ""}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
        <FieldDescription>We&apos;ll only use this to contact you.</FieldDescription>
        <FieldError name="email" />
      </Field>
      <div className="space-y-2">
        <Label>Account type</Label>
        <RadioGroup value={accountType ?? "personal"} onValueChange={(v) => setAccountType(v as string)}>
          {[
            ["personal", "Personal"],
            ["business", "Business"],
          ].map(([value, label]) => (
            <div key={value} className="flex items-center gap-2">
              <RadioGroupItem id={`type-${value}`} value={value} />
              <Label htmlFor={`type-${value}`}>{label}</Label>
            </div>
          ))}
        </RadioGroup>
        <Text size="xs" variant="muted">
          Choosing “Business” adds a step and changes the review — that&apos;s a step-1 answer
          driving steps further along.
        </Text>
      </div>
    </div>
  );
}

function BusinessStep() {
  const [company, setCompany] = useFormField<string>("company");
  const [vat, setVat] = useFormField<string>("vat");

  return (
    <div className="space-y-4">
      <Field>
        <FieldLabel>Company name</FieldLabel>
        <Input
          value={company ?? ""}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="Analytical Engines Ltd"
        />
        <FieldError name="company" />
      </Field>
      <Field>
        <FieldLabel>VAT number</FieldLabel>
        <Input
          value={vat ?? ""}
          onChange={(e) => setVat(e.target.value)}
          placeholder="GB123456789"
        />
        <FieldDescription>Optional — leave blank if not registered.</FieldDescription>
      </Field>
    </div>
  );
}

function PreferencesStep() {
  const [role, setRole] = useFormField<string>("role");
  const [newsletter, setNewsletter] = useFormField<boolean>("newsletter");
  const [notes, setNotes] = useFormField<string>("notes");

  return (
    <div className="space-y-5">
      <Field>
        <FieldLabel>Primary role</FieldLabel>
        <Select value={role ?? ""} onValueChange={(v) => setRole(v as string)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="engineer">Engineer</SelectItem>
            <SelectItem value="designer">Designer</SelectItem>
            <SelectItem value="researcher">Researcher</SelectItem>
            <SelectItem value="operator">Operator</SelectItem>
          </SelectContent>
        </Select>
        <FieldError name="role" />
      </Field>

      <div className="flex items-center gap-2">
        <Switch
          id="newsletter"
          checked={Boolean(newsletter)}
          onCheckedChange={(checked) => setNewsletter(checked)}
        />
        <Label htmlFor="newsletter">Subscribe to the newsletter</Label>
      </div>

      <Field>
        <FieldLabel>Anything else?</FieldLabel>
        <Textarea
          rows={3}
          value={notes ?? ""}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes…"
        />
      </Field>
    </div>
  );
}

function ReviewStep() {
  // Reads the whole values bag once for a summary view.
  const values = useFormData((v) => v);
  const [confirm, setConfirm] = useFormField<boolean>("confirm");
  const isBusiness = values.accountType === "business";

  return (
    <div className="space-y-4">
      <Text size="sm" variant="muted">
        Check everything over, then send.
      </Text>
      <dl className="divide-y divide-border rounded-md border border-border">
        <SummaryRow label="Name" value={String(values.name ?? "")} />
        <SummaryRow label="Email" value={String(values.email ?? "")} />
        <SummaryRow label="Account type" value={String(values.accountType ?? "personal")} />
        {/* Step-1 answer changes what the review shows. */}
        {isBusiness ? (
          <>
            <SummaryRow label="Company" value={String(values.company ?? "")} />
            <SummaryRow label="VAT" value={String(values.vat ?? "")} />
          </>
        ) : null}
        <SummaryRow label="Role" value={String(values.role ?? "")} />
        <SummaryRow label="Newsletter" value={values.newsletter ? "Yes" : "No"} />
        <SummaryRow label="Notes" value={String(values.notes ?? "")} />
      </dl>
      <div className="flex items-center gap-2">
        <Checkbox
          id="confirm"
          checked={Boolean(confirm)}
          onCheckedChange={(checked) => setConfirm(checked)}
        />
        <Label htmlFor="confirm">The details above are correct.</Label>
      </div>
      <FieldError name="confirm" />
    </div>
  );
}

/**
 * The original showcase: a four-step onboarding wizard. Demonstrates declarative
 * per-step zod schemas, a conditionally-included step (`when`), cross-step reads
 * in the review, and step-indicator navigation.
 */
export function AccountOnboardingExample() {
  // Bump to mount a fresh form (and a fresh store) after a submission.
  const [formKey, setFormKey] = useState(0);

  async function handleComplete(values: FormValues) {
    // No backend here — simulate sending and surface the payload. Replace with a
    // real fetch / React Router action when you wire it up.
    await new Promise((resolve) => setTimeout(resolve, 900));
    // eslint-disable-next-line no-console
    console.log("Submitted account onboarding:", values);
    toast.add({
      title: "Form sent",
      description: `Thanks, ${str(values.name) || "there"} — your details were submitted.`,
      type: "success",
    });
    setTimeout(() => setFormKey((k) => k + 1), 1200);
  }

  return (
    <MultiStepForm
      key={formKey}
      title="Create your profile"
      description="A few quick steps."
      submitLabel="Send"
      allowStepNavigation
      initialValues={{
        name: "",
        email: "",
        accountType: "personal",
        company: "",
        vat: "",
        role: "",
        notes: "",
        newsletter: false,
        confirm: false,
      }}
      onComplete={handleComplete}
    >
      <MultiStepForm.Step
        id="account"
        title="Account"
        description="Who you are"
        schema={accountSchema}
      >
        <AccountStep />
      </MultiStepForm.Step>

      {/* Conditionally included — driven by the step-1 account type. */}
      <MultiStepForm.Step
        id="business"
        title="Business"
        description="Company details"
        when={(v) => v.accountType === "business"}
        schema={businessSchema}
      >
        <BusinessStep />
      </MultiStepForm.Step>

      <MultiStepForm.Step
        id="preferences"
        title="Preferences"
        description="How you work"
        schema={preferencesSchema}
      >
        <PreferencesStep />
      </MultiStepForm.Step>

      <MultiStepForm.Step
        id="review"
        title="Review"
        description="Send it off"
        schema={reviewSchema}
      >
        <ReviewStep />
      </MultiStepForm.Step>
    </MultiStepForm>
  );
}
