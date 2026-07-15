import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Text } from "@/components/ui/text";
import { ToastProvider } from "@/components/ui/toast";

import {
  AccountOnboardingExample,
  EventRegistrationExample,
  FeedbackSurveyExample,
  SubscriptionCheckoutExample,
} from "@/components/multi-step-form-examples";
import { ThemeToggle } from "@/components/theme-toggle";


/* Each example wraps the same `<MultiStepForm>` compound component differently,
   so the showcase exercises the full surface: declarative schemas, the
   imperative `validate` escape hatch, conditional `when` steps, step-indicator
   navigation, and cross-step reads in a review. */
const EXAMPLES = [
  {
    value: "account",
    label: "Account onboarding",
    summary:
      "Four steps with per-step schemas, a conditionally-included business step, and a review that reflects the chosen branch.",
    Component: AccountOnboardingExample,
  },
  {
    value: "feedback",
    label: "Feedback survey",
    summary:
      "Two steps. Uses the imperative validate escape hatch — a comment is only required when the previous step's answer was “Unhappy”.",
    Component: FeedbackSurveyExample,
  },
  {
    value: "event",
    label: "Event registration",
    summary:
      "A sign-up flow where an in-person answer adds a later logistics step. Combines a Select and a RadioGroup in one step.",
    Component: EventRegistrationExample,
  },
  {
    value: "checkout",
    label: "Subscription checkout",
    summary:
      "Plan selection as radio cards, a billing step skipped for the free plan, and a review that masks the card number.",
    Component: SubscriptionCheckoutExample,
  },
] as const;

export default function MultiStepFormPlayground() {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-bg text-fg">
        <header className="border-b border-border">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-4">
            <div>
              <Heading as="h1" size="2xl">
                Multi-step form
              </Heading>
              <Text size="sm" variant="muted" className="mt-0.5">
                Worked examples for showcasing and testing the component.
              </Text>
            </div>
            <ThemeToggle />
          </div>
        </header>

        <main className="mx-auto max-w-3xl space-y-6 px-6 py-10">
          <Link
            href="/admin?area=playground"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            <ArrowLeft />
            Back to playground
          </Link>

          <section className="space-y-4">
            <Text size="sm" variant="muted">
              A route-free wizard built as a compound component. Steps are JSX children; each body
              reads and writes shared state through hooks, so there&apos;s no prop drilling and any
              step can depend on another&apos;s answers. Values live in a per-instance Zustand store.
              Each tab below is a separate usage in its own component.
            </Text>
            <Separator />

            <Tabs defaultValue={EXAMPLES[0].value}>
              <TabsList className="flex-wrap">
                {EXAMPLES.map((example) => (
                  <TabsTrigger key={example.value} value={example.value}>
                    {example.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              {EXAMPLES.map(({ value, summary, Component }) => (
                <TabsContent key={value} value={value} className="space-y-4">
                  <Text size="sm" variant="muted">
                    {summary}
                  </Text>
                  <Component />
                </TabsContent>
              ))}
            </Tabs>
          </section>
        </main>
      </div>
    </ToastProvider>
  );
}
