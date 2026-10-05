import { sveltekit } from '@sveltejs/kit/vite'
import { sentrySvelteKit } from '@sentry/sveltekit/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    sentrySvelteKit({ adapter: 'other', autoInstrument: false, autoUploadSourceMaps: false }),
    sveltekit()
  ],
  // The Bun adapter consumes these maps when it bundles the server again.
  build: { sourcemap: true },
  resolve: {
    dedupe: ['@codemirror/state', '@codemirror/view']
  },
  optimizeDeps: {
    exclude: ['@node-rs/argon2']
  },
  ssr: {
    external: ['@node-rs/argon2', 'heic-decode'],
    noExternal: ['sveltekit-superforms']
  }
})
