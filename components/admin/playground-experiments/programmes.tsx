'use client';

import { useEffect, useState } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Text } from "@/components/ui/text";

import { ROLE_LABELS, ROLES, can, programmesRepository } from "@/lib/data-layer";
import type { Programme } from "@/lib/data-layer";

const DEMO_ACTOR = { id: "demo", role: ROLES.ioAdmin };

/**
 * EXAMPLE GUARDED PAGE. Uses a static actor and the real data-layer policy so the
 * demo renders without the React Router loader. In a full integration the actor
 * would come from `useRole()` and the repository would be seeded elsewhere.
 */
export default function Programmes() {
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const actor = DEMO_ACTOR;
  const canCreate = can(actor, "create", "programmes");
  const canDelete = can(actor, "delete", "programmes");

  useEffect(() => {
    void programmesRepository.as(actor).list().then((res) => {
      if (res.ok) setProgrammes(res.data);
    });
  }, [actor]);

  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-4">
          <Heading as="h1" size="2xl">
            Programmes
          </Heading>
          <Badge variant="info">acting as {ROLE_LABELS[actor.role]}</Badge>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-6 py-10">
        <Link href="/admin?area=users" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          Switch identity
        </Link>

        <Text size="sm" variant="muted">
          You can see this page because the policy grants <strong>{ROLE_LABELS[actor.role]}</strong> the{" "}
          <code>list</code> action on <code>programmes</code>. Your buttons below mirror the same
          policy: create is {canCreate ? "allowed" : "denied"}, delete is{" "}
          {canDelete ? "allowed" : "denied"}.
        </Text>

        <div className="flex items-center gap-3">
          <Button disabled={!canCreate}>New programme</Button>
          {!canCreate ? (
            <Text size="xs" variant="muted">
              Disabled — your role may not create programmes.
            </Text>
          ) : null}
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Education level</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {programmes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3}>
                  <Text size="sm" variant="muted">
                    No programmes yet. Seed some in the dev database.
                  </Text>
                </TableCell>
              </TableRow>
            ) : (
              programmes.map((programme) => (
                <TableRow key={programme.programmeId}>
                  <TableCell className="font-medium">{programme.programmeTitle}</TableCell>
                  <TableCell>
                    <Badge variant="subtle">{programme.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Text size="xs" variant="muted">
                      {programme.educationLevel}
                    </Text>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </main>
    </div>
  );
}
