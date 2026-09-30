import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [sveltekit()],
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
