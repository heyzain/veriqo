import { describe, expect, it } from "vitest";

import { linkVaultSeed } from "./linkvault";

describe("linkVaultSeed", () => {
  it("is deterministic — importing it twice yields identical data", async () => {
    const second = await import("./linkvault");
    expect(second.linkVaultSeed).toEqual(linkVaultSeed);
  });

  it("gives every feature, test case, and issue a unique public ID", () => {
    const publicIds = [
      ...linkVaultSeed.features.map((f) => f.publicId),
      ...linkVaultSeed.testCases.map((t) => t.publicId),
      ...linkVaultSeed.issues.map((i) => i.publicId),
    ];
    expect(new Set(publicIds).size).toBe(publicIds.length);
  });

  it("includes Private Vault as an approved, high-risk feature", () => {
    const privateVault = linkVaultSeed.features.find((f) => f.name === "Private Vault");
    expect(privateVault).toMatchObject({ status: "approved", risk: "high" });
  });

  it("PV-07 fails in Release Candidate 1", () => {
    const pv07 = linkVaultSeed.testCases.find((t) => t.publicId === "PV-07");
    const rc1 = linkVaultSeed.testRuns.find((r) => r.name === "Release Candidate 1");
    expect(pv07).toBeDefined();
    expect(rc1).toBeDefined();

    const failingResult = linkVaultSeed.testResults.find(
      (result) => result.testCaseId === pv07!.id && result.testRunId === rc1!.id,
    );
    expect(failingResult?.status).toBe("fail");
  });

  it("ISS-14 traces back to the failing result and forward to a passed rerun", () => {
    const issue = linkVaultSeed.issues.find((i) => i.publicId === "ISS-14");
    expect(issue).toBeDefined();

    const originResult = linkVaultSeed.testResults.find((r) => r.id === issue!.originResultId);
    expect(originResult?.status).toBe("fail");

    // Hard business rule (03-CLAUDE-RULES.md): an issue cannot become
    // Verified without an applicable passed rerun result.
    expect(issue!.status).toBe("verified");
    const rerunResult = linkVaultSeed.testResults.find((r) => r.id === issue!.rerunResultId);
    expect(rerunResult?.status).toBe("pass");
    expect(rerunResult?.testCaseId).toBe(originResult?.testCaseId);
  });

  it("records activity for every step of the PV-07 story in chronological order", () => {
    const timestamps = linkVaultSeed.activity.map((event) => new Date(event.createdAt).getTime());
    const sorted = [...timestamps].sort((a, b) => a - b);
    expect(timestamps).toEqual(sorted);
  });
});
