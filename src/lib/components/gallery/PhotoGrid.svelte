<script lang="ts">
  import type { Photo, PhotoCategory } from '$lib/gallery'
  import Icon from '$lib/components/Icon.svelte'
  import { reveal } from '$lib/utils/animate'
  interface Props {
    photos: Photo[]
    categories: PhotoCategory[]
    selectedCategory: string | null
    onphotoclick: (photo: Photo) => void
  }
  let { photos, categories, selectedCategory, onphotoclick }: Props = $props()
  let failedPhotos = $state<string[]>([])
  function categoryName(slug: string): string { return categories.find((category) => category.slug === slug)?.name ?? slug }
  function reportImageFailure(id: string): void { if (!failedPhotos.includes(id)) failedPhotos = [...failedPhotos, id] }
</script>

{#snippet photoCard(photo: Photo, index: number, featured: boolean = false)}
  {@const source = photo.mediumUrl ?? photo.thumbUrl ?? photo.fullUrl}
  <figure class="photo-card" class:featured use:reveal={{ duration: 450 }}>
    <button class="photo-button" onclick={() => onphotoclick(photo)} aria-label="View {photo.name} in fullscreen">
      {#if source && !failedPhotos.includes(photo.id)}
        <img src={source} alt={photo.name} width={photo.width} height={photo.height} loading={index < 3 ? 'eager' : 'lazy'} onerror={() => reportImageFailure(photo.id)} />
      {:else}
        <span class="photo-unavailable">Photo preview unavailable</span>
      {/if}
      <span class="photo-open" aria-hidden="true">View photo <span class="photo-open-icon"><Icon name="arrow-up-right" size="sm" /></span></span>
    </button>
    <figcaption><span>{categoryName(photo.category)}</span><span>{String(index + 1).padStart(2, '0')}</span></figcaption>
  </figure>
{/snippet}

{#if photos.length > 0}
  <div class="photo-grid-wrapper" id="gallery-grid">
    <div class="featured-grid" class:compact={photos.length < 3} class:single={photos.length === 1}>
      {#each photos.slice(0, 3) as photo, index (photo.id)}{@render photoCard(photo, index, index === 0)}{/each}
    </div>
    {#if photos.length > 3}
      <div class="photo-grid-more">{#each photos.slice(3) as photo, index (photo.id)}{@render photoCard(photo, index + 3)}{/each}</div>
    {/if}
  </div>
{:else}
  <div class="empty-state"><h2>No photos yet.</h2><p>{selectedCategory ? 'There are no photos in this category yet.' : 'New photos will appear here.'}</p>{#if selectedCategory}<a href="/gallery">Browse all photos</a>{/if}</div>
{/if}

<style>
  .featured-grid { display: grid; grid-template-columns: minmax(0, 1.7fr) minmax(0, 1fr); gap: var(--space-6); }
  .photo-card { margin: 0; min-width: 0; }
  .featured { grid-row: span 2; }
  .photo-button { display: block; width: 100%; height: 270px; padding: 0; border: 0; border-radius: var(--radius-sm); position: relative; overflow: hidden; background: var(--color-surface); color: var(--color-text); cursor: pointer; }
  .featured .photo-button { height: 598px; }
  .photo-button img { display: block; width: 100%; height: 100%; object-fit: cover; object-position: center 45%; transition: transform 600ms cubic-bezier(.2, .7, .2, 1); }
  .photo-button::after { content: ''; position: absolute; inset: 0; border: 1px solid var(--color-clear); border-radius: inherit; pointer-events: none; transition: border-color 220ms ease; }
  .photo-button:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 4px; }
  .photo-button:focus-visible::after { border-color: var(--color-accent); }
  figcaption { display: flex; justify-content: space-between; gap: var(--space-4); padding-top: var(--space-3); color: var(--color-text-muted); font-size: var(--text-sm); }
  .photo-open { position: absolute; left: var(--space-4); bottom: var(--space-4); display: inline-flex; align-items: center; gap: var(--space-5); padding: var(--space-2) var(--space-3); color: var(--color-text); background: var(--color-bg); font-size: var(--text-xs); transition: color 180ms ease, background-color 180ms ease; }
  .photo-open-icon { display: inline-flex; transition: transform 220ms cubic-bezier(.2, .7, .2, 1); }
  .photo-button:focus-visible .photo-open { color: var(--color-accent); background: var(--color-surface-hover); }
  .photo-button:focus-visible .photo-open-icon { transform: translate(2px, -2px); }
  .photo-unavailable { display: block; padding: var(--space-6); color: var(--color-text-muted); }
  .photo-grid-more { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--space-6); margin-top: var(--space-6); }
  .photo-grid-more .photo-button { height: 320px; }
  .compact { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .compact .featured { grid-row: auto; }
  .compact .photo-button { height: 340px; }
  .single { grid-template-columns: minmax(0, 1fr); max-width: 680px; }
  .empty-state { border-top: 1px solid var(--color-border); padding-block: var(--space-10); }
  .empty-state h2 { font-size: var(--text-xl); font-weight: 400; }
  .empty-state p { margin-top: var(--space-3); color: var(--color-text-muted); }
  .empty-state a { display: inline-flex; min-height: 44px; align-items: center; color: var(--color-accent); margin-top: var(--space-4); }
  @media (hover: hover) { .photo-button:hover img { transform: scale(1.025); } .photo-button:hover::after { border-color: var(--color-accent); } .photo-button:hover .photo-open { color: var(--color-accent); background: var(--color-surface-hover); } .photo-button:hover .photo-open-icon { transform: translate(2px, -2px); } }
  @media (max-width: 1000px) { .photo-button { height: 230px; } .featured .photo-button { height: 518px; } .photo-grid-more { grid-template-columns: repeat(2, minmax(0, 1fr)); } .photo-grid-more .photo-button { height: 280px; } .compact .photo-button { height: 340px; } }
  @media (max-width: 740px) { .featured-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-5); } .featured { grid-column: 1 / -1; grid-row: auto; } .featured .photo-button { height: 380px; } .photo-button, .photo-grid-more .photo-button { height: 200px; } .photo-open { left: var(--space-2); bottom: var(--space-2); gap: var(--space-2); padding: var(--space-2); font-size: .6875rem; } figcaption { font-size: var(--text-xs); } .photo-grid-more { gap: var(--space-5); margin-top: var(--space-5); } .compact { grid-template-columns: minmax(0, 1fr); } .compact .photo-button { height: 340px; } }
  @media (max-width: 350px) { .featured .photo-button { height: 320px; } .photo-button, .photo-grid-more .photo-button { height: 180px; } }
  @media (prefers-reduced-motion: reduce) { .photo-button img, .photo-button::after, .photo-open, .photo-open-icon { transition: none; } .photo-button:hover img, .photo-button:hover .photo-open-icon, .photo-button:focus-visible .photo-open-icon { transform: none; } }
</style>
