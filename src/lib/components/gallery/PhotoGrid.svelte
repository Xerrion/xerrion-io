<script lang="ts">
  import type { Photo, PhotoCategory } from '$lib/gallery'
  import {
    fadeIn as waapiFadeIn,
    fadeInUp as waapiFadeInUp
  } from '$lib/utils/animate'
  import {
    computeLayout,
    computeColumnCount,
    computeGap
  } from '$lib/utils/masonry'

  interface Props {
    photos: Photo[]
    categories: PhotoCategory[]
    selectedCategory: string | null
    visible: boolean
    onphotoclick: (photo: Photo) => void
  }

  let { photos, categories, selectedCategory, visible, onphotoclick }: Props =
    $props()

  // --- Reactive state ---

  let containerEl: HTMLDivElement | undefined = $state(undefined)
  let skeletonEl: HTMLDivElement | undefined = $state(undefined)
  let containerWidth = $state(0)

  let layout = $derived.by(() => {
    if (containerWidth <= 0) return { positions: [], totalHeight: 0 }
    const cols = computeColumnCount(containerWidth)
    const gap = computeGap(containerWidth)
    return computeLayout(photos, containerWidth, cols, gap)
  })

  let cols = $derived(
    containerWidth > 0 ? computeColumnCount(containerWidth) : 1
  )

  // Observe container width changes via ResizeObserver
  $effect(() => {
    const target = containerEl ?? skeletonEl
    if (!target) return

    containerWidth = target.clientWidth

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        containerWidth = entry.contentRect.width
      }
    })

    observer.observe(target)

    return () => observer.disconnect()
  })

  // --- Image load handler ---

  function onImageLoad(event: Event) {
    const img = event.target as HTMLImageElement
    img.classList.add('loaded')
    const shimmer = img.previousElementSibling
    if (shimmer?.classList.contains('photo-shimmer')) {
      shimmer.classList.add('loaded')
    }
  }

  // --- Scroll reveal animation ---

  let nextStaggerDelay = 0
  let staggerResetTimer: ReturnType<typeof setTimeout> | null = null
  const STAGGER_INCREMENT = 50

  $effect(() => {
    return () => {
      if (staggerResetTimer) clearTimeout(staggerResetTimer)
    }
  })

  function revealOnScroll(node: HTMLElement) {
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches

    const observer = new IntersectionObserver(
      (entries) => {
        const intersecting = entries.filter((e) => e.isIntersecting)
        if (intersecting.length > 0) {
          observer.disconnect()

          if (reducedMotion) {
            node.style.opacity = '1'
            return
          }

          const container = node.closest('.photo-masonry')

          let delay = 0

          if (container) {
            const rect = node.getBoundingClientRect()
            const containerRect = container.getBoundingClientRect()
            const relativeX = rect.left - containerRect.left
            const relativeY = Math.max(0, rect.top)
            const waveFront = relativeX * 0.5 + relativeY * 0.5
            delay = Math.min(waveFront * 0.5, 400)
          } else {
            delay = nextStaggerDelay
            nextStaggerDelay += STAGGER_INCREMENT

            if (staggerResetTimer) clearTimeout(staggerResetTimer)
            staggerResetTimer = setTimeout(() => {
              nextStaggerDelay = 0
            }, 100)
          }

          node.animate(
            [
              {
                opacity: 0,
                transform: 'scale(0.85) translateY(20px)',
                filter: 'blur(4px)'
              },
              {
                opacity: 1,
                transform: 'scale(1) translateY(0)',
                filter: 'blur(0px)'
              }
            ],
            {
              duration: 600,
              easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
              delay,
              fill: 'forwards'
            }
          )
        }
      },
      { rootMargin: '50px' }
    )
    observer.observe(node)

    return {
      destroy() {
        observer.disconnect()
      }
    }
  }

  // --- Helpers ---

  function getCategoryInfo(slug: string): PhotoCategory | undefined {
    return categories.find((c) => c.slug === slug)
  }
</script>

{#if photos.length > 0}
  <div class="photo-grid-wrapper">
    <!-- Skeleton loader - visible during category switch transition -->
    {#if !visible}
      <div
        class="photo-masonry skeleton-grid"
        aria-hidden="true"
        bind:this={skeletonEl}
        style:height="{layout.totalHeight}px"
        use:waapiFadeIn={{ duration: 200 }}
      >
        {#if layout.positions.length === photos.length}
          {#each photos as photo, i (photo.id)}
            {@const pos = layout.positions[i]}
            {#if pos}
              <div
                class="skeleton-card"
                style:left="{pos.left}px"
                style:top="{pos.top}px"
                style:width="{pos.width}px"
                style:height="{pos.height}px"
              ></div>
            {/if}
          {/each}
        {/if}
      </div>
    {/if}

    <div
      class="photo-masonry"
      class:grid-hidden={!visible}
      bind:this={containerEl}
      style:column-count={cols}
      style:height="{layout.totalHeight}px"
      inert={!visible}
      aria-hidden={!visible}
    >
      {#if layout.positions.length === photos.length}
        {#each photos as photo, index (photo.id)}
          {@const srcset = [
            photo.thumbUrl ? `${photo.thumbUrl} 400w` : '',
            photo.mediumUrl ? `${photo.mediumUrl} 1200w` : ''
          ]
            .filter(Boolean)
            .join(', ')}
          {@const pos = layout.positions[index]}
          <figure
            class="photo-card"
            use:revealOnScroll
            style:left={pos ? `${pos.left}px` : undefined}
            style:top={pos ? `${pos.top}px` : undefined}
            style:width={pos ? `${pos.width}px` : undefined}
          >
            <button
              class="photo-button"
              onclick={() => onphotoclick(photo)}
              aria-label="View {photo.name} in fullscreen"
            >
              <div class="photo-shimmer"></div>
              <img
                src={photo.thumbUrl ?? ''}
                srcset={srcset || undefined}
                sizes="(max-width: 480px) 100vw, (max-width: 1024px) 50vw, 33vw"
                alt={photo.name}
                width={photo.width}
                height={photo.height}
                style:aspect-ratio={photo.width && photo.height
                  ? `${photo.width} / ${photo.height}`
                  : '3 / 4'}
                loading="lazy"
                onload={onImageLoad}
              />
              <div class="photo-overlay">
                <svg
                  class="expand-icon"
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <polyline points="9 21 3 21 3 15"></polyline>
                  <line x1="21" y1="3" x2="14" y2="10"></line>
                  <line x1="3" y1="21" x2="10" y2="14"></line>
                </svg>
              </div>
            </button>
            {#if selectedCategory === null}
              {@const categoryInfo = getCategoryInfo(photo.category)}
              {#if categoryInfo}
                <figcaption class="photo-badge">
                  {categoryInfo.name}
                </figcaption>
              {/if}
            {/if}
          </figure>
        {/each}
      {/if}
    </div>
  </div>
{:else}
  <div class="empty-state" use:waapiFadeInUp={{ duration: 500 }}>
    <div class="empty-icon">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <circle cx="8.5" cy="8.5" r="1.5"></circle>
        <polyline points="21 15 16 10 5 21"></polyline>
      </svg>
    </div>
    <h2>No photos yet</h2>
    <p>
      {#if selectedCategory}
        No photos in this category yet. Check back later!
      {:else}
        The gallery is empty. Photos coming soon!
      {/if}
    </p>
  </div>
{/if}

<style>
  /* ===== Grid Wrapper ===== */
  .photo-grid-wrapper {
    position: relative;
  }

  /* ===== Photo Masonry Grid ===== */
  .photo-masonry {
    position: relative;
    transition:
      opacity 0.3s ease,
      transform 0.3s ease;
  }

  .photo-masonry.grid-hidden {
    opacity: 0;
    transform: scale(0.98);
    pointer-events: none;
  }

  /* ===== Photo Card ===== */
  .photo-card {
    position: absolute;
    margin: 0;
    padding: 0;
    border-radius: var(--radius-xl);
    overflow: hidden;
    /* Start hidden, WAAPI reveal animation fills forwards */
    opacity: 0;
  }

  .photo-button {
    display: block;
    width: 100%;
    border: none;
    padding: 0;
    margin: 0;
    cursor: pointer;
    background: var(--color-bg-tertiary);
    position: relative;
    overflow: hidden;
    border-radius: var(--radius-xl);
    transition:
      box-shadow var(--transition-fast),
      transform var(--transition-fast);
  }

  .photo-button:hover {
    box-shadow: var(--shadow-lg);
    transform: translateY(-4px);
  }

  .photo-button:active {
    transform: scale(0.98);
  }

  .photo-button:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  /* Shimmer placeholder */
  .photo-shimmer {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      110deg,
      var(--color-bg-secondary) 8%,
      var(--color-bg-tertiary) 18%,
      var(--color-bg-secondary) 33%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s linear infinite;
    z-index: 1;
    transition: opacity 0.4s ease;
  }

  .photo-shimmer:global(.loaded) {
    opacity: 0;
    pointer-events: none;
  }

  @keyframes shimmer {
    to {
      background-position: -200% 0;
    }
  }

  /* Image */
  .photo-button img {
    display: block;
    width: 100%;
    height: auto;
    opacity: 0;
    filter: blur(8px);
    transform: scale(1.04);
    transition:
      opacity 0.5s ease,
      filter 0.6s ease,
      transform 0.6s ease;
  }

  .photo-button img:global(.loaded) {
    opacity: 1;
    filter: blur(0);
    transform: scale(1);
  }

  .photo-button:hover img:global(.loaded) {
    transform: scale(1.04);
    filter: blur(0);
  }

  /* Hover overlay */
  .photo-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to top,
      var(--color-overlay) 0%,
      transparent 50%
    );
    opacity: 0;
    transition: opacity var(--transition-base);
    display: flex;
    align-items: flex-end;
    justify-content: flex-end;
    padding: var(--space-3);
    z-index: 2;
  }

  .photo-button:hover .photo-overlay,
  .photo-button:focus-visible .photo-overlay {
    opacity: 1;
  }

  .expand-icon {
    color: var(--color-on-overlay);
    filter: drop-shadow(0 1px 2px var(--color-overlay-light));
    transform: translateY(4px);
    opacity: 0;
    transition:
      transform 0.3s ease,
      opacity 0.3s ease;
  }

  .photo-button:hover .expand-icon,
  .photo-button:focus-visible .expand-icon {
    transform: translateY(0);
    opacity: 1;
  }

  /* Category badge on card */
  .photo-badge {
    position: absolute;
    top: var(--space-3);
    left: var(--space-3);
    padding: var(--space-1) var(--space-3);
    background-color: var(--color-overlay-heavy);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border-radius: var(--radius-full);
    font-size: var(--text-xs);
    color: var(--color-on-overlay);
    font-weight: 500;
    z-index: 3;
    pointer-events: none;
    animation: slideInUpSmall 0.4s ease-out 0.3s both;
  }

  /* ===== Skeleton Loader ===== */
  .skeleton-grid {
    position: absolute;
    inset: 0;
    opacity: 1;
  }

  .skeleton-card {
    position: absolute;
    border-radius: var(--radius-xl);
    background: linear-gradient(
      110deg,
      var(--color-bg-secondary) 8%,
      var(--color-bg-tertiary) 18%,
      var(--color-bg-secondary) 33%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s linear infinite;
  }

  /* ===== Empty State ===== */
  .empty-state {
    text-align: center;
    padding: var(--space-24) var(--space-4);
  }

  .empty-icon {
    color: var(--color-text-muted);
    margin-bottom: var(--space-4);
    opacity: 0.5;
  }

  .empty-state h2 {
    font-size: var(--text-2xl);
    margin-bottom: var(--space-2);
  }

  .empty-state p {
    color: var(--color-text-muted);
    max-width: 360px;
    margin: 0 auto;
  }

  /* ===== Responsive ===== */
  @media (max-width: 768px) {
    .photo-card {
      border-radius: var(--radius-lg);
    }

    .photo-button {
      border-radius: var(--radius-lg);
    }

    .skeleton-card {
      border-radius: var(--radius-lg);
    }
  }

  /* ===== Reduced Motion ===== */
  @media (prefers-reduced-motion: reduce) {
    .photo-card {
      opacity: 1;
    }

    .photo-button img {
      opacity: 1;
      filter: none;
      transform: none;
      transition: none;
    }

    .photo-button {
      transition: none;
    }

    .photo-badge {
      animation: none;
    }

    .empty-state {
      animation: none;
    }

    .photo-shimmer {
      animation: none;
    }

    .skeleton-card {
      animation: none;
    }

    .photo-masonry {
      transition: none;
    }

    .photo-button:hover,
    .photo-button:active {
      transform: none;
    }

    .expand-icon {
      transition: none;
      transform: none;
    }

    .photo-button:hover .expand-icon,
    .photo-button:focus-visible .expand-icon {
      transform: none;
    }

    .photo-button:hover .photo-overlay,
    .photo-button:focus-visible .photo-overlay {
      transition: none;
    }

    .photo-button:hover img:global(.loaded) {
      transform: none;
    }
  }
</style>
