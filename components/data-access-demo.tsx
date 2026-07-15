'use client';

import { Database, RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Text } from "@/components/ui/text";

import {
  APPLICATION_STATUSES,
  ROLES,
  ROLE_LABELS,
  applicationsRepository,
  can,
  draftApplication,
  type Action,
  type Actor,
  type Application,
  type DataError,
} from "@/lib/data-layer";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  DATA ACCESS LAYER — playground demo. Lives with the playground and is removed
 *  with it. The DAL it exercises (`app/data`) is the part that stays.
 * ─────────────────────────────────────────────────────────────────────────────
 *  It demonstrates, against the real `localStorage` backend:
 *   - switching the acting role/identity,
 *   - deny-by-default authorisation (buttons enable/disable from the SAME policy
 *     the repository enforces — `can()`),
 *   - row-level ownership (an applicant only ever sees their own records),
 *   - the `Result` channel (denied/failed operations report, never throw).
 */

const RESOURCE = "applications";

/** A handful of preset identities to act as — enough to show every role. */
const ACTORS: { key: string; actor: Actor }[] = [
  { key: "alice", actor: { id: "applicant-alice", role: ROLES.applicant } },
  { key: "bob", actor: { id: "applicant-bob", role: ROLES.applicant } },
  { key: "io", actor: { id: "io-jneo", role: ROLES.internshipOfficer } },
  { key: "ioadmin", actor: { id: "ioadmin-tan", role: ROLES.ioAdmin } },
  { key: "adpnc", actor: { id: "pnc-lim", role: ROLES.adPnc } },
  { key: "director", actor: { id: "director-wong", role: ROLES.director } },
];

const ACTOR_NAMES: Record<string, string> = {
  "applicant-alice": "Alice Tan",
  "applicant-bob": "Bob Lim",
};

const ALL_ACTIONS: Action[] = ["create", "read", "list", "update", "delete"];

const STATUS_VARIANT: Record<Application["status"], "subtle" | "info" | "warning" | "success" | "danger"> = {
  draft: "subtle",
  submitted: "info",
  under_review: "warning",
  accepted: "success",
  rejected: "danger",
};

type Feedback = { kind: "ok" | "error"; message: string };

function describeError(error: DataError): string {
  return `[${error.code}] ${error.message}`;
}

export function DataAccessDemo() {
  const [actorKey, setActorKey] = useState(ACTORS[0].key);
  const [apps, setApps] = useState<Application[]>([]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [newName, setNewName] = useState("");

  const actor = ACTORS.find((a) => a.key === actorKey)!.actor;
  const repo = applicationsRepository.as(actor);

  /** Reload the list the current actor is allowed to see. */
  const refresh = useCallback(async () => {
    const res = await applicationsRepository.as(actor).list();
    if (res.ok) {
      setApps(res.data);
    } else {
      setApps([]);
      setFeedback({ kind: "error", message: describeError(res.error) });
    }
  }, [actor]);

  // localStorage is browser-only, so all reads happen here (client), never on
  // the server render. Re-runs whenever the acting identity changes.
  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** Wipe and re-seed two applications (owned by Alice and Bob) as IO Admin. */
  async function reseed() {
    const admin = ACTORS.find((a) => a.key === "ioadmin")!.actor;
    const adminRepo = applicationsRepository.as(admin);
    const stamp = new Date().toISOString();

    const existing = await adminRepo.list();
    if (existing.ok) {
      for (const app of existing.data) await adminRepo.remove(app.id);
    }

    const seeds: { applicantId: string; fullName: string; status: Application["status"] }[] = [
      { applicantId: "applicant-alice", fullName: "Alice Tan", status: "submitted" },
      { applicantId: "applicant-bob", fullName: "Bob Lim", status: "under_review" },
    ];
    for (const seed of seeds) {
      const created = await adminRepo.create(
        draftApplication({ applicantId: seed.applicantId, fullName: seed.fullName, createdAt: stamp }),
      );
      if (created.ok && seed.status !== "draft") {
        await adminRepo.update(created.data.id, { status: seed.status });
      }
    }
    setFeedback({ kind: "ok", message: "Demo data reset (2 applications, as IO Admin)." });
    await refresh();
  }

  async function createApplication() {
    const name = newName.trim() || ACTOR_NAMES[actor.id] || "New applicant";
    const res = await repo.create(
      draftApplication({ applicantId: actor.id, fullName: name, createdAt: new Date().toISOString() }),
    );
    if (res.ok) {
      setFeedback({ kind: "ok", message: `Created application for ${res.data.fullName}.` });
      setNewName("");
      await refresh();
    } else {
      setFeedback({ kind: "error", message: describeError(res.error) });
    }
  }

  async function changeStatus(app: Application, status: Application["status"]) {
    const res = await repo.update(app.id, { status });
    setFeedback(
      res.ok
        ? { kind: "ok", message: `Updated ${app.fullName} → ${status}.` }
        : { kind: "error", message: describeError(res.error) },
    );
    await refresh();
  }

  async function removeApplication(app: Application) {
    const res = await repo.remove(app.id);
    setFeedback(
      res.ok
        ? { kind: "ok", message: `Deleted ${app.fullName}'s application.` }
        : { kind: "error", message: describeError(res.error) },
    );
    await refresh();
  }

  const canCreate = can(actor, "create", RESOURCE);

  return (
    <div className="space-y-6">
      {/* Identity + maintenance controls */}
      <div className="flex flex-wrap items-end gap-4">
        <Field className="min-w-56">
          <FieldLabel>Acting as</FieldLabel>
          <Select value={actorKey} onValueChange={(v) => setActorKey(v as string)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose an identity" />
            </SelectTrigger>
            <SelectContent>
              {ACTORS.map(({ key, actor: a }) => (
                <SelectItem key={key} value={key}>
                  {ROLE_LABELS[a.role]}
                  {ACTOR_NAMES[a.id] ? ` — ${ACTOR_NAMES[a.id]}` : ` — ${a.id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Button variant="outline" onClick={() => void reseed()}>
          <Database />
          Reset demo data
        </Button>
        <Button variant="ghost" onClick={() => void refresh()}>
          <RefreshCw />
          Refresh
        </Button>
      </div>

      {/* Live permission read-out from the policy */}
      <div className="space-y-2 rounded-md border border-border bg-surface p-4">
        <Text size="sm" className="font-medium">
          Policy says {ROLE_LABELS[actor.role]} may, on “{RESOURCE}”:
        </Text>
        <div className="flex flex-wrap gap-1.5">
          {ALL_ACTIONS.map((action) => {
            const allowed = can(actor, action, RESOURCE);
            return (
              <Badge key={action} variant={allowed ? "success" : "subtle"}>
                {allowed ? "✓" : "✕"} {action}
              </Badge>
            );
          })}
        </div>
        <Text size="xs" variant="muted">
          Resource-level view. Row-level rules narrow this further per record — e.g. an applicant&apos;s
          read/update only apply to their own application, which is also why the list below shows only
          their own.
        </Text>
      </div>

      {/* Create */}
      <div className="flex flex-wrap items-end gap-3">
        <Field className="min-w-64 flex-1">
          <FieldLabel>New application — applicant name</FieldLabel>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={ACTOR_NAMES[actor.id] ?? "Applicant name"}
            disabled={!canCreate}
          />
        </Field>
        <Button onClick={() => void createApplication()} disabled={!canCreate}>
          Create application
        </Button>
      </div>
      {!canCreate ? (
        <Text size="xs" variant="muted">
          The create button is disabled because the policy denies {ROLE_LABELS[actor.role]} the
          “create” action. Try it anyway by switching to an Applicant or IO Admin.
        </Text>
      ) : null}

      {/* Feedback from the last operation */}
      {feedback ? (
        <Alert variant={feedback.kind === "ok" ? "success" : "danger"}>
          <AlertTitle>{feedback.kind === "ok" ? "Done" : "Operation blocked"}</AlertTitle>
          <AlertDescription>{feedback.message}</AlertDescription>
        </Alert>
      ) : null}

      {/* The list visible to this actor */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Applicant</TableHead>
            <TableHead>Owner id</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {apps.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4}>
                <Text size="sm" variant="muted">
                  No applications visible to {ROLE_LABELS[actor.role]}. Use “Reset demo data” to seed,
                  then switch identities to compare what each role sees.
                </Text>
              </TableCell>
            </TableRow>
          ) : (
            apps.map((app) => {
              const canUpdate = can(actor, "update", RESOURCE, app);
              const canDelete = can(actor, "delete", RESOURCE, app);
              return (
                <TableRow key={app.id}>
                  <TableCell className="font-medium">{app.fullName}</TableCell>
                  <TableCell>
                    <Text size="xs" variant="muted">
                      {app.applicantId}
                    </Text>
                  </TableCell>
                  <TableCell>
                    {canUpdate ? (
                      <Select
                        value={app.status}
                        onValueChange={(v) => void changeStatus(app, v as Application["status"])}
                      >
                        <SelectTrigger className="h-8 w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {APPLICATION_STATUSES.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant={STATUS_VARIANT[app.status]}>{app.status}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!canDelete}
                      onClick={() => void removeApplication(app)}
                    >
                      <Trash2 />
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
