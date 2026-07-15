import { useState } from "react";
import { z } from "zod";

import { Field, FieldLabel } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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

const satisfactionSchema = z.object({
  satisfaction: z.string().min(1, "Please pick how things went."),
});

const SATISFACTION_OPTIONS = [
  ["delighted", "Delighted"],
  ["happy", "Happy"],
  ["neutral", "Neutral"],
  ["unhappy", "Unhappy"],
] as const;

function SatisfactionStep() {
  const [satisfaction, setSatisfaction] = useFormField<string>("satisfaction");

  return (
    <div className="space-y-4">
      <Field>
        <FieldLabel>How was your experience?</FieldLabel>
        <RadioGroup
          value={satisfaction ?? ""}
          onValueChange={(v) => setSatisfaction(v as string)}
        >
          {SATISFACTION_OPTIONS.map(([value, label]) => (
            <div key={value} className="flex items-center gap-2">
              <RadioGroupItem id={`sat-${value}`} value={value} />
              <Label htmlFor={`sat-${value}`}>{label}</Label>
            </div>
          ))}
        </RadioGroup>
        <FieldError name="satisfaction" />
      </Field>
    </div>
  );
}

function CommentStep() {
  const [comment, setComment] = useFormField<string>("comment");
  const satisfaction = useFormData((v) => v.satisfaction);
  const mustExplain = satisfaction === "unhappy";

  return (
    <div className="space-y-4">
      <Field>
        <FieldLabel>
          {mustExplain ? "Sorry to hear that — what went wrong?" : "Anything to add?"}
        </FieldLabel>
        <Textarea
          rows={4}
          value={comment ?? ""}
          onChange={(e) => setComment(e.target.value)}
          placeholder={
            mustExplain ? "Tell us what we could do better…" : "Optional — share more if you like."
          }
        />
      </Field>
      <Text size="xs" variant="muted">
        {mustExplain
          ? "A comment is required because you chose “Unhappy” — an imperative validate rule keyed off a previous step's answer."
          : "This step's comment is optional unless the previous answer was “Unhappy”."}
      </Text>
    </div>
  );
}

/**
 * A short two-step survey. Highlights the imperative `validate` escape hatch:
 * the comment is only required when the previous step's satisfaction was
 * "Unhappy" — a rule that depends on another step's answer, which a per-step
 * schema can't express on its own. Step navigation is intentionally off.
 */
export function FeedbackSurveyExample() {
  const [formKey, setFormKey] = useState(0);

  async function handleComplete(values: FormValues) {
    await new Promise((resolve) => setTimeout(resolve, 700));
    // eslint-disable-next-line no-console
    console.log("Submitted feedback:", values);
    toast.add({
      title: "Thanks for the feedback",
      description: "Your response has been recorded.",
      type: "success",
    });
    setTimeout(() => setFormKey((k) => k + 1), 1200);
  }

  return (
    <MultiStepForm
      key={formKey}
      title="Quick feedback"
      description="Two short steps."
      submitLabel="Submit feedback"
      initialValues={{ satisfaction: "", comment: "" }}
      onComplete={handleComplete}
    >
      <MultiStepForm.Step
        id="satisfaction"
        title="Experience"
        description="How it went"
        schema={satisfactionSchema}
      >
        <SatisfactionStep />
      </MultiStepForm.Step>

      <MultiStepForm.Step
        id="comment"
        title="Details"
        description="Tell us more"
        // Imperative escape hatch: require a comment only for unhappy responses.
        validate={(v) =>
          v.satisfaction === "unhappy" && String(v.comment ?? "").trim().length < 10
            ? "Please add at least a sentence so we can follow up."
            : true
        }
      >
        <CommentStep />
      </MultiStepForm.Step>
    </MultiStepForm>
  );
}
