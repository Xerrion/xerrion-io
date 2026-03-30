/**
 * Converts a string to a URL-safe slug.
 * Lowercases, replaces non-alphanumeric sequences with hyphens,
 * and strips leading/trailing hyphens.
 */
export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-|-$/g, '')
}
