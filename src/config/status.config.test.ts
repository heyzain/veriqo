import { describe, expect, it } from "vitest";

import {
  featureStatuses,
  issueStatuses,
  resultStatuses,
  testCaseStatuses,
  testRunStatuses,
} from "./status.config";

const statusMaps = {
  featureStatuses,
  testCaseStatuses,
  testRunStatuses,
  resultStatuses,
  issueStatuses,
};

describe("status config", () => {
  for (const [mapName, statusMap] of Object.entries(statusMaps)) {
    it(`${mapName}: every transition target is a real key in the same map`, () => {
      const keys = new Set(Object.keys(statusMap));
      for (const [key, definition] of Object.entries(statusMap)) {
        for (const target of definition.transitions) {
          expect(keys.has(target), `${mapName}.${key} transitions to unknown state "${target}"`).toBe(
            true,
          );
        }
      }
    });

    it(`${mapName}: no status transitions to itself`, () => {
      for (const [key, definition] of Object.entries(statusMap)) {
        expect(definition.transitions).not.toContain(key);
      }
    });
  }

  it("issueStatuses: verified is terminal, matching the 'fix does not verify an issue' rule", () => {
    expect(issueStatuses.verified.transitions).toHaveLength(0);
  });

  it("issueStatuses: readyForRetest can only resolve to verified or reopened", () => {
    expect(new Set(issueStatuses.readyForRetest.transitions)).toEqual(
      new Set(["verified", "reopened"]),
    );
  });
});
