import { clientEnv } from "@/lib/env/client";

/**
 * Single source of truth for product identity. Components must not repeat
 * "Veriqo", "VQ", or "Claude Code" as raw strings — import this instead, so
 * a rebrand only touches this file (see 04-CONFIG-BLUEPRINT.md).
 */
export const productConfig = {
  name: "Veriqo",
  shortName: "VQ",
  description:
    "A connected QA workspace for features, tests, failures, fixes, and verification.",
  tagline: "Make every failure legible.",
  supportEmail: "support@example.com",
  urls: {
    app: clientEnv.NEXT_PUBLIC_APP_URL,
    docs: "/docs",
    privacy: "/privacy",
    terms: "/terms",
  },
  assets: {
    logo: "/brand/logo.svg",
    logoMark: "/brand/mark.svg",
    favicon: "/brand/favicon.svg",
  },
  agent: {
    primary: "claude",
    displayName: "Claude Code",
  },
} as const;
