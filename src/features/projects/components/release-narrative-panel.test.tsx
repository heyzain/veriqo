import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ReleaseNarrativePanel } from "@/features/projects/components/release-narrative-panel";
import { linkVaultSeed } from "@/lib/mock/linkvault";
import type { ProjectRecords } from "@/server/services/project-service";
import type { Feature, Issue, Project } from "@/types/domain";

/**
 * Guards against the panel reverting to hardcoded copy (00-PRODUCT.md,
 * "Evidence over confidence theater" — every claim must trace to a real
 * record). Asserts against the actual LinkVault seed counts rather than
 * fabricated numbers: 6/11 features approved (11 includes the Phase 4
 * possible-duplicate feature, FEAT-11), 1/1 issues verified.
 */
function buildRecords(overrides: Partial<ProjectRecords> = {}): ProjectRecords {
  return {
    project: linkVaultSeed.project,
    features: [...linkVaultSeed.features],
    testCases: [...linkVaultSeed.testCases],
    testRuns: [...linkVaultSeed.testRuns],
    issues: [...linkVaultSeed.issues],
    activity: [...linkVaultSeed.activity],
    ...overrides,
  };
}

describe("ReleaseNarrativePanel", () => {
  it("derives the headline and factors from real feature/issue counts", () => {
    render(<ReleaseNarrativePanel records={buildRecords()} />);

    // 6 of 11 LinkVault features are approved — never a fabricated count.
    expect(
      screen.getByText("Every tracked issue is verified, with 6 of 11 features approved for coverage."),
    ).toBeDefined();
    expect(screen.getByText("6 / 11 Features Approved")).toBeDefined();

    // The one real verified issue (ISS-14), not an invented rerun ID.
    expect(screen.getByText("1 verified fix")).toBeDefined();
    expect(screen.getAllByText("ISS-14").length).toBeGreaterThan(0);

    // No open issues in the seed story — zero blockers, not a hardcoded claim.
    expect(screen.getByText("0 Open Blockers")).toBeDefined();
    expect(
      screen.getByText("No critical or high-severity failures blocking deployment."),
    ).toBeDefined();
  });

  it("names real pending features rather than a fixed list", () => {
    render(<ReleaseNarrativePanel records={buildRecords()} />);

    expect(
      screen.getAllByText(/Tags, Import\/Export, PWA Installation, Sessions, Full-text Search/).length,
    ).toBeGreaterThan(0);
  });

  it("reports open issues honestly when a fix has not been verified", () => {
    const project: Project = { ...linkVaultSeed.project };
    const unverifiedIssue: Issue = { ...linkVaultSeed.issues[0], status: "open" };
    const records = buildRecords({ project, issues: [unverifiedIssue] });

    render(<ReleaseNarrativePanel records={records} />);

    expect(
      screen.getByText("1 open issue to resolve before LinkVault is ready to release."),
    ).toBeDefined();
    expect(screen.getByText("1 Open Blockers")).toBeDefined();
    expect(screen.getByText("No fixes verified yet.")).toBeDefined();
  });

  it("handles a project with no features or issues without inventing numbers", () => {
    const project: Project = { ...linkVaultSeed.project };
    const records = buildRecords({
      project,
      features: [] as Feature[],
      issues: [] as Issue[],
    });

    render(<ReleaseNarrativePanel records={records} />);

    expect(
      screen.getByText("No issues have been reported yet, with 0 of 0 features approved."),
    ).toBeDefined();
    expect(screen.getByText("All features have been reviewed.")).toBeDefined();
  });
});
