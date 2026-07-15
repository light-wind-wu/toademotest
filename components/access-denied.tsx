import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";

/**
 * A simple access-denied placeholder for the playground demos. In the original
 * React Router prototype this inspected the route error response; in Next.js it
 * just renders the supplied denial message.
 */
export function AccessDeniedBoundary({ message }: { message: string }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 px-6">
      <Alert variant="danger">
        <AlertTitle>Access denied</AlertTitle>
        <AlertDescription>{message}</AlertDescription>
      </Alert>
      <Link href="/admin?area=users" className={buttonVariants({ variant: "solid", size: "sm" })}>
        Switch identity
      </Link>
    </div>
  );
}
