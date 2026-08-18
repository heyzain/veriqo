import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ProjectSidebar } from "@/features/projects/components/project-sidebar";
import type { PublicUser } from "@/types/auth";
import type { Project } from "@/types/domain";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/projects/linkvault",
  useRouter: () => ({ push: vi.fn() }),
}));

const mockUser: PublicUser = {
  id: "user-1",
  name: "Priya Nair",
  email: "priya@veriqo.test",
  emailVerified: true,
  createdAt: "2026-07-01T00:00:00.000Z",
};

const mockProject: Project = {
  id: "proj-linkvault",
  publicId: "LNKV",
  slug: "linkvault",
  ownerId: "user-1",
  name: "LinkVault",
  description: "Link management.",
  appUrl: "https://linkvault.example.com",
  environment: "staging",
  archived: false,
  setupStepsCompleted: 7,
  createdAt: "2026-07-01T00:00:00.000Z",
};

describe("ProjectSidebar component", () => {
  it("renders navigation items and project switcher", () => {
    render(
      <ProjectSidebar
        project={mockProject}
        projects={[mockProject]}
        user={mockUser}
        collapsed={false}
      />,
    );

    expect(screen.getByText("Overview")).toBeDefined();
    expect(screen.getByText("Features")).toBeDefined();
    expect(screen.getByText("Test Cases")).toBeDefined();
    expect(screen.getByText("Test Runs")).toBeDefined();
    expect(screen.getByText("Issues")).toBeDefined();
    expect(screen.getByText("Activity")).toBeDefined();
    expect(screen.getByText("Analytics")).toBeDefined();
    expect(screen.getByText("Claude MCP")).toBeDefined();
    expect(screen.getByText("Settings")).toBeDefined();
  });
});
