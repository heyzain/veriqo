/**
 * Timestamps are stored in UTC and rendered in the user's locale
 * (03-CLAUDE-RULES.md, "Data and server boundaries"). There's no
 * account-level locale/timezone preference yet (arrives with account
 * settings) — `en-US` is a fixed interim rather than the runtime's default
 * locale, which would differ between server and client and risk a
 * hydration mismatch.
 */
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}
