import { fileURLToPath } from 'node:url'
import { sveltekit } from '@sveltejs/kit/vite'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'

const path = (relative: string): string =>
  fileURLToPath(new URL(relative, import.meta.url))

// Serve the actual admin components with fixture data. Production routes and
// authentication hooks are never part of this isolated UI test server.
export default defineConfig({
  plugins: [
    sveltekit({
      preprocess: vitePreprocess(),
      files: {
        routes: path('routes'),
        lib: path('../../../src/lib'),
        assets: path('../../../static'),
        appTemplate: path('app.html'),
        hooks: {
          server: path('hooks.server.ts'),
          client: path('hooks.client.ts'),
          universal: path('hooks.ts')
        }
      },
      outDir: path('../../../.svelte-kit/admin-mobile')
    })
  ],
  resolve: { dedupe: ['@codemirror/state', '@codemirror/view'] },
  ssr: { noExternal: ['sveltekit-superforms'] }
})
