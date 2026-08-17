import type { Metadata } from "next";
import Link from "next/link";

import { Icon } from "@/components/ui/icon";
import { CreateProjectWizard } from "@/features/projects/components/create-project-wizard";

export const metadata: Metadata = { title: "Create project" };

export default function NewProjectPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-10 sm:px-8 sm:py-12">
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 text-body-sm text-foreground-muted hover:text-foreground"
      >
        <Icon name="chevronLeft" size={14} />
        Projects
      </Link>

      <div className="flex flex-col gap-2">
        <p className="text-eyebrow-style text-foreground-muted">New project</p>
        <h1 className="font-serif text-display-md text-foreground">Add a project</h1>
        <p className="text-body-lg text-foreground-secondary">
          Two short steps — you can refine everything later from project settings.
        </p>
      </div>

      <CreateProjectWizard />
    </div>
  );
}
