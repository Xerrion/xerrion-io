# Xerrion.io

Personal website for Lasse Skovgaard Nielsen (Xerrion).

## Tools and experiments

The Tools navigation opens `/tools`, which links to the image converter and Flux
Water. Each tool has its own route and shares the public site's design.

### Flux Water

`/tools/flux-water` integrates the water simulation from the supplied
`flux-water-full-package.zip`. The original WGSL shaders are preserved in
`src/lib/experiments/flux-water/shaders.ts`. The engine and controls are adapted
to Svelte with no additional dependencies, remote fonts, or embedded site.
The archive's deployment files and scripts are not needed by this application.

Drag to stir the water, make waves, switch materials and lighting, or save a PNG.
Water behavior and quality controls are under Water behavior & quality. Keyboard
shortcuts apply only while the water canvas has focus: Space pauses, B creates
waves, and R resets. Reduced motion starts paused. Rendering stops when paused,
off screen, or in a hidden tab. Navigation releases observers, animation frames,
the canvas context, and GPU resources.

The wave solver advances in fixed 1/120-second steps, carrying fractional time
between rendered frames. Changing the step size with each frame can amplify
grid-scale waves even when each individual step is below the CFL limit.

WebGPU and a compatible graphics adapter are required. Unavailable or lost devices
show an explanation and a retry button. Resolution adapts toward a 60 FPS target;
this is not a hardware-independent performance guarantee. The rendering uses a
height-field water surface with refraction, reflection and approximate caustics.

### Image converter

The public image tool is available at `/tools/images` through the Tools index.
It converts JPEG, PNG, WebP, AVIF, and BMP inputs to browser-supported WebP,
JPEG, or PNG outputs. It runs locally in the browser without uploading images or
requiring a database, storage service, or additional dependencies.

Choose a Web, Email, or PNG preset, then adjust quality or set a file-size target.
The main screen keeps file format, quality, and common image sizes visible.
The primary download appears above these controls once a file is ready. Custom
dimensions, target file size, crop, rotation, and background controls are under
More options. There is no separate scroll area inside the settings panel.
The preview and size estimates update automatically after 250 milliseconds of
inactivity. Settings apply to the whole batch, with the selected image processed
first. New edits cancel outdated work and prevent outdated downloads. Encoding
runs in a worker where supported, with a main-thread fallback for other browsers.

Resize by longest edge, width and height bounds, or percentage. Resizing preserves
proportions and never enlarges an image. Crop to common aspect ratios from the
center, rotate in 90-degree steps, and flip horizontally or vertically. Compare
the result before downloading individual files or a ZIP archive. The comparison
position stays in place as the image updates.

For WebP and JPEG, an optional size target searches for the highest quality up to
the chosen quality setting. If even the lowest quality exceeds the target, the
tool reports this and offers the smallest result it found. PNG remains lossless.

Batches accept up to 20 images, 25 MB per file, and 100 MB of input in total.
Images over 40 megapixels are rejected after decoding. Exports are still images;
animation and original EXIF metadata are discarded. JPEG transparency becomes
white or black, depending on the selected background. Available export formats
depend on the browser's actual encoding support.

Run the converter browser checks with:

```bash
bun run test:e2e tests/e2e/image-converter.spec.ts
```

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

Type checks use TypeScript 7 through `svelte-check`'s `tsgo` backend.
The `@typescript/native` dependency provides the TypeScript 7 compiler.
The `typescript` dependency uses Microsoft's TypeScript 6 compatibility package
because SvelteKit and Svelte tooling still need its JavaScript API.
Both `bun run check` and `bun run check:watch` use the native compiler.
Incremental mode tracks generated files and removes them when their Svelte source
files are deleted.
Run `bunx --no-install tsc --version` to check the installed compiler version.
See the [Svelte checker documentation](https://github.com/sveltejs/language-tools/blob/svelte-check%404.7.6/packages/svelte-check/README.md)
for the native backend's limitations.

## Deployment

This site is deployed to Cloudflare Pages. Pushes to `main` trigger automatic deployments.

### Manual deployment

```bash
bun run build
npx wrangler pages deploy .svelte-kit/cloudflare
```

## Project Structure

```text
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

## Pocket ID admin login

Create a confidential OIDC client in Pocket ID with PKCE enabled. Register the
exact callback `https://xerrion.io/auth/pocket-id/callback` and launch URL
`https://xerrion.io/admin`. Keep the client restricted to a dedicated admin group.
Enable Requires Re-Authentication on the Pocket ID client.

Set these runtime environment variables in the deployment secret manager:

| Variable | Value |
| --- | --- |
| `POCKET_ID_ISSUER` | `https://auth.xerrion.io` |
| `POCKET_ID_CLIENT_ID` | The client ID from Pocket ID |
| `POCKET_ID_CLIENT_SECRET` | The client secret from Pocket ID |
| `POCKET_ID_REDIRECT_URI` | The exact registered callback URL |
| `POCKET_ID_ADMIN_SUBJECTS` | Comma-separated Pocket ID user IDs allowed to administer the site |

User IDs are the stable UUIDs in Pocket ID user detail URLs. Do not use email
addresses or usernames as the allowlist. Never commit the client secret. Docker
Compose forwards these values to the app at runtime; build jobs do not need them.

The login uses authorization code flow, PKCE, state, nonce, and signed ID tokens.
Login attempts expire after 10 minutes and can be consumed only once. Sessions
expire after 8 hours. Removing a user ID from the allowlist rejects that user's
existing sessions after the new configuration is deployed. Logout clears the
website session and keeps the Pocket ID session available for other apps.
Each admin login requires fresh Pocket ID authentication with `prompt=login`
and `max_age=0`. The callback requires a recent signed `auth_time` claim.

With all five variables empty, the existing local password login remains
available for development. Setting any Pocket ID variable disables password
login and old password sessions. Partial or invalid configuration fails closed.
The login page redirects to the callback's host so login also works from `www`.
