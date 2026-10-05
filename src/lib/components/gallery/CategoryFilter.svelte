<script lang="ts">
  import type { PhotoCategory } from '$lib/gallery'
  import Icon from '$lib/components/Icon.svelte'
  interface Props {
    categories: PhotoCategory[]
    photoCounts: Record<string, number>
    totalPhotos: number
    selectedCategory: string | null
  }
  let { categories, photoCounts, totalPhotos, selectedCategory }: Props = $props()
  function categoryUrl(slug: string): string { return `/gallery?${new URLSearchParams({ category: slug })}` }
</script>

<nav class="category-filter" aria-label="Photo categories">
  <a class="filter-btn" class:active={selectedCategory === null} href="/gallery" aria-current={selectedCategory === null ? 'page' : undefined}><span class="category-icon"><Icon name="grid" size="sm" /></span>All <span class="filter-count">{totalPhotos}</span></a>
  {#each categories as category (category.slug)}
    <a class="filter-btn" class:active={selectedCategory === category.slug} href={categoryUrl(category.slug)} aria-current={selectedCategory === category.slug ? 'page' : undefined}><span class="category-icon"><Icon name="folder" size="sm" /></span>{category.name} <span class="filter-count">{photoCounts[category.slug] ?? 0}</span></a>
  {/each}
</nav>

<style>
  .category-filter { display: flex; flex-wrap: wrap; gap: var(--space-3); }
  .filter-btn { display: inline-flex; align-items: center; gap: var(--space-3); min-height: 44px; padding: var(--space-2) var(--space-4); border: 1px solid var(--color-border); border-radius: var(--radius-sm); color: var(--color-text-muted); background: var(--color-bg); font-size: var(--text-sm); text-decoration: none; transition: color 180ms ease, background-color 180ms ease, border-color 180ms ease; }
  .filter-btn:hover { color: var(--color-accent); border-color: var(--color-accent); }
  .filter-btn.active { color: var(--color-bg); background: var(--color-accent); border-color: var(--color-accent); }
  .filter-btn:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 4px; }
  .filter-count { font-size: var(--text-xs); font-variant-numeric: tabular-nums; }
  .category-icon { display: inline-flex; transition: transform 220ms cubic-bezier(.2, .7, .2, 1); }
  @media (hover: hover) { .filter-btn:hover .category-icon { transform: translateY(-2px); } }
  @media (prefers-reduced-motion: reduce) { .filter-btn, .category-icon { transition: none; } .filter-btn:hover .category-icon { transform: none; } }
</style>
