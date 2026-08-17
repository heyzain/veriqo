import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SignInForm } from "@/features/auth/components/sign-in-form";
import { getCurrentUser } from "@/server/services/auth-service";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const [user, { redirectTo }] = await Promise.all([getCurrentUser(), searchParams]);
  if (user) redirect(redirectTo || "/projects");

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="text-eyebrow-style text-foreground-muted">Welcome back</p>
        <h1 className="font-serif text-display-md text-foreground">Sign in</h1>
        <p className="text-body-lg text-foreground-secondary">
          Pick up where you left off with your projects and their coverage.
        </p>
      </div>
      <SignInForm redirectTo={redirectTo} />
    </div>
  );
}
