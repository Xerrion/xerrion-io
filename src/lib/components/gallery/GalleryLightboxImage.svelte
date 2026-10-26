<script lang="ts">
  import { untrack } from 'svelte'

  import type { Photo } from '$lib/gallery'

  interface Props {
    photo: Photo
  }

  let { photo }: Props = $props()
  let source = $state(
    untrack(() => photo.thumbUrl ?? photo.mediumUrl ?? photo.fullUrl)
  )
  let sourceSet = $state<string | undefined>()
  let loadState = $state<'loading' | 'ready' | 'failed'>('loading')
  let displayFailed = $state(false)
  let attempt = $state(0)
  const message = $derived(
    loadState === 'failed' || displayFailed
      ? !source || displayFailed
        ? 'Photo could not be loaded.'
        : 'Showing a preview. The full photo could not be loaded.'
      : loadState === 'loading'
        ? 'Loading photo…'
        : ''
  )

  $effect(() => {
    attempt
    const fullSource = photo.fullUrl ?? photo.mediumUrl ?? photo.thumbUrl
    if (!fullSource) {
      loadState = 'failed'
      return
    }

    const fullSourceSet =
      [
        photo.mediumUrl ? `${photo.mediumUrl} 1200w` : '',
        photo.fullUrl ? `${photo.fullUrl} 2400w` : ''
      ]
        .filter(Boolean)
        .join(', ') || undefined
    const image = new Image()
    let active = true
    image.sizes = '100vw'
    if (fullSourceSet) image.srcset = fullSourceSet
    image.src = fullSource

    // This component is keyed by photo ID. Late loads cannot replace a new selection.
    image
      .decode()
      .then(() => {
        if (!active) return
        source = fullSource
        sourceSet = fullSourceSet
        displayFailed = false
        loadState = 'ready'
      })
      .catch(() => {
        if (active) loadState = 'failed'
      })

    return () => {
      active = false
    }
  })

  function retry(): void {
    loadState = 'loading'
    displayFailed = false
    attempt += 1
  }
</script>

<div class="image-surface" data-lightbox-dismiss>
  {#if source}
    <img
      class="lightbox-image"
      class:failed={displayFailed}
      src={source}
      srcset={sourceSet}
      sizes="100vw"
      width={photo.width}
      height={photo.height}
      alt={photo.name}
      draggable="false"
      onerror={() => {
        displayFailed = true
      }}
    />
  {/if}
  {#if message}
    <div class="image-status">
      <p role="status">{message}</p>
      {#if loadState === 'failed' || displayFailed}
        <button type="button" onclick={retry}>Retry photo</button>
      {/if}
    </div>
  {/if}
</div>

<style>
  .image-surface {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    min-height: 0;
    min-width: 0;
    animation: photo-appear 140ms ease-out;
  }

  .lightbox-image {
    display: block;
    max-width: 100%;
    max-height: 100%;
    width: 100%;
    height: 100%;
    object-fit: contain;
    user-select: none;
    -webkit-user-drag: none;
  }

  .lightbox-image.failed {
    visibility: hidden;
  }
  .image-status {
    position: absolute;
    bottom: var(--space-4);
    max-width: 100%;
    padding: var(--space-3) var(--space-4);
    background: var(--color-bg);
    color: var(--color-text-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    text-align: center;
    font-size: var(--text-sm);
  }
  .image-status p {
    margin: 0;
  }
  .image-status button {
    min-height: 44px;
    margin-top: var(--space-2);
    padding: var(--space-2) var(--space-4);
    background: var(--color-surface);
    color: var(--color-text);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    cursor: pointer;
  }
  .image-status button:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 3px;
  }
  @keyframes photo-appear {
    from {
      opacity: 0.65;
    }
    to {
      opacity: 1;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .image-surface {
      animation: none;
    }
  }
</style>
