# AGENTS.md - Coding Agent Instructions

Personal website for Lasse Skovgaard Nielsen (Xerrion). Built with SvelteKit 2 + Svelte 5 (runes) + TypeScript, deployed to Vercel with Turso (libsql) for database and Vercel Blob for image storage.

## Commands

```bash
bun run dev          # Start dev server (Vite)
bun run build        # Production build (Vercel adapter, nodejs22.x)
bun run preview      # Preview production build locally
bun run check        # Svelte type checking (svelte-kit sync + svelte-check)
bun run check:watch  # Type checking in watch mode
```

There is no linter, formatter, or test runner configured. CI runs `bun run check` and `bun run build`.

## Project Structure

```
src/
├── routes/
│   ├── (public)/         # Public pages (home, about, projects, gallery)
│   ├── admin/            # Admin panel (login, dashboard, gallery CRUD, upload)
│   ├── api/              # API endpoints
│   └── sitemap.xml/      # Dynamic sitemap
├── lib/
│   ├── components/       # Svelte 5 components (runes syntax)
│   ├── config/           # App configuration
│   ├── schemas/          # Zod v4 validation schemas
│   ├── server/           # Server-only code (db.ts, auth.ts, image.ts)
│   ├── stores/           # Svelte 5 rune-based stores (*.svelte.ts)
│   ├── styles/           # CSS variables theming (theme.css)
│   ├── types/            # TypeScript interfaces (github.ts, navigation.ts)
│   └── utils/            # Utility functions
├── hooks.server.ts       # Auth session validation middleware
├── app.d.ts              # SvelteKit type declarations (App.Locals, App.Platform)
└── app.html              # HTML shell
```

## Code Style

### Svelte 5 Runes (NOT Svelte 4)

Always use runes. Never use `export let` (Svelte 4 syntax).

```svelte
<script lang="ts">
  // Props: always define interface, then destructure from $props()
  interface Props {
    repo: ProjectRepo;
    optional?: string;
  }
  let { repo, optional = 'default' }: Props = $props();

  // Reactive state
  let count = $state(0);
  let doubled = $derived(count * 2);
  let complex = $derived.by(() => { /* ... */ });

  // Side effects
  $effect(() => { /* runs when dependencies change */ });
</script>

<!-- Render children -->
{@render children()}
```

### Stores Pattern

Stores use `.svelte.ts` extension with factory functions and getter properties:

```typescript
function createMyStore() {
  let value = $state(initialValue);
  return {
    get current() {
      return value;
    },
    set(v) {
      value = v;
    },
  };
}
export const myStore = createMyStore();
```

### Imports

Order: SvelteKit/framework → `$lib/` → relative imports.

```typescript
// 1. SvelteKit
import { env } from "$env/dynamic/private";
import type { PageServerLoad } from "./$types";
// 2. $lib
import type { ProjectRepo } from "$lib/types/github";
import { getDb } from "$lib/server/db";
// 3. Relative
import { helper } from "./utils";
```

### TypeScript

- Strict mode enabled. Do not weaken strictness.
- Path alias: `$lib` → `src/lib` (standard SvelteKit alias).
- Use `interface` for component props and object shapes.
- Use `type` for unions, intersections, and utility types.
- Always type function parameters and return types for public APIs.

### Naming Conventions

| Thing           | Convention | Example                     |
| --------------- | ---------- | --------------------------- |
| Components      | PascalCase | `ProjectCard.svelte`        |
| Files/routes    | kebab-case | `+page.server.ts`           |
| Variables/funcs | camelCase  | `fetchPinnedRepoNames`      |
| CSS classes     | kebab-case | `.card-header`, `.nav-card` |
| DB columns      | snake_case | `created_at`, `blob_path`   |
| Store files     | camelCase  | `theme.svelte.ts`           |
| Schemas         | camelCase  | `loginSchema`               |

### CSS / Styling

- All styling uses CSS custom properties from `src/lib/styles/theme.css`. No Tailwind, no CSS-in-JS, no inline styles.
- Colors use oklch color space. Reference only `--color-*` variables.
- Light/dark themes via `[data-theme="dark"]` selector on `:root`.
- Spacing: `--space-{1..16}`, Typography: `--text-{xs..4xl}`, Radius: `--radius-{sm..full}`.
- Use scoped `<style>` blocks in every component.
- Support `prefers-reduced-motion` for animations.

### Server-Side Data Loading

All external API calls and database queries go in `+page.server.ts` or `+server.ts`, never in components. Use SvelteKit's `fetch` from the load function for external APIs.

### Forms

- Use `sveltekit-superforms` with the `zod4` adapter (server) and `zod4Client` (client).
- Schemas defined in `src/lib/schemas/` using `import { z } from 'zod/v4'`.
- UI bindings via `formsnap`.

### Error Handling

- Wrap external calls in try/catch with `console.error` for logging.
- Return graceful fallbacks (e.g., `{ projects: [], error: 'Failed to load' }`).
- Throw meaningful errors with descriptive messages for missing env vars.
- Validate environment variables at the point of use, not globally.

### Accessibility

- Include skip-links, aria-labels, `aria-expanded`, `role="dialog"`, `aria-live="polite"`.
- Support `prefers-reduced-motion` in animations.

## Anti-Patterns (Do NOT Do)

- **NO `export let`** — Use `$props()` rune exclusively.
- **NO inline styles** — Use CSS custom properties.
- **NO hardcoded colors** — Use `--color-*` variables from theme.
- **NO client-side API calls** — All data fetching in `+page.server.ts`.
- **NO Tailwind/CSS-in-JS** — Scoped `<style>` with CSS variables only.

## External Services

| Service     | Purpose           | Config / Access                          |
| ----------- | ----------------- | ---------------------------------------- |
| Vercel      | Hosting + deploy  | `@sveltejs/adapter-vercel`, nodejs22.x   |
| Turso       | Database (libsql) | `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` |
| Vercel Blob | Image storage     | `BLOB_READ_WRITE_TOKEN`                  |
| GitHub API  | Projects page     | `GITHUB_TOKEN` (fine-grained PAT)        |

## Git Workflow

- **NEVER work on master** — Always create feature branches.
- **NEVER co-author commits** — No `Co-authored-by` lines.
- **Conventional commits** — `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, etc.
- **Small commits** — Atomic, focused changes.
- **release-please** automates releases on push to master.

## Testing

- **ALWAYS test changes with Playwright** before considering a task complete.
- **ALWAYS check browser console output** during Playwright runs and fix any errors/warnings.
- When testing animations, **capture and validate intermediate keyframes/state transitions** (not only animation start/end).
- If Playwright cannot be run, clearly state why and what alternative validation was performed.
- No test framework is currently configured (no vitest/jest/playwright config files).
- CI runs type checking (`bun run check`) and build (`bun run build`) only.
