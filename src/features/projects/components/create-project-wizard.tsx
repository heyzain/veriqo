"use client";

import * as React from "react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { createProjectAction, type CreateProjectValues } from "@/features/projects/actions";
import { projectEnvironments } from "@/features/projects/schemas";
import { idleState } from "@/lib/forms/action-state";
import { projectEnvironmentLabel } from "@/lib/format/project-environment";

const environmentOptions = projectEnvironments.map((value) => ({
  value,
  label: projectEnvironmentLabel[value],
}));

const steps = [
  { step: 1, label: "Project basics" },
  { step: 2, label: "Application details" },
] as const;

/**
 * Focused, progressive create-project flow (00-PRODUCT.md, "The user signs
 * up, creates a workspace, and adds a project with its application URL,
 * project description, environment, and repository/local-path context.").
 * Both steps live in one `<form>` bound to `createProjectAction` — step 1's
 * fields stay mounted (just visually hidden) while step 2 is shown, so
 * nothing is lost and one submit carries every field.
 */
export function CreateProjectWizard() {
  const [state, formAction, isPending] = useActionState(
    createProjectAction,
    idleState<CreateProjectValues>(),
  );
  const [step, setStep] = React.useState<1 | 2>(1);
  const [basics, setBasics] = React.useState({
    name: state.values?.name ?? "",
    description: state.values?.description ?? "",
  });
  const [stepOneError, setStepOneError] = React.useState<string | null>(null);

  // A field error on step 1's fields (returned after a failed final submit)
  // means the user needs to see step 1 again, even if they'd moved on. This
  // adjusts state during render in response to a changed prop/action
  // result — React's documented alternative to an effect for this case
  // (react.dev, "You Might Not Need an Effect").
  const [handledFieldErrors, setHandledFieldErrors] = React.useState(state.fieldErrors);
  if (state.fieldErrors !== handledFieldErrors) {
    setHandledFieldErrors(state.fieldErrors);
    if (state.fieldErrors?.name || state.fieldErrors?.description) setStep(1);
  }

  return (
    <form action={formAction} noValidate className="flex flex-col gap-6">
      <ol className="flex items-center gap-3">
        {steps.map(({ step: s, label }) => (
          <li key={s} className="flex items-center gap-2">
            <span
              className={
                "flex size-6 items-center justify-center rounded-pill text-label-style " +
                (s === step
                  ? "bg-action text-foreground-on-dark"
                  : s < step
                    ? "bg-pass/15 text-pass"
                    : "bg-inset text-foreground-muted")
              }
            >
              {s < step ? <Icon name="check" size={13} /> : s}
            </span>
            <span
              className={
                "text-body-sm " + (s === step ? "text-foreground" : "text-foreground-muted")
              }
            >
              {label}
            </span>
          </li>
        ))}
      </ol>

      {state.formError ? (
        <p role="alert" className="rounded-sm border border-fail/30 bg-fail/10 px-3.5 py-2.5 text-body-sm text-fail">
          {state.formError}
        </p>
      ) : null}

      <div className={step === 1 ? "flex flex-col gap-5" : "hidden"}>
        <Input
          label="Project name"
          name="name"
          required
          value={basics.name}
          onChange={(e) => setBasics((b) => ({ ...b, name: e.target.value }))}
          error={state.fieldErrors?.name}
          description="What you'll call it in Veriqo — you can change this later."
        />
        <Textarea
          label="Description"
          name="description"
          required
          value={basics.description}
          onChange={(e) => setBasics((b) => ({ ...b, description: e.target.value }))}
          error={state.fieldErrors?.description}
          description="A sentence or two on what this product does."
        />
        {stepOneError ? (
          <p role="alert" className="text-body-sm text-fail">
            {stepOneError}
          </p>
        ) : null}
        <Button
          type="button"
          size="lg"
          className="self-start"
          onClick={() => {
            if (basics.name.trim().length < 2) {
              setStepOneError("Give the project a name.");
              return;
            }
            if (basics.description.trim().length < 10) {
              setStepOneError("Add a sentence describing what this project does.");
              return;
            }
            setStepOneError(null);
            setStep(2);
          }}
        >
          Continue
        </Button>
      </div>

      <div className={step === 2 ? "flex flex-col gap-5" : "hidden"}>
        <Input
          label="Application URL"
          name="appUrl"
          type="url"
          required
          placeholder="https://staging.example.com"
          defaultValue={state.values?.appUrl}
          error={state.fieldErrors?.appUrl}
        />
        <Select
          label="Environment"
          name="environment"
          options={environmentOptions}
          defaultValue={state.values?.environment || "staging"}
          error={state.fieldErrors?.environment}
        />
        <Input
          label="Repository or local path"
          name="repository"
          placeholder="github.com/you/project or /Users/you/code/project"
          description="Optional — helps Claude find the codebase when you connect it."
          defaultValue={state.values?.repository}
          error={state.fieldErrors?.repository}
        />

        <div className="flex items-center gap-3">
          <Button type="button" intent="secondary" size="lg" onClick={() => setStep(1)}>
            Back
          </Button>
          <Button type="submit" size="lg" loading={isPending}>
            Create project
          </Button>
        </div>
      </div>
    </form>
  );
}
