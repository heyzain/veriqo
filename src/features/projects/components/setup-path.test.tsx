import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SetupPath } from "@/features/projects/components/setup-path";
import type { Project } from "@/types/domain";

const mockProject: Project = {
  id: "proj-test",
  publicId: "TEST",
  slug: "test-app",
  ownerId: "user-1",
  name: "Test Application",
  description: "A test application for guided setup testing.",
  appUrl: "https://test.example.com",
  environment: "development",
  archived: false,
  setupStepsCompleted: 1, // Only step 1 done, step 2 next
  createdAt: "2026-08-01T00:00:00.000Z",
};

describe("SetupPath component", () => {
  it("renders the 7-step guided setup checklist", () => {
    render(<SetupPath project={mockProject} />);

    expect(screen.getByText("Guided Setup Checklist")).toBeDefined();
    expect(screen.getByText("Project created")).toBeDefined();
    expect(screen.getByText("Connect Claude")).toBeDefined();
    expect(screen.getByText("Discover features")).toBeDefined();
    expect(screen.getByText("Review features")).toBeDefined();
    expect(screen.getByText("Generate test cases")).toBeDefined();
    expect(screen.getByText("Create first run")).toBeDefined();
    expect(screen.getByText("Review release readiness")).toBeDefined();
  });

  it("highlights Step 2 as the next action when step 1 is complete", () => {
    render(<SetupPath project={mockProject} />);

    expect(screen.getByText("Next: Connect Claude")).toBeDefined();
    const links = screen.getAllByRole("link", { name: /Connect Claude MCP/i });
    expect(links.length).toBeGreaterThanOrEqual(1);
  });
});
