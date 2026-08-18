"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { toast } from "@/components/ui/toast";
import { evidenceConfig, isAllowedEvidenceType } from "@/config/evidence.config";
import type { TestEvidence } from "@/types/domain";

export type EvidenceUploadButtonProps = {
  evidence: readonly TestEvidence[];
  onAdd: (items: TestEvidence[]) => void;
  disabled?: boolean;
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Couldn't read file."));
    reader.readAsDataURL(file);
  });
}

/**
 * The write side of `EvidenceGallery` — reads chosen files client-side into
 * data URLs (this mock environment has no object storage — see
 * `TestEvidence`) and validates each against `evidence.config.ts` before
 * handing accepted items to the caller. The runner re-validates server-side
 * too (`submitTestResultSchema`); this is the fast, accessible-feedback path
 * (03-CLAUDE-RULES.md, "Validate evidence file type, size, and access").
 */
export function EvidenceUploadButton({ evidence, onAdd, disabled }: EvidenceUploadButtonProps) {
  const inputId = React.useId();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isReading, setIsReading] = React.useState(false);
  const atLimit = evidence.length >= evidenceConfig.maxFilesPerResult;

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    const remainingSlots = evidenceConfig.maxFilesPerResult - evidence.length;

    if (remainingSlots <= 0) {
      toast({ title: `Up to ${evidenceConfig.maxFilesPerResult} files per result`, variant: "fail" });
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setIsReading(true);
    const accepted: TestEvidence[] = [];
    for (const file of files.slice(0, remainingSlots)) {
      if (!isAllowedEvidenceType(file.type)) {
        toast({ title: `${file.name} isn't a supported file type`, variant: "fail" });
        continue;
      }
      if (file.size > evidenceConfig.maxFileSizeBytes) {
        toast({
          title: `${file.name} is larger than ${Math.round(evidenceConfig.maxFileSizeBytes / (1024 * 1024))} MB`,
          variant: "fail",
        });
        continue;
      }
      try {
        const dataUrl = await readFileAsDataUrl(file);
        accepted.push({ id: crypto.randomUUID(), name: file.name, type: file.type, size: file.size, dataUrl });
      } catch {
        toast({ title: `Couldn't read ${file.name}`, variant: "fail" });
      }
    }
    setIsReading(false);
    if (accepted.length > 0) onAdd(accepted);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={evidenceConfig.allowedMimeTypes.join(",")}
        multiple
        className="sr-only"
        onChange={(event) => handleFiles(event.target.files)}
        disabled={disabled || isReading || atLimit}
      />
      <Button
        type="button"
        intent="secondary"
        size="sm"
        disabled={disabled || isReading || atLimit}
        onClick={() => inputRef.current?.click()}
      >
        <Icon name={isReading ? "spinner" : "upload"} size={14} className={isReading ? "animate-spin" : undefined} />
        <span>{atLimit ? "Evidence limit reached" : isReading ? "Reading…" : "Add evidence"}</span>
      </Button>
    </div>
  );
}
