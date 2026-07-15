import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { Text } from "@/components/ui/text";

import { Dashboard } from "@/components/dashboard/dashboard";
import {
  DEFAULT_DASHBOARD,
  WIDGET_CATALOGUE,
} from "@/components/dashboard/widgets";
import { ThemeToggle } from "@/components/theme-toggle";


export default function DashboardDemo() {
  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <Heading as="h1" size="2xl">
              Customisable dashboard
            </Heading>
            <Text size="sm" variant="muted" className="mt-0.5">
              Drag, resize, add, and remove widgets — powered by
              react-grid-layout.
            </Text>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <Link
          href="/admin?area=playground"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ArrowLeft />
          Back to playground
        </Link>

        <div className="space-y-2">
          <Heading as="h2" size="lg">
            Your dashboard
          </Heading>
          <Text size="sm" variant="muted">
            Hit <span className="font-medium text-fg">Edit dashboard</span> to
            rearrange the grid. Widgets keep their minimum sizes, the welcome
            banner is pinned in place, and your layout is remembered on this
            device.
          </Text>
          <Separator />
        </div>

        <Dashboard
          catalogue={WIDGET_CATALOGUE}
          defaultWidgets={DEFAULT_DASHBOARD}
          storageKey="prizm-dashboard-layout"
        />
      </main>
    </div>
  );
}
