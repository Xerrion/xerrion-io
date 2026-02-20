# AGENTS.md - Coding Agent Instructions

Personal website for Lasse Skovgaard Nielsen (Xerrion). Built with SvelteKit 2 + Svelte 5 (runes) + TypeScript, deployed to Vercel with Turso (libsql) for database and Vercel Blob for image storage.

## Commands

```bash
bun run dev              # Start dev server (Vite, port 5173)
bun run build            # Production build (Vercel adapter, nodejs22.x)
bun run preview          # Preview production build locally
bun run check            # Svelte type checking (svelte-kit sync + svelte-check)
bun run check:watch      # Type checking in watch mode
bun run test             # Run all Playwright tests
bunx playwright test tests/home.spec.ts        # Run single test file
bunx playwright test tests/home.spec.ts -g "hero"  # Run tests matching pattern
bunx playwright test --ui                     # Run tests with UI mode
bunx playwright test --headed                 # Run tests with browser visible
```

No linter or formatter is configured. CI runs `bun run check` and `bun run build`.

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
│   ├── schemas/          # Zod v4 validation schemas
│   ├── server/           # Server-only code (db.ts, auth.ts, image.ts)
│   ├── stores/           # Svelte 5 rune-based stores (*.svelte.ts)
│   ├── styles/           # CSS variables theming (theme.css)
│   ├── types/            # TypeScript interfaces (github.ts, navigation.ts)
│   └── utils/            # Utility functions
├── hooks.server.ts       # Auth session validation middleware
├── app.d.ts              # SvelteKit type declarations (App.Locals, App.Platform)
└── app.html              # HTML shell (analytics scripts here)
tests/                    # Playwright E2E tests
```

## Code Style

### Svelte 5 Runes

Always use runes. Never use `export let` (Svelte 4 syntax).

```svelte
<script lang="ts">
  import type { SomeType } from '$lib/types';

  // Props: always define interface, then destructure from $props()
  interface Props {
    repo: ProjectRepo;
    optional?: string;
  }
  let { repo, optional = 'default' }: Props = $props();

  // Reactive state
  let count = $state(0);
  let doubled = $derived(count * 2);

  // Side effects
  $effect(() => { /* runs when dependencies change */ });
</script>

{@render children()}
```

### Stores Pattern

Stores use `.svelte.ts` extension with factory functions and getter properties:

```typescript
// toast.svelte.ts
export interface Toast {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

let toasts = $state<Toast[]>([]);

export const toastStore = {
  get items() {
    return toasts;
  },
  add(type: ToastType, message: string, duration = 4000) {
    const id = nextId++;
    toasts.push({ id, type, message });
    if (duration > 0) setTimeout(() => toastStore.dismiss(id), duration);
    return id;
  },
  dismiss(id: number) {
    toasts = toasts.filter((t) => t.id !== id);
  }
};
```

### Imports

Order: SvelteKit/framework → `$lib/` → relative imports. Group with blank lines.

```typescript
// 1. SvelteKit
import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

// 2. $lib
import { getDb } from '$lib/server/db';
import { loginSchema } from '$lib/schemas/admin';

// 3. Relative
import { helper } from './utils';
```

### TypeScript

- Strict mode enabled. Do not weaken strictness.
- Path alias: `$lib` → `src/lib`.
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
- Spacing: `--space-{1..24}`, Typography: `--text-{xs..5xl}`, Radius: `--radius-{sm..full}`.
- Use scoped `<style>` blocks in every component.
- Support `prefers-reduced-motion` for animations.

### Server-Side Data Loading

All external API calls and database queries go in `+page.server.ts` or `+server.ts`, never in components. Use SvelteKit's `fetch` from the load function for external APIs.

```typescript
export const load: PageServerLoad = async ({ fetch }) => {
  try {
    const response = await fetch('https://api.example.com/data');
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    console.error('Failed to fetch:', error);
    return { data: [], error: 'Failed to load data' };
  }
};
```

### Forms

- Use `sveltekit-superforms` with the `zod4` adapter (server) and `zod4Client` (client).
- Schemas defined in `src/lib/schemas/` using `import { z } from 'zod/v4'`.
- UI bindings via `formsnap`.

```typescript
// schema
import { z } from 'zod/v4';
export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required').trim(),
  password: z.string().min(1, 'Password is required')
});

// +page.server.ts
import { superValidate, setError } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';

export const load: PageServerLoad = async () => {
  return { form: await superValidate(zod4(loginSchema)) };
};
```

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
- **NO co-authored commits** — No `Co-authored-by` lines.

## Environment Variables

```bash
# Database (Turso)
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=

# Blob Storage (Vercel)
BLOB_READ_WRITE_TOKEN=

# GitHub API (for projects page)
GITHUB_TOKEN=

# Analytics (public - use PUBLIC_ prefix)
PUBLIC_UMAMI_WEBSITE_ID=
PUBLIC_GA_MEASUREMENT_ID=
```

Use `$env/dynamic/private` for server-side env vars, `$env/dynamic/public` for client-side (PUBLIC_ prefix).

## External Services

| Service     | Purpose           | Config                                    |
| ----------- | ----------------- | ----------------------------------------- |
| Vercel      | Hosting + deploy  | `@sveltejs/adapter-vercel`, nodejs22.x    |
| Turso       | Database (libsql) | `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`  |
| Vercel Blob | Image storage     | `BLOB_READ_WRITE_TOKEN`                   |
| GitHub API  | Projects page     | `GITHUB_TOKEN` (fine-grained PAT)         |
| Umami       | Analytics         | `PUBLIC_UMAMI_WEBSITE_ID` (Umami Cloud)   |
| Google      | Analytics         | `PUBLIC_GA_MEASUREMENT_ID` (GA4)          |

## Git Workflow

- **NEVER work on master** — Always create feature branches.
- **Conventional commits** — `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, etc.
- **Small commits** — Atomic, focused changes.
- **release-please** automates releases on push to master.

## Testing

- **ALWAYS test changes with Playwright** before considering a task complete.
- **ALWAYS check browser console output** during Playwright runs and fix any errors/warnings.
- When testing animations, capture and validate intermediate keyframes/state transitions.
- Run `bunx playwright test <file>` to run a single test file.
- Test files are in `tests/` directory with `.spec.ts` extension.
