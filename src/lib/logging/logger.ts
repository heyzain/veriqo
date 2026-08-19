import "server-only";

/**
 * Minimal structured logger (Phase 10, "Structured logs and error
 * monitoring"). Writes one JSON line per event to stdout/stderr — the
 * format most log aggregators (and every deployment platform's built-in log
 * viewer) already parse without extra configuration. `MONITORING_DSN`
 * (`lib/env/schema.ts`) is the typed hook point for forwarding `error()`
 * calls to a real provider (Sentry or similar) later; until that's wired
 * up, these lines *are* the error monitoring.
 *
 * Never pass secrets, full API keys, or passwords in `context` — this is
 * the same "never log secrets" rule as everywhere else
 * (03-CLAUDE-RULES.md, "Never log secrets or complete API keys").
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogContext = Record<string, unknown>;

function emit(level: LogLevel, message: string, context?: LogContext): void {
  const entry = {
    level,
    message,
    time: new Date().toISOString(),
    ...(context ? { context } : {}),
  };
  const line = JSON.stringify(entry);

  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (message: string, context?: LogContext) => emit("debug", message, context),
  info: (message: string, context?: LogContext) => emit("info", message, context),
  warn: (message: string, context?: LogContext) => emit("warn", message, context),
  error: (message: string, context?: LogContext) => emit("error", message, context),
};
