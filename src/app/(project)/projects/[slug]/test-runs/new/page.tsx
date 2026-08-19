import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Icon } from "@/components/ui/icon";
import { TestRunCreateForm } from "@/features/test-runs/components/test-run-create-form";
import { getCurrentUser } from "@/server/services/auth-service";
import { getProjectForOwner } from "@/server/services/project-service";
import { listFeaturesForProject } from "@/server/services/feature-service";
import { listTestCasesForProject } from "@/server/services/test-case-service";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const [user, { slug }] = await Promise.all([getCurrentUser(), params]);
  const project = user ? await getProjectForOwner(slug, user) : null;
  return { title: project ? `${project.name} · New Test Run` : "New Test Run" };
}

export default async function NewTestRunPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const { slug } = await params;
  const query = await searchParams;
  const project = await getProjectForOwner(slug, user);
  if (!project) notFound();

  const [features, allTestCases] = await Promise.all([
    listFeaturesForProject(project),
    listTestCasesForProject(project),
  ]);
  const testCases = allTestCases.filter((tc) => tc.status !== "archived");
  const preselectedTestCaseIds =
    typeof query.testCaseIds === "string" ? query.testCaseIds.split(",").filter(Boolean) : [];

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <div className="flex flex-col gap-1">
        <Link
          href={`/projects/${project.slug}/test-runs`}
          className="flex w-fit items-center gap-1 text-body-sm text-foreground-muted hover:text-foreground"
        >
          <Icon name="chevronLeft" size={13} />
          <span>Test Runs</span>
        </Link>
      </div>

      <div className="flex flex-col gap-1.5 border-b border-subtle pb-6">
        <h1 className="text-title-lg font-serif text-foreground">New test run</h1>
        <p className="max-w-2xl text-body text-foreground-secondary">
          Record the build, environment, and test cases for this execution — you&apos;ll run it step by step next.
        </p>
        {preselectedTestCaseIds.length > 0 ? (
          <p className="text-body-sm text-foreground-muted">
            {preselectedTestCaseIds.length} test case{preselectedTestCaseIds.length === 1 ? "" : "s"} pre-selected from{" "}
            <Link href={`/projects/${project.slug}/test-cases`} className="underline hover:no-underline">
              Test Cases
            </Link>
            .
          </p>
        ) : null}
      </div>

      <TestRunCreateForm
        projectSlug={project.slug}
        projectEnvironment={project.environment}
        testCases={testCases}
        features={features}
        preselectedTestCaseIds={preselectedTestCaseIds}
      />
    </div>
  );
}
