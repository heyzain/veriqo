"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { toast } from "@/components/ui/toast";
import {
  issueMcpCredentialAction,
  revokeMcpCredentialAction,
  type IssueCredentialValues,
} from "@/features/mcp/actions";
import { McpCommandBlock } from "@/features/mcp/components/mcp-command-block";
import { idleState } from "@/lib/forms/action-state";
import { formatDateTime } from "@/lib/format/date";
import type { PublicMcpCredential } from "@/types/domain";

export type McpCredentialPanelProps = {
  projectSlug: string;
  credential: PublicMcpCredential | null;
};

type TestResult = { ok: boolean; message: string };

/**
 * Owns the full credential lifecycle in one place: generate, regenerate,
 * revoke, and the reveal-once dialog where the plaintext secret is shown
 * exactly once alongside a real "Test connection now" round trip
 * (02-BUILD-PHASES.md Phase 3, "Connection test endpoint and UI"). After the
 * secret is shown here, only a masked reference (`credential.displayPrefix`
 * / `displaySuffix`) is ever rendered again, driven by server props.
 */
export function McpCredentialPanel({ projectSlug, credential }: McpCredentialPanelProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    issueMcpCredentialAction,
    idleState<IssueCredentialValues>(),
  );
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testing, setTesting] = useState(false);

  // Derived, not effect-driven: the freshest issued secret is shown until
  // its own value is recorded as dismissed. Comparing by value (not a
  // boolean flag) means submitting again for a *new* secret re-opens the
  // dialog automatically, since every issued secret is unique.
  const [dismissedSecret, setDismissedSecret] = useState<string | null>(null);
  const latestSecret = state.status === "success" ? (state.meta?.secret ?? null) : null;
  const revealedSecret = latestSecret && latestSecret !== dismissedSecret ? latestSecret : null;

  async function testConnection(secret: string) {
    setTesting(true);
    setTestResult(null);
    try {
      const response = await fetch(`/api/mcp/${projectSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
        body: JSON.stringify({ tool: "health_check" }),
      });
      const data = (await response.json()) as { ok: boolean; error?: string };
      if (response.ok && data.ok) {
        setTestResult({ ok: true, message: "Connection verified — Claude MCP responded successfully." });
        toast({ title: "Connection verified", variant: "pass" });
        router.refresh();
      } else {
        setTestResult({ ok: false, message: data.error ?? "The connection test failed." });
      }
    } catch {
      setTestResult({ ok: false, message: "Network error while testing the connection. Check the endpoint and try again." });
    } finally {
      setTesting(false);
    }
  }

  function closeRevealDialog() {
    if (revealedSecret) setDismissedSecret(revealedSecret);
    setTestResult(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Credential Card */}
      <div className="flex flex-col gap-4 rounded-lg border border-subtle bg-surface p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-forest text-foreground-on-dark shadow-sm">
            <Icon name="key" size={18} />
          </div>
          <div>
            <h2 className="text-body font-medium text-foreground">Project credential</h2>
            <p className="text-body-sm text-foreground-muted">
              A project-scoped secret Claude uses to authenticate MCP requests.
            </p>
          </div>
        </div>

        {credential ? (
          <div className="flex flex-col gap-3 rounded-md border border-subtle bg-inset/40 p-4">
            <div className="flex flex-col gap-1">
              <span className="text-eyebrow text-foreground-muted uppercase tracking-wider">
                Masked value
              </span>
              <span className="text-mono-sm text-foreground">
                {credential.displayPrefix}••••••••••••{credential.displaySuffix}
              </span>
            </div>
            <p className="text-body-sm text-foreground-muted">
              Created {formatDateTime(credential.createdAt)} by {credential.createdByName}. The full
              value was only ever shown once, at creation.
            </p>
            <div className="pt-1">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button intent="secondary" size="sm" type="button">
                    <Icon name="changed" size={14} />
                    <span>Regenerate credential</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent
                  title="Regenerate this credential?"
                  description="The current credential stops working immediately. Any Claude client using it will need the new value before it can connect again."
                >
                  <AlertDialogFooter>
                    <AlertDialogCancel asChild>
                      <Button intent="secondary">Cancel</Button>
                    </AlertDialogCancel>
                    <form action={formAction}>
                      <input type="hidden" name="projectSlug" value={projectSlug} />
                      <AlertDialogAction asChild>
                        <Button intent="danger" type="submit" disabled={isPending}>
                          {isPending ? "Regenerating…" : "Regenerate"}
                        </Button>
                      </AlertDialogAction>
                    </form>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-3 rounded-md border border-dashed border-subtle bg-inset/30 p-5">
            <p className="text-body-sm text-foreground-secondary">
              No credential has been issued yet. Generate one to connect Claude Code or Claude Desktop
              to this project.
            </p>
            <form action={formAction}>
              <input type="hidden" name="projectSlug" value={projectSlug} />
              <Button type="submit" intent="primary" size="md" disabled={isPending}>
                <Icon name="key" size={15} />
                <span>{isPending ? "Generating…" : "Generate credential"}</span>
              </Button>
            </form>
          </div>
        )}

        {state.status === "error" && state.formError ? (
          <div className="rounded-md border border-fail/30 bg-fail/10 p-3 text-body-sm text-fail">
            {state.formError}
          </div>
        ) : null}
      </div>

      {/* Danger Zone */}
      {credential ? (
        <div className="flex flex-col gap-3 rounded-lg border border-fail/20 bg-surface p-6">
          <div>
            <h2 className="text-title-md text-foreground">Danger zone</h2>
            <p className="text-body-sm text-foreground-muted">
              Revoking disconnects Claude immediately. Generate a new credential to reconnect.
            </p>
          </div>
          <div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button intent="secondary" size="sm" type="button" className="text-fail hover:border-fail">
                  <Icon name="revoke" size={14} />
                  <span>Revoke credential</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent
                title="Revoke this credential?"
                description="Claude will immediately lose access to this project. This can't be undone — generate a new credential to reconnect."
              >
                <AlertDialogFooter>
                  <AlertDialogCancel asChild>
                    <Button intent="secondary">Cancel</Button>
                  </AlertDialogCancel>
                  <form action={revokeMcpCredentialAction}>
                    <input type="hidden" name="projectSlug" value={projectSlug} />
                    <AlertDialogAction asChild>
                      <Button intent="danger" type="submit">
                        Revoke credential
                      </Button>
                    </AlertDialogAction>
                  </form>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      ) : null}

      {/* Reveal-once Dialog */}
      <Dialog
        open={Boolean(revealedSecret)}
        onOpenChange={(open) => {
          if (!open) closeRevealDialog();
        }}
      >
        <DialogContent
          title="Save this credential now"
          description="This is the only time the full value is shown. Store it somewhere safe — Veriqo only keeps a masked reference after this."
        >
          {revealedSecret ? (
            <div className="flex flex-col gap-4">
              <McpCommandBlock label="MCP credential" value={revealedSecret} />

              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  intent="secondary"
                  size="sm"
                  onClick={() => testConnection(revealedSecret)}
                  disabled={testing}
                >
                  <Icon
                    name={testing ? "spinner" : "mcp"}
                    size={14}
                    className={testing ? "animate-spin" : undefined}
                  />
                  <span>{testing ? "Testing connection…" : "Test connection now"}</span>
                </Button>

                {testResult ? (
                  <div
                    role="status"
                    className={`flex items-start gap-2 rounded-md border p-3 text-body-sm ${
                      testResult.ok
                        ? "border-pass/30 bg-pass/10 text-pass"
                        : "border-fail/30 bg-fail/10 text-fail"
                    }`}
                  >
                    <Icon name={testResult.ok ? "approved" : "fail"} size={15} className="mt-0.5 shrink-0" />
                    <span>{testResult.message}</span>
                  </div>
                ) : null}
              </div>

              <DialogFooter>
                <Button type="button" intent="primary" onClick={closeRevealDialog}>
                  I&apos;ve saved it
                </Button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
