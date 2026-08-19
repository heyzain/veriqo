import type { Metadata } from "next";
import Link from "next/link";

import { productConfig } from "@/config/product.config";
import { formatDate } from "@/lib/format/date";

export const metadata: Metadata = { title: "Terms of Service" };

const EFFECTIVE_DATE = "2026-08-18T00:00:00.000Z";

export default function TermsPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-6 py-16 sm:px-8">
      <div className="flex flex-col gap-1">
        <Link href="/" className="w-fit text-body-sm text-foreground-muted hover:text-foreground hover:underline">
          ← {productConfig.name}
        </Link>
        <h1 className="text-title-xl font-serif text-foreground">Terms of Service</h1>
        <p className="text-body-sm text-foreground-muted">Effective {formatDate(EFFECTIVE_DATE)}</p>
      </div>

      <div className="flex flex-col gap-6 text-body text-foreground-secondary">
        <p className="rounded-md border border-partial/30 bg-partial/10 p-4 text-body-sm text-foreground">
          This is a minimal, plain-language placeholder for launch readiness — replace it with real terms reviewed
          by counsel before a paid or public launch.
        </p>

        <section className="flex flex-col gap-2">
          <h2 className="text-title-md text-foreground">The service</h2>
          <p>
            {productConfig.name} is a QA workspace that connects to Claude over MCP to help discover features,
            generate and run tests, and track issues through to a verified fix. It is provided during an early,
            evolving MVP period — features and behavior may change.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-title-md text-foreground">Your account</h2>
          <p>
            You&apos;re responsible for what happens under your account and Claude MCP credentials, and for keeping
            your password confidential. Don&apos;t share a project&apos;s MCP credential outside contexts you trust.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-title-md text-foreground">Claude-generated content</h2>
          <p>
            Features, test cases, and fix notes Claude submits are clearly labeled and always reviewable — nothing
            Claude generates is treated as approved or verified until a human (or, for a rerun, an applicable
            passing result) confirms it.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-title-md text-foreground">No warranty</h2>
          <p>
            The service is provided &ldquo;as is,&rdquo; without warranty of any kind, during this MVP period.
            Release-confidence scores and analytics are explanations of your own recorded data, not a guarantee
            about your product&apos;s quality.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-title-md text-foreground">Ending your account</h2>
          <p>
            You may delete your account at any time from{" "}
            <Link href="/account" className="text-action underline">
              Account settings
            </Link>
            , which permanently removes it and every project it owns.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-title-md text-foreground">Questions</h2>
          <p>
            Email{" "}
            <a href={`mailto:${productConfig.supportEmail}`} className="text-action underline">
              {productConfig.supportEmail}
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
