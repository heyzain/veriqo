import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-screen max-w-[1480px] flex-col items-center justify-center gap-4 px-8 text-center">
      <div className="flex size-11 items-center justify-center rounded-pill bg-inset text-foreground-muted">
        <Icon name="search" size={20} />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-title-md text-foreground">This page doesn&apos;t exist.</p>
        <p className="max-w-sm text-body-sm text-foreground-muted">
          The record may have moved or been archived. Check the link, or go back to the start.
        </p>
      </div>
      <Button asChild>
        <Link href="/">Back home</Link>
      </Button>
    </div>
  );
}
