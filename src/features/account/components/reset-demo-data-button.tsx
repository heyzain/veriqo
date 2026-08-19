"use client";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { resetDemoDataAction } from "@/features/account/actions";

/** Demo/staging-only — the page that renders this already checks `NODE_ENV`; `dev-service.ts` enforces it again server-side. */
export function ResetDemoDataButton() {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" intent="secondary" size="md">
          <Icon name="revoke" size={15} />
          <span>Reset demo data</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent
        title="Reset all demo data?"
        description="Every account and project reverts to the seeded demo state. You'll be signed out."
      >
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button type="button" intent="secondary">
              Cancel
            </Button>
          </AlertDialogCancel>
          <form action={resetDemoDataAction}>
            <Button type="submit" intent="danger">
              Reset demo data
            </Button>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
