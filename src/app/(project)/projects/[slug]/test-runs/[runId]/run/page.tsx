import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { TestRunner } from "@/features/test-runs/components/test-runner";
import { getCurrentUser } from "@/server/services/auth-service";
import { getProjectForOwner } from "@/server/services/project-service";
import { listFeaturesForProject } from "@/server/services/feature-service";
import { getTestRunDetail } from "@/server/services/test-run-service";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; runId: string }>;
}): Promise<Metadata> {
  const [user, { slug, runId }] = await Promise.all([getCurrentUser(), params]);
  const project = user ? getProjectForOwner(slug, user) : null;
  const detail = project ? getTestRunDetail(project, runId) : null;
  return { title: detail ? `Run ${detail.testRun.publicId} — ${detail.testRun.name}` : "Run test cases" };
}

export default async function RunExecutionPage({
  params,
}: {
  params: Promise<{ slug: string; runId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const { slug, runId } = await params;
  const project = getProjectForOwner(slug, user);
  if (!project) notFound();

  const detail = getTestRunDetail(project, runId);
  if (!detail || detail.items.length === 0) notFound();

  const { testRun, items, progress, nextIncompleteTestCasePublicId } = detail;
  const features = listFeaturesForProject(project);
  const startIndex = nextIncompleteTestCasePublicId
    ? Math.max(
        0,
        items.findIndex((item) => item.testCase.publicId === nextIncompleteTestCasePublicId),
      )
    : 0;

  return (
    <TestRunner
      projectSlug={project.slug}
      testRun={testRun}
      items={items}
      features={features}
      progress={progress}
      startIndex={startIndex}
    />
  );
}
