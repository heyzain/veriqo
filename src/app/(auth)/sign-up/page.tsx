import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SignUpForm } from "@/features/auth/components/sign-up-form";
import { getCurrentUser } from "@/server/services/auth-service";

export const metadata: Metadata = { title: "Create account" };

export default async function SignUpPage() {
  const user = await getCurrentUser();
  if (user) redirect("/projects");

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="text-eyebrow-style text-foreground-muted">Get started</p>
        <h1 className="font-serif text-display-md text-foreground">Create your account</h1>
        <p className="text-body-lg text-foreground-secondary">
          Set up a workspace, connect Claude, and turn your codebase into traceable coverage.
        </p>
      </div>
      <SignUpForm />
    </div>
  );
}
