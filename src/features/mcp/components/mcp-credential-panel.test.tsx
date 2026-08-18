import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { McpCredentialPanel } from "@/features/mcp/components/mcp-credential-panel";
import type { PublicMcpCredential } from "@/types/domain";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const mockCredential: PublicMcpCredential = {
  id: "cred-test",
  projectId: "proj-test",
  status: "active",
  displayPrefix: "vrq_live_ab12",
  displaySuffix: "wxyz",
  createdAt: "2026-08-01T00:00:00.000Z",
  createdByName: "Priya Nair",
};

describe("McpCredentialPanel component", () => {
  it("offers to generate a credential when none exists yet", () => {
    render(<McpCredentialPanel projectSlug="test-app" credential={null} />);

    expect(screen.getByRole("button", { name: /generate credential/i })).toBeDefined();
    expect(screen.queryByText(/masked value/i)).toBeNull();
  });

  it("shows the masked value and management actions once a credential is active", () => {
    render(<McpCredentialPanel projectSlug="test-app" credential={mockCredential} />);

    expect(screen.getByText(/masked value/i)).toBeDefined();
    expect(screen.getByText(/vrq_live_ab12/)).toBeDefined();
    expect(screen.getByText(/wxyz/)).toBeDefined();
    expect(screen.getByRole("button", { name: /regenerate credential/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /revoke credential/i })).toBeDefined();
    expect(screen.queryByRole("button", { name: /^generate credential$/i })).toBeNull();
  });
});
