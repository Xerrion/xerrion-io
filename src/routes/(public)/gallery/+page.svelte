<script lang="ts">
  import { afterNavigate } from '$app/navigation'
  import { navigating } from '$app/state'
  import type { PageData } from './$types'

  import SEOHead from '$lib/components/SEOHead.svelte'
  import Icon from '$lib/components/Icon.svelte'
  import CategoryFilter from '$lib/components/gallery/CategoryFilter.svelte'
  import PhotoGrid from '$lib/components/gallery/PhotoGrid.svelte'
  import GalleryLightbox from '$lib/components/gallery/GalleryLightbox.svelte'
  import { breadcrumbSchema } from '$lib/seo'
  import type { Photo } from '$lib/gallery'
  import { reveal, stagger } from '$lib/utils/animate'

  interface Props { data: PageData }
  let { data }: Props = $props()
  let lightboxPhoto = $state<Photo | null>(null)
  let pendingPhotoCount: number | null = null
  const selectedCategory = $derived(data.selectedCategory ?? null)
  const displayedPhotos = $derived(data.initialPhotos)
  const category = $derived(data.categories.find((item) => item.slug === selectedCategory))
  const selectedTotal = $derived(data.selectedTotal ?? data.totalPhotos)
  const hasMore = $derived(data.hasMore ?? displayedPhotos.length < selectedTotal)
  const loadingMore = $derived(navigating.to?.url.pathname === '/gallery' && navigating.to.url.searchParams.get('page') !== null)
  const moreUrl = $derived.by(() => {
    const parameters = new URLSearchParams({ page: String((data.page ?? 1) + 1) })
    if (selectedCategory) parameters.set('category', selectedCategory)
    return `/gallery?${parameters}`
  })
  function closeLightbox(): void { lightboxPhoto = null }
  function navigateLightbox(direction: 1 | -1): void {
    const index = displayedPhotos.findIndex((photo) => photo.id === lightboxPhoto?.id)
    const next = displayedPhotos[index + direction]
    if (index !== -1 && next) lightboxPhoto = next
  }
  afterNavigate(() => {
    closeLightbox()
    if (pendingPhotoCount !== null && displayedPhotos.length > pendingPhotoCount) {
      document.querySelectorAll<HTMLButtonElement>('#gallery-grid .photo-button')[pendingPhotoCount]?.focus({ preventScroll: true })
    }
    pendingPhotoCount = null
  })
  $effect(() => {
    if (!lightboxPhoto) return
    document.body.classList.add('gallery-lightbox-open')
    return () => document.body.classList.remove('gallery-lightbox-open')
  })
</script>

<SEOHead title="Gallery" description="Photos from life outside software, including Charlie, Lasse Skovgaard Nielsen's golden retriever." jsonLd={breadcrumbSchema([{ name: 'Home', url: '/' }, { name: 'Gallery', url: '/gallery' }])} />

<div class="gallery-page container">
  <header class="gallery-intro" use:stagger={{ selector: '.eyebrow, h1, .intro-description', duration: 650, staggerDelay: 90 }}><div><p class="eyebrow"><Icon name="camera" size="sm" />Gallery</p><h1>Away from<br /><span>the keyboard.</span></h1></div><p class="intro-description">A few moments with Charlie, my golden retriever. He turns up in far too many of the photos here.</p></header>
  {#if data.error}
    <div class="gallery-error"><h2>The gallery is temporarily unavailable.</h2><p>Please try again later.</p><a class="text-link" href="/gallery" data-sveltekit-reload>Try again <span class="link-icon"><Icon name="arrow-right" size="sm" /></span></a></div>
  {:else}
    <section class="gallery-album" aria-labelledby="album-heading">
      <div class="album-heading" use:reveal={{ duration: 450, type: 'fadeIn' }}><h2 id="album-heading">{category?.name ?? (data.categories.length === 1 ? data.categories[0].name : 'Photos')}</h2><CategoryFilter categories={data.categories} photoCounts={data.photoCounts} totalPhotos={data.totalPhotos} {selectedCategory} /></div>
      {#if category?.description}<p class="category-description">{category.description}</p>{/if}
      <PhotoGrid photos={displayedPhotos} categories={data.categories} {selectedCategory} onphotoclick={(photo) => { lightboxPhoto = photo }} />
      {#if displayedPhotos.length > 0}<div class="gallery-pagination" use:reveal={{ duration: 450, type: 'fadeIn' }}><p aria-live="polite">Showing {displayedPhotos.length} of {selectedTotal} photos</p>{#if hasMore}<a class="load-more" href={moreUrl} onclick={() => { pendingPhotoCount = displayedPhotos.length }} data-sveltekit-noscroll data-sveltekit-keepfocus aria-busy={loadingMore}>{loadingMore ? 'Loading photos…' : 'Load more photos'}<span class="more-icon"><Icon name="chevron-down" size="sm" /></span></a>{/if}</div>{/if}
    </section>
  {/if}
  <div class="next-page"><p>More about the person behind the photos.</p><a class="text-link" href="/about">A little about me <span class="link-icon"><Icon name="arrow-right" size="sm" /></span></a></div>
</div>
<GalleryLightbox photo={lightboxPhoto} photos={displayedPhotos} categories={data.categories} onclose={closeLightbox} onnavigate={navigateLightbox} />

<style>
  :global(body.gallery-lightbox-open) { overflow: hidden; }
  .gallery-intro { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(0, .65fr); gap: var(--space-12); padding-block: var(--space-16) var(--space-12); align-items: end; }
  .eyebrow { display: inline-flex; align-items: center; gap: var(--space-3); font-size: var(--text-xs); font-weight: 400; letter-spacing: .075em; text-transform: uppercase; color: var(--color-text-muted); }
  h1 { margin-top: var(--space-6); font-size: clamp(3.2rem, 6.7vw, 6.15rem); line-height: 1.04; letter-spacing: -.043em; font-weight: 500; }
  h1 span { color: var(--color-accent); }
  .intro-description { color: var(--color-text-muted); font-size: var(--text-lg); line-height: 1.6; padding-bottom: var(--space-2); }
  .gallery-album { border-top: 1px solid var(--color-border); padding-top: var(--space-6); }
  .album-heading { display: flex; justify-content: space-between; gap: var(--space-4); align-items: center; margin-bottom: var(--space-6); }
  .album-heading h2 { font-size: 1.5rem; font-weight: 400; letter-spacing: -.025em; }
  .category-description { color: var(--color-text-muted); margin-bottom: var(--space-6); }
  .gallery-pagination { display: flex; justify-content: space-between; gap: var(--space-6); align-items: center; padding-top: var(--space-8); }
  .gallery-pagination p { color: var(--color-text-muted); font-size: var(--text-sm); }
  .load-more { min-height: 48px; display: inline-flex; align-items: center; gap: var(--space-5); border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: var(--space-3) var(--space-5); color: var(--color-accent); text-decoration: none; transition: border-color 180ms ease, background-color 180ms ease; }
  .load-more:hover { border-color: var(--color-accent); background: var(--color-surface-hover); }
  .more-icon, .link-icon { display: inline-flex; transition: transform 220ms cubic-bezier(.2, .7, .2, 1); }
  .load-more:focus-visible .more-icon { transform: translateY(3px); }
  .text-link:focus-visible .link-icon { transform: translateX(3px); }
  .text-link { min-height: 44px; display: inline-flex; align-items: center; gap: var(--space-3); color: var(--color-accent); font-size: var(--text-sm); text-decoration: none; }
  .next-page { display: flex; justify-content: space-between; align-items: center; gap: var(--space-6); padding-block: var(--space-8); margin-top: var(--space-10); border-top: 1px solid var(--color-border); }
  .next-page p, .gallery-error p { color: var(--color-text-muted); }
  .gallery-error { padding-block: var(--space-10); border-top: 1px solid var(--color-border); }
  .gallery-error h2 { font-size: var(--text-xl); font-weight: 400; }
  .gallery-error p { margin-top: var(--space-3); }
  .gallery-error a { margin-top: var(--space-4); }
  @media (hover: hover) { .load-more:hover .more-icon { transform: translateY(3px); } .text-link:hover .link-icon { transform: translateX(3px); } }
  @media (max-width: 1000px) { .gallery-intro { gap: var(--space-8); grid-template-columns: minmax(0, 1.4fr) minmax(0, .8fr); } h1 { font-size: clamp(3rem, 6.4vw, 5rem); } }
  @media (max-width: 740px) { .gallery-intro { display: block; padding-block: var(--space-10) var(--space-8); } h1 { font-size: clamp(2.75rem, 9.8vw, 4.4rem); line-height: 1.08; letter-spacing: -.038em; margin-top: var(--space-5); } .intro-description { font-size: var(--text-base); margin-top: var(--space-5); } .album-heading { align-items: flex-start; flex-direction: column; } .gallery-pagination { align-items: flex-start; flex-direction: column; gap: var(--space-4); } .next-page { align-items: flex-start; flex-direction: column; gap: var(--space-2); margin-top: var(--space-8); padding-block: var(--space-6); } }
  @media (max-width: 350px) { h1 { font-size: 2.55rem; } }
  @media (prefers-reduced-motion: reduce) { .load-more, .more-icon, .link-icon { transition: none; } .load-more:hover .more-icon, .load-more:focus-visible .more-icon, .text-link:hover .link-icon, .text-link:focus-visible .link-icon { transform: none; } }
</style>
