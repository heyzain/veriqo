import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { DeleteAccountDialog } from "@/features/account/components/delete-account-dialog";
import { ResetDemoDataButton } from "@/features/account/components/reset-demo-data-button";
import { formatDate } from "@/lib/format/date";
import { getCurrentUser } from "@/server/services/auth-service";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-10 sm:px-8">
      <div className="flex flex-col gap-1 border-b border-subtle pb-6">
        <h1 className="text-title-lg font-serif text-foreground">Account</h1>
        <p className="text-body text-foreground-secondary">Your profile, data, and account settings.</p>
      </div>

      <section className="flex items-center gap-4 rounded-lg border border-subtle bg-surface p-5">
        <Avatar name={user.name} size="lg" />
        <div className="flex flex-col gap-0.5">
          <span className="text-title-md text-foreground">{user.name}</span>
          <span className="text-body-sm text-foreground-muted">{user.email}</span>
          <span className="text-body-sm text-foreground-muted">Member since {formatDate(user.createdAt)}</span>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-subtle bg-surface p-5">
        <div className="flex items-center gap-2">
          <Icon name="import" size={16} className="text-foreground-muted" />
          <h2 className="text-title-md text-foreground">Export your data</h2>
        </div>
        <p className="text-body-sm text-foreground-secondary">
          Download every project you own — features, test cases, runs, results, and issues — as one JSON file.
        </p>
        <a
          href="/api/account/export"
          className="inline-flex w-fit items-center gap-2 rounded-sm border border-strong bg-transparent px-4 py-2 text-body font-medium text-foreground transition-fast hover:bg-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          <Icon name="copy" size={15} />
          <span>Download export (.json)</span>
        </a>
      </section>

      {process.env.NODE_ENV !== "production" ? (
        <section className="flex flex-col gap-3 rounded-lg border border-subtle bg-inset/30 p-5">
          <div className="flex items-center gap-2">
            <Icon name="system" size={16} className="text-foreground-muted" />
            <h2 className="text-title-md text-foreground">Developer tools</h2>
          </div>
          <p className="text-body-sm text-foreground-secondary">
            Reset every account and project back to the seeded demo state — useful after live testing. Disabled in
            production; this signs you out.
          </p>
          <div>
            <ResetDemoDataButton />
          </div>
        </section>
      ) : null}

      <section className="flex flex-col gap-3 rounded-lg border border-fail/30 bg-fail/5 p-5">
        <div className="flex items-center gap-2">
          <Icon name="warning" size={16} className="text-fail" />
          <h2 className="text-title-md text-foreground">Danger zone</h2>
        </div>
        <p className="text-body-sm text-foreground-secondary">
          Permanently delete your account and every project you own. This can&apos;t be undone — export your data
          first if you want to keep a copy.
        </p>
        <div>
          <DeleteAccountDialog email={user.email} />
        </div>
      </section>
    </div>
  );
}
