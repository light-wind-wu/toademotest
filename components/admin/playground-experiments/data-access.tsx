import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { Text } from "@/components/ui/text";

import { DataAccessDemo } from "@/components/data-access-demo";
import { ThemeToggle } from "@/components/theme-toggle";


export default function DataAccessPlayground() {
  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <Heading as="h1" size="2xl">
              Data access layer
            </Heading>
            <Text size="sm" variant="muted" className="mt-0.5">
              Role-aware reads and writes over a swappable storage backend.
            </Text>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-6 py-10">
        <Link href="/admin?area=playground" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ArrowLeft />
          Back to playground
        </Link>

        <section className="space-y-4">
          <Text size="sm" variant="muted">
            Every read and write goes through a repository in <code>app/data</code>, which authorises
            the acting identity against one policy table (deny-by-default) and validates with zod
            before touching storage. The backend here is <code>localStorage</code>, but nothing on
            this screen knows that — swapping it is a one-line change in <code>config.ts</code>. Switch
            the acting identity below and watch what each role can see and do change.
          </Text>
          <Separator />
          <DataAccessDemo />
        </section>
      </main>
    </div>
  );
}
