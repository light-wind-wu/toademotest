import { Plus } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Text } from "@/components/ui/text";

import { ROLE_LABELS, ROLES } from "@/lib/data-layer";
import { Shell } from "@/components/shell";

const DEMO_ACTOR = { id: "demo", role: ROLES.internshipOfficer };

/**
 * DEMO of the application Shell. A static actor is used here so the demo
 * renders without the React Router session loader; the real role-aware nav
 * filtering is still exercised by the Shell.
 */
export default function ShellDemo() {
  const actor = DEMO_ACTOR;
  const roleLabel = ROLE_LABELS[actor.role];

  return (
    <Shell
      actor={actor}
      user={{ name: "Davina Tan", email: "davina.tan@dsta.gov.sg" }}
      title="Dashboard"
      workstream="Internship"
      actions={
        <Button size="sm" className="hidden sm:inline-flex">
          <Plus className="size-4" />
          Quick actions
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <Text variant="muted">Signed in as</Text>
          <Badge variant="info">{roleLabel}</Badge>
          <Link
            href="/admin?area=users"
            className="text-sm text-accent underline-offset-4 hover:underline"
          >
            Switch identity
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Role-aware navigation</CardTitle>
            <CardDescription>
              The side-nav is filtered by the same policy the data layer enforces.
              Items gated on a resource you cannot read — or a role you do not hold —
              simply do not render. Sign in as different users to compare.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Text size="sm" variant="muted">
              This panel is the main content slot. Drop any page in here; the sticky
              sidebar and header stay put around it.
            </Text>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}
