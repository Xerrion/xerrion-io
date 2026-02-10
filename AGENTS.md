# PROJECT KNOWLEDGE BASE

**Generated:** 2026-02-10
**Commit:** 5ed7fdb
**Branch:** master

## OVERVIEW

Personal website for Lasse Skovgaard Nielsen (Xerrion). SvelteKit 5 + TypeScript + Svelte 5 runes, deployed to Cloudflare Workers with Supabase for gallery storage.

## STRUCTURE

```
xerrion-io/
├── src/
│   ├── routes/           # SvelteKit file-based routing
│   │   ├── projects/     # GitHub repos (REST + GraphQL APIs)
│   │   ├── gallery/      # Photo gallery (Supabase Storage)
│   │   └── about/        # Static about page
│   └── lib/
│       ├── components/   # Svelte 5 components (runes syntax)
│       ├── styles/       # CSS variables theming system
│       ├── types/        # TypeScript interfaces
│       └── stores/       # Svelte 5 runes stores
├── wrangler.jsonc        # Cloudflare Workers config
└── .github/workflows/    # release-please automation
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add new page | `src/routes/{slug}/+page.svelte` | Server data: `+page.server.ts` |
| Add component | `src/lib/components/` | Use Svelte 5 runes (`$props`, `$state`) |
| Modify theme | `src/lib/styles/theme.css` | CSS variables, light/dark themes |
| GitHub API | `src/routes/projects/+page.server.ts` | REST + GraphQL for pinned repos |
| Supabase | `src/lib/supabase.ts` | Gallery photos, categories config |
| Types | `src/lib/types/` | `github.ts`, `navigation.ts` |
| Cloudflare config | `wrangler.jsonc` | Custom domains, compatibility flags |

## CONVENTIONS

### Svelte 5 Runes (NOT Svelte 4)
```svelte
// Props
interface Props { repo: ProjectRepo; }
let { repo }: Props = $props();

// State
let count = $state(0);

// NOT: export let repo; (Svelte 4)
```

### CSS Variables Only
All styling uses CSS custom properties from `theme.css`. No Tailwind, no CSS-in-JS.
```css
color: var(--color-primary);
padding: var(--space-4);
border-radius: var(--radius-lg);
```

### Server-Side Data Loading
All external API calls in `+page.server.ts`, never in components.

## ANTI-PATTERNS (THIS PROJECT)

- **NO `export let`** - Use Svelte 5 `$props()` rune
- **NO inline styles** - Use CSS variables
- **NO client-side API calls** - All in `+page.server.ts`
- **NO hardcoded colors** - Use `--color-*` variables

## EXTERNAL SERVICES

| Service | Purpose | Config Location |
|---------|---------|-----------------|
| GitHub API | Projects page | `GITHUB_TOKEN` env var (fine-grained) |
| Supabase | Gallery storage | Hardcoded in `src/lib/supabase.ts` |
| Cloudflare Workers | Hosting | `wrangler.jsonc` |

### GitHub Token Requirements
- Fine-grained PAT with `public_repo` read access
- Required for pinned repos (GraphQL API)
- Set as `GITHUB_TOKEN` in Cloudflare env vars

## COMMANDS

```bash
bun run dev        # Dev server
bun run build      # Build for Cloudflare
bun run check      # Type check
bun run preview    # Preview production build
wrangler deploy    # Deploy to Cloudflare Workers
```

## NOTES

- **No tests** - Testing not configured
- **No linter/prettier** - No config files present
- **Supabase bucket** - Gallery requires `gallery` bucket with `charlie/`, `life/`, `food/`, `places/` folders
- **Custom domains** - `xerrion.io` and `www.xerrion.io` configured in wrangler.jsonc
- **release-please** - Auto-generates releases on push to master
