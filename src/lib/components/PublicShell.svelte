<script lang="ts">
  import type { Snippet } from 'svelte';
  import { page } from '$app/state';
  import Navigation from "$lib/components/Navigation.svelte";
  import Footer from "$lib/components/Footer.svelte";

  interface Props { children: Snippet }
  let { children }: Props = $props();
</script>

<a href="#main-content" class="skip-link">Skip to content</a>

<div class="app public-site" id="top">
  <Navigation />

  <main id="main-content" class="main" tabindex="-1">
    {#key page.url.pathname}
      {@render children()}
    {/key}
  </main>

  <Footer />
</div>

<style>
  .skip-link {
    position: absolute;
    top: -100%;
    left: var(--space-4);
    z-index: 1000;
    padding: var(--space-2) var(--space-4);
    background-color: var(--color-primary);
    color: var(--color-background);
    border-radius: var(--radius-md);
    font-weight: 500;
    text-decoration: none;
  }

  .skip-link:focus {
    top: var(--space-2);
  }

  .app {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  .main {
    flex: 1;
  }
</style>
