"use client";

import { useActionState, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  toggleProjectArchivedAction,
  updateProjectAction,
  type UpdateProjectValues,
} from "@/features/projects/actions";
import { projectEnvironments } from "@/features/projects/schemas";
import { idleState } from "@/lib/forms/action-state";
import { projectEnvironmentLabel } from "@/lib/format/project-environment";
import type { Project } from "@/types/domain";

export type ProjectSettingsFormProps = {
  project: Project;
};

export function ProjectSettingsForm({ project }: ProjectSettingsFormProps) {
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);

  const initialValues: UpdateProjectValues = {
    slug: project.slug,
    name: project.name,
    description: project.description,
    appUrl: project.appUrl,
    environment: project.environment,
    repository: project.repository ?? "",
  };

  const [state, formAction, isPending] = useActionState(updateProjectAction, idleState<UpdateProjectValues>());

  const values = state.values ?? initialValues;
  const errors = state.fieldErrors ?? {};

  return (
    <div className="flex flex-col gap-10 max-w-3xl">
      {/* General Settings Form */}
      <form action={formAction} className="flex flex-col gap-6 rounded-lg border border-subtle bg-surface p-6">
        <div className="flex items-center justify-between border-b border-subtle pb-4">
          <div>
            <h2 className="text-title-md text-foreground">Project Details</h2>
            <p className="text-body-sm text-foreground-muted">
              Configure the project name, target application URL, and repository context.
            </p>
          </div>
          <span className="text-mono-sm text-foreground-muted font-semibold">{project.publicId}</span>
        </div>

        {state.formError && (
          <div className="rounded-md border border-fail/30 bg-fail/10 p-3 text-body-sm text-fail">
            {state.formError}
          </div>
        )}

        {state.status === "success" && (
          <div className="rounded-md border border-pass/30 bg-pass/10 p-3 text-body-sm text-pass flex items-center gap-2">
            <Icon name="check" size={16} />
            <span>Project settings saved successfully.</span>
          </div>
        )}

        <input type="hidden" name="slug" value={project.slug} />

        <div className="flex flex-col gap-4">
          {/* Project Name */}
          <Input
            id="name"
            name="name"
            label="Project Name"
            defaultValue={values.name}
            error={errors.name?.[0]}
            placeholder="e.g. LinkVault"
            required
          />

          {/* Description */}
          <Textarea
            id="description"
            name="description"
            label="Description"
            defaultValue={values.description}
            error={errors.description?.[0]}
            placeholder="Describe what this application does and its QA scope..."
            rows={3}
            required
          />

          {/* Application URL */}
          <Input
            id="appUrl"
            name="appUrl"
            label="Application URL"
            type="url"
            defaultValue={values.appUrl}
            error={errors.appUrl?.[0]}
            placeholder="https://app.example.com"
            description="The web application URL being tested."
            required
          />

          {/* Environment */}
          <Select
            id="environment"
            name="environment"
            label="Default Environment"
            defaultValue={values.environment}
            error={errors.environment?.[0]}
            options={projectEnvironments.map((env) => ({
              value: env,
              label: projectEnvironmentLabel[env],
            }))}
            required
          />

          {/* Repository / Local Path */}
          <Input
            id="repository"
            name="repository"
            label="Repository / Local Path (Optional)"
            defaultValue={values.repository}
            error={errors.repository?.[0]}
            placeholder="github.com/org/repo or /path/to/workspace"
            description="Used by Claude to locate source code during feature discovery."
          />
        </div>

        <div className="flex justify-end pt-4 border-t border-subtle">
          <Button type="submit" intent="primary" disabled={isPending}>
            {isPending ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </form>

      {/* Danger Zone: Archive / Unarchive */}
      <div className="flex flex-col gap-4 rounded-lg border border-fail/20 bg-surface p-6">
        <div className="border-b border-subtle pb-4">
          <h2 className="text-title-md text-foreground">Danger Zone</h2>
          <p className="text-body-sm text-foreground-muted">
            {project.archived
              ? "This project is currently archived. Unarchiving will return it to active views."
              : "Archiving will hide this project from active navigation and default workspace views."}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Badge tone={project.archived ? "blocked" : "pass"} icon={project.archived ? "archived" : "approved"}>
              {project.archived ? "Archived" : "Active"}
            </Badge>
            <span className="text-body-sm text-foreground-secondary">
              {project.archived ? "Project is in read-only archive" : "Project is actively receiving QA updates"}
            </span>
          </div>

          <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button intent="secondary" className={project.archived ? "" : "text-fail hover:border-fail"}>
                <Icon name={project.archived ? "changed" : "archived"} size={16} />
                <span>{project.archived ? "Unarchive project" : "Archive project"}</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent
              title={project.archived ? "Unarchive this project?" : "Archive this project?"}
              description={
                project.archived
                  ? `Are you sure you want to restore "${project.name}"? It will appear in active project lists again.`
                  : `Are you sure you want to archive "${project.name}"? It will be moved to the archived view and hidden from default navigation.`
              }
            >
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <form action={toggleProjectArchivedAction}>
                  <input type="hidden" name="slug" value={project.slug} />
                  <AlertDialogAction type="submit">
                    {project.archived ? "Restore project" : "Confirm archive"}
                  </AlertDialogAction>
                </form>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
