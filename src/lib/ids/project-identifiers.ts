/**
 * Derives the URL-safe slug and short display code used for projects
 * (04-CONFIG-BLUEPRINT.md, "Public IDs" — internal `id`s stay out of the UI
 * and routes). Both take a set of identifiers already in use so callers can
 * disambiguate collisions deterministically.
 */
export function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function uniqueProjectSlug(name: string, existingSlugs: ReadonlySet<string>): string {
  const base = slugify(name) || "project";
  if (!existingSlugs.has(base)) return base;

  let suffix = 2;
  while (existingSlugs.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

export function uniqueProjectCode(name: string, existingCodes: ReadonlySet<string>): string {
  const letters = name.toUpperCase().replace(/[^A-Z]/g, "");
  const base = (letters.slice(0, 4) || "PROJ").padEnd(4, "X");
  if (!existingCodes.has(base)) return base;

  let suffix = 2;
  while (existingCodes.has(`${base.slice(0, 3)}${suffix}`)) suffix += 1;
  return `${base.slice(0, 3)}${suffix}`;
}
