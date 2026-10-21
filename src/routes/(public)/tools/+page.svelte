<script lang="ts">
  import Icon from '$lib/components/Icon.svelte'
  import SEOHead from '$lib/components/SEOHead.svelte'
  import { breadcrumbSchema } from '$lib/seo'
</script>

<SEOHead title="Tools & experiments" description="Useful little tools and things to play with. Convert images on your device or make waves in the Flux Water experiment." jsonLd={breadcrumbSchema([{ name: 'Home', url: '/' }, { name: 'Tools', url: '/tools' }])} />

<div class="tools-page container">
  <header>
    <p class="eyebrow"><Icon name="layers" size="sm" /> Made by Xerrion</p>
    <h1>Tools &<br /><span>experiments.</span></h1>
    <p class="intro">Useful little tools, and a few things built out of curiosity. Pick one and try it.</p>
  </header>
  <div class="tool-grid">
    <a class="tool-card" href="/tools/images">
      <div class="card-top"><span class="tool-icon"><Icon name="layers" size="lg" /></span><span class="category">Utility</span></div>
      <h2>Image converter</h2>
      <p>Convert, resize and optimize your images. Compare changes live, then download. Your files stay on your device.</p>
      <span class="card-link">Open image converter <Icon name="arrow-up-right" size="sm" /></span>
    </a>
    <a class="tool-card water-card" href="/tools/flux-water">
      <div class="card-top"><span class="tool-icon"><Icon name="sparkles" size="lg" /></span><span class="category">Experiment · WebGPU</span></div>
      <h2>Flux Water</h2>
      <p>Make ripples, change the light and stir a real-time water surface. A small experiment for your graphics card.</p>
      <span class="card-link">Play with the water <Icon name="arrow-up-right" size="sm" /></span>
    </a>
  </div>
</div>

<style>
  .tools-page { padding-top: var(--space-16); padding-bottom: var(--space-24); }
  header { margin-bottom: var(--space-12); }
  .eyebrow { display: flex; gap: var(--space-2); align-items: center; color: var(--color-accent); font-family: var(--font-mono); text-transform: uppercase; letter-spacing: .08em; font-size: var(--text-xs); margin-bottom: var(--space-6); }
  h1 { font-size: clamp(2.6rem, 7vw, 5.5rem); line-height: 1.02; letter-spacing: -.055em; margin: 0 0 var(--space-6); }
  h1 span { color: var(--color-accent); }
  .intro { max-width: 36rem; color: var(--color-text-secondary); line-height: 1.7; font-size: var(--text-lg); }
  .tool-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-6); }
  .tool-card { display: flex; flex-direction: column; padding: var(--space-8); border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-bg-secondary); transition: border-color var(--transition-base), background var(--transition-base); }
  .tool-card:hover { border-color: var(--color-accent); background: var(--color-bg-tertiary); }
  .tool-card:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 4px; }
  .card-top { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); margin-bottom: var(--space-8); }
  .tool-icon { color: var(--color-accent); }
  .category { color: var(--color-text-secondary); font-family: var(--font-mono); font-size: var(--text-xs); }
  h2 { font-size: var(--text-2xl); letter-spacing: -.04em; margin: 0 0 var(--space-4); }
  .tool-card p { color: var(--color-text-secondary); line-height: 1.8; margin: 0 0 var(--space-8); }
  .card-link { display: flex; align-items: center; gap: var(--space-2); margin-top: auto; color: var(--color-accent); font-size: var(--text-sm); font-weight: 700; }
  @media (max-width: 640px) { .tools-page { padding-top: var(--space-8); } .tool-grid { grid-template-columns: minmax(0, 1fr); } .tool-card { padding: var(--space-6); } }
  @media (prefers-reduced-motion: reduce) { .tool-card { transition: none; } }
</style>
