# Xerrion.io

Personal website for Lasse Skovgaard Nielsen (Xerrion).

## Tech Stack

- **Framework**: SvelteKit with Svelte 5
- **Styling**: Pure CSS with CSS Variables
- **Runtime**: Bun
- **Hosting**: Cloudflare Pages
- **Storage**: Supabase (for gallery photos)

## Development

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Type check
bun run check

# Build for production
bun run build

# Preview production build
bun run preview
```

## Deployment

This site is deployed to Cloudflare Pages. Pushes to `main` trigger automatic deployments.

### Manual deployment

```bash
bun run build
npx wrangler pages deploy .svelte-kit/cloudflare
```

## Project Structure

```
src/
├── routes/           # SvelteKit routes
│   ├── +layout.svelte
│   ├── +page.svelte      # Home
│   ├── about/            # About page
│   ├── projects/         # GitHub projects
│   └── gallery/          # Photo gallery (Supabase)
├── lib/
│   ├── components/   # Reusable components
│   ├── stores/       # Svelte stores
│   ├── styles/       # Global styles and theme
│   ├── types/        # TypeScript types
│   └── supabase.ts   # Supabase client
└── static/           # Static assets
```

## Gallery Setup

Photos are stored in Supabase Storage. Create a public bucket named `gallery` with folders:
- `charlie/` - Dog photos
- `life/` - Random moments
- `food/` - Food pics
- `places/` - Travel/location photos

Configure categories in `src/lib/supabase.ts`.
