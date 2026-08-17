"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

/**
 * Recoverable route-level error boundary. Calm and specific, per
 * 01-DESIGN-SYSTEM.md content voice — states what happened and offers the
 * one recovery action, no blame.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-screen max-w-[1480px] flex-col items-center justify-center gap-4 px-8 text-center">
      <div className="flex size-11 items-center justify-center rounded-pill bg-fail/10 text-fail">
        <Icon name="alert" size={20} />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-title-md text-foreground">Something went wrong loading this page.</p>
        <p className="max-w-sm text-body-sm text-foreground-muted">
          The error has been logged. Try again, and if it keeps happening, reload the page.
        </p>
      </div>
      <Button onClick={() => reset()}>Try again</Button>
    </div>
  );
}
