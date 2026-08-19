import type { Metadata } from "next";
import Link from "next/link";

import { productConfig } from "@/config/product.config";
import { formatDate } from "@/lib/format/date";

export const metadata: Metadata = { title: "Privacy Policy" };

const EFFECTIVE_DATE = "2026-08-18T00:00:00.000Z";

export default function PrivacyPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-6 py-16 sm:px-8">
      <div className="flex flex-col gap-1">
        <Link href="/" className="w-fit text-body-sm text-foreground-muted hover:text-foreground hover:underline">
          ← {productConfig.name}
        </Link>
        <h1 className="text-title-xl font-serif text-foreground">Privacy Policy</h1>
        <p className="text-body-sm text-foreground-muted">Effective {formatDate(EFFECTIVE_DATE)}</p>
      </div>

      <div className="flex flex-col gap-6 text-body text-foreground-secondary">
        <p className="rounded-md border border-partial/30 bg-partial/10 p-4 text-body-sm text-foreground">
          This is a minimal, plain-language placeholder for launch readiness — it describes what {productConfig.name}
          {" "}actually stores today, not a substitute for review by counsel before a real launch.
        </p>

        <section className="flex flex-col gap-2">
          <h2 className="text-title-md text-foreground">What we store</h2>
          <p>
            Your account (name, email, hashed password), the projects you create, and every record connected to
            them — features, test cases, test runs, results, issues, and the activity ledger. Evidence you attach to
            a test result is stored as part of that result.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-title-md text-foreground">Claude MCP access</h2>
          <p>
            A project-scoped credential lets a connected Claude client read and write that project&apos;s QA
            records on your behalf. Credentials are hashed at rest, scoped to one project, and revocable at any
            time from that project&apos;s Claude MCP settings.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-title-md text-foreground">What we don&apos;t do</h2>
          <p>
            We don&apos;t sell your data, and we don&apos;t use your project content to train models. We don&apos;t
            share data across accounts or projects — every record is scoped to the account that owns it.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-title-md text-foreground">Your data, your control</h2>
          <p>
            Export everything you own as a JSON file, or permanently delete your account and every project it
            owns, from{" "}
            <Link href="/account" className="text-action underline">
              Account settings
            </Link>
            .
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
