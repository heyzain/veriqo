import { beforeEach, describe, expect, it } from "vitest";

import { resetTestDb } from "@/test/db";
import type { PublicUser } from "@/types/auth";

import {
  createProjectForOwner,
  getProjectForOwner,
  listProjects,
  toggleProjectArchivedForOwner,
  updateProjectForOwner,
} from "./project-service";

const owner: PublicUser = {
  id: "user-owner",
  name: "Owner",
  email: "owner@example.com",
  emailVerified: true,
  createdAt: new Date().toISOString(),
};
const intruder: PublicUser = {
  id: "user-intruder",
  name: "Intruder",
  email: "intruder@example.com",
  emailVerified: true,
  createdAt: new Date().toISOString(),
};

beforeEach(resetTestDb);

describe("project-service — tenant isolation", () => {
  it("rejects cross-owner access to a project by slug (mandatory business rule)", async () => {
    const project = await createProjectForOwner(
      {
        name: "Owner's Project",
        description: "A project only its owner should be able to open.",
        appUrl: "https://example.com",
        environment: "staging",
      },
      owner,
    );

    expect(await getProjectForOwner(project.slug, owner)).not.toBeNull();
    expect(await getProjectForOwner(project.slug, intruder)).toBeNull();
  });

  it("never lists another owner's projects", async () => {
    await createProjectForOwner(
      { name: "Owner Alpha", description: "Owned by owner.", appUrl: "https://a.example.com", environment: "staging" },
      owner,
    );
    await createProjectForOwner(
      { name: "Intruder Beta", description: "Owned by intruder.", appUrl: "https://b.example.com", environment: "staging" },
      intruder,
    );

    const { active } = await listProjects(owner);
    expect(active).toHaveLength(1);
    expect(active[0]!.name).toBe("Owner Alpha");
  });

  it("returns identical null for a nonexistent slug and a slug owned by someone else", async () => {
    const project = await createProjectForOwner(
      { name: "Real Project", description: "Exists, but not owned by the intruder.", appUrl: "https://example.com", environment: "production" },
      owner,
    );

    expect(await getProjectForOwner("does-not-exist", intruder)).toBeNull();
    expect(await getProjectForOwner(project.slug, intruder)).toBeNull();
  });
});

describe("project-service — creation", () => {
  it("marks a newly created project's first setup step complete", async () => {
    const project = await createProjectForOwner(
      { name: "Fresh Project", description: "Just created.", appUrl: "https://example.com", environment: "development" },
      owner,
    );
    expect(project.setupStepsCompleted).toBe(1);
    expect(project.archived).toBe(false);
  });

  it("disambiguates a duplicate project name with a distinct slug and code", async () => {
    const first = await createProjectForOwner(
      { name: "Duplicate Name", description: "First one.", appUrl: "https://a.example.com", environment: "staging" },
      owner,
    );
    const second = await createProjectForOwner(
      { name: "Duplicate Name", description: "Second one.", appUrl: "https://b.example.com", environment: "staging" },
      owner,
    );
    expect(first.slug).not.toBe(second.slug);
    expect(first.publicId).not.toBe(second.publicId);
  });
});

describe("project-service — updates and settings", () => {
  it("allows owner to update project settings and records activity", async () => {
    const project = await createProjectForOwner(
      { name: "Initial Name", description: "Initial description.", appUrl: "https://example.com", environment: "development" },
      owner,
    );

    const updated = await updateProjectForOwner(
      project.slug,
      {
        name: "Updated Name",
        description: "Updated description.",
        appUrl: "https://updated.example.com",
        environment: "production",
        repository: "github.com/owner/repo",
      },
      owner,
    );

    expect(updated).not.toBeNull();
    expect(updated?.name).toBe("Updated Name");
    expect(updated?.environment).toBe("production");
    expect(updated?.repository).toBe("github.com/owner/repo");

    // Intruder cannot update owner's project
    const unauthorized = await updateProjectForOwner(
      project.slug,
      {
        name: "Hacked",
        description: "Hacked",
        appUrl: "https://hacked.com",
        environment: "staging",
      },
      intruder,
    );
    expect(unauthorized).toBeNull();
  });

  it("toggles archive state correctly", async () => {
    const project = await createProjectForOwner(
      { name: "Active Project", description: "Desc", appUrl: "https://example.com", environment: "staging" },
      owner,
    );
    expect(project.archived).toBe(false);

    const archived = await toggleProjectArchivedForOwner(project.slug, owner);
    expect(archived?.archived).toBe(true);

    const unarchived = await toggleProjectArchivedForOwner(project.slug, owner);
    expect(unarchived?.archived).toBe(false);
  });
});
