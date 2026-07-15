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

import { SummaryRow } from "./summary-row";

const attendeeSchema = z.object({
  fullName: z.string().trim().min(1, "Please enter your name."),
  email: z.email("Please enter a valid email address."),
});

const sessionSchema = z.object({
  track: z.string().min(1, "Please choose a track."),
  attendance: z.string().min(1, "Please choose how you'll attend."),
});

const reviewSchema = z.object({
  agree: z.literal(true, "Please agree to the code of conduct."),
});

function AttendeeStep() {
  const [fullName, setFullName] = useFormField<string>("fullName");
  const [email, setEmail] = useFormField<string>("email");

  return (
    <div className="space-y-4">
      <Field>
        <FieldLabel>Full name</FieldLabel>
        <Input
          value={fullName ?? ""}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Grace Hopper"
        />
        <FieldError name="fullName" />
      </Field>
      <Field>
        <FieldLabel>Email address</FieldLabel>
        <Input
          type="email"
          value={email ?? ""}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
        <FieldDescription>Your ticket and joining details go here.</FieldDescription>
        <FieldError name="email" />
      </Field>
    </div>
  );
}

function SessionStep() {
  const [track, setTrack] = useFormField<string>("track");
  const [attendance, setAttendance] = useFormField<string>("attendance");

  return (
    <div className="space-y-5">
      <Field>
        <FieldLabel>Conference track</FieldLabel>
        <Select value={track ?? ""} onValueChange={(v) => setTrack(v as string)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choose a track" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="platform">Platform engineering</SelectItem>
            <SelectItem value="design">Design systems</SelectItem>
            <SelectItem value="ai">Applied AI</SelectItem>
            <SelectItem value="leadership">Leadership</SelectItem>
          </SelectContent>
        </Select>
        <FieldError name="track" />
      </Field>

      <div className="space-y-2">
        <Label>How will you attend?</Label>
        <RadioGroup value={attendance ?? ""} onValueChange={(v) => setAttendance(v as string)}>
          {[
            ["in-person", "In person"],
            ["virtual", "Virtual"],
          ].map(([value, label]) => (
            <div key={value} className="flex items-center gap-2">
              <RadioGroupItem id={`att-${value}`} value={value} />
              <Label htmlFor={`att-${value}`}>{label}</Label>
            </div>
          ))}
        </RadioGroup>
        <FieldError name="attendance" />
        <Text size="xs" variant="muted">
          Picking “In person” adds a logistics step — a later step that only exists for some answers.
        </Text>
      </div>
    </div>
  );
}

function LogisticsStep() {
  const [dietary, setDietary] = useFormField<string>("dietary");
  const [parking, setParking] = useFormField<boolean>("parking");

  return (
    <div className="space-y-5">
      <Field>
        <FieldLabel>Dietary requirements</FieldLabel>
        <Textarea
          rows={3}
          value={dietary ?? ""}
          onChange={(e) => setDietary(e.target.value)}
          placeholder="Optional — allergies or preferences for catering."
        />
      </Field>
      <div className="flex items-center gap-2">
        <Checkbox
          id="parking"
          checked={Boolean(parking)}
          onCheckedChange={(checked) => setParking(checked)}
        />
        <Label htmlFor="parking">I&apos;ll need an on-site parking space</Label>
      </div>
    </div>
  );
}

const TRACK_LABELS: Record<string, string> = {
  platform: "Platform engineering",
  design: "Design systems",
  ai: "Applied AI",
  leadership: "Leadership",
};

function ReviewStep() {
  const values = useFormData((v) => v);
  const [agree, setAgree] = useFormField<boolean>("agree");
  const inPerson = values.attendance === "in-person";

  return (
    <div className="space-y-4">
      <Text size="sm" variant="muted">
        Confirm your registration details.
      </Text>
      <dl className="divide-y divide-border rounded-md border border-border">
        <SummaryRow label="Name" value={String(values.fullName ?? "")} />
        <SummaryRow label="Email" value={String(values.email ?? "")} />
        <SummaryRow label="Track" value={TRACK_LABELS[String(values.track ?? "")] ?? ""} />
        <SummaryRow label="Attendance" value={String(values.attendance ?? "")} />
        {inPerson ? (
          <>
            <SummaryRow label="Dietary" value={String(values.dietary ?? "")} />
            <SummaryRow label="Parking" value={values.parking ? "Yes" : "No"} />
          </>
        ) : null}
      </dl>
      <div className="flex items-center gap-2">
        <Checkbox
          id="agree"
          checked={Boolean(agree)}
          onCheckedChange={(checked) => setAgree(checked)}
        />
        <Label htmlFor="agree">I agree to the event code of conduct.</Label>
      </div>
      <FieldError name="agree" />
    </div>
  );
}

/**
 * An event sign-up flow. Showcases a conditional `when` step (the logistics step
 * only appears for in-person attendees), a `Select` plus `RadioGroup` in one
 * step, and a review that reflects the branch taken.
 */
export function EventRegistrationExample() {
  const [formKey, setFormKey] = useState(0);

  async function handleComplete(values: FormValues) {
    await new Promise((resolve) => setTimeout(resolve, 900));
    // eslint-disable-next-line no-console
    console.log("Submitted event registration:", values);
    toast.add({
      title: "You're registered",
      description: "A confirmation email is on its way.",
      type: "success",
    });
    setTimeout(() => setFormKey((k) => k + 1), 1200);
  }

  return (
    <MultiStepForm
      key={formKey}
      title="Register for the conference"
      description="Tell us how you'd like to join."
      submitLabel="Register"
      allowStepNavigation
      initialValues={{
        fullName: "",
        email: "",
        track: "",
        attendance: "",
        dietary: "",
        parking: false,
        agree: false,
      }}
      onComplete={handleComplete}
    >
      <MultiStepForm.Step
        id="attendee"
        title="Attendee"
        description="Your details"
        schema={attendeeSchema}
      >
        <AttendeeStep />
      </MultiStepForm.Step>

      <MultiStepForm.Step
        id="session"
        title="Sessions"
        description="What you'll join"
        schema={sessionSchema}
      >
        <SessionStep />
      </MultiStepForm.Step>

      {/* Only shown to in-person attendees. */}
      <MultiStepForm.Step
        id="logistics"
        title="Logistics"
        description="On the day"
        when={(v) => v.attendance === "in-person"}
      >
        <LogisticsStep />
      </MultiStepForm.Step>

      <MultiStepForm.Step
        id="review"
        title="Review"
        description="Confirm"
        schema={reviewSchema}
      >
        <ReviewStep />
      </MultiStepForm.Step>
    </MultiStepForm>
  );
}
