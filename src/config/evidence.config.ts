/**
 * Upload constraints for test-result evidence (04-CONFIG-BLUEPRINT.md,
 * "Upload constraints" — centralized rather than scattered through upload
 * components; 03-CLAUDE-RULES.md, "Validate evidence file type, size, and
 * access"). The runner (client) and `test-run-service` (server) both
 * validate against this same config.
 */
export const evidenceConfig = {
  maxFileSizeBytes: 5 * 1024 * 1024,
  maxFilesPerResult: 4,
  allowedMimeTypes: [
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif",
    "application/pdf",
    "text/plain",
  ],
} as const;

export function isAllowedEvidenceType(type: string): boolean {
  return (evidenceConfig.allowedMimeTypes as readonly string[]).includes(type);
}

export function isImageEvidenceType(type: string): boolean {
  return type.startsWith("image/");
}

export function formatEvidenceSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
