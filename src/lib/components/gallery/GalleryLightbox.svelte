<script lang="ts">
  import Icon from '$lib/components/Icon.svelte'
  import type { Photo, PhotoCategory } from '$lib/gallery'

  import GalleryLightboxImage from './GalleryLightboxImage.svelte'

  interface Props {
    photo: Photo | null
    photos: Photo[]
    categories: PhotoCategory[]
    onclose: () => void
    onnavigate: (direction: 1 | -1) => void
  }

  interface PointerStart {
    id: number
    x: number
    y: number
    target: EventTarget | null
    photoId: string
  }

  let { photo, photos, categories, onclose, onnavigate }: Props = $props()
  let dialog = $state<HTMLDialogElement>()
  const currentIndex = $derived(
    photos.findIndex((item) => item.id === photo?.id)
  )
  const isOpen = $derived(photo !== null && currentIndex >= 0)
  const category = $derived(
    categories.find((item) => item.slug === photo?.category)
  )
  let swipe: PointerStart | null = null
  let backdropPress: PointerStart | null = null

  // Selection owns the lifecycle. Animations never delay navigation or closing.
  $effect(() => {
    if (!dialog || !isOpen) return
    const modal = dialog
    const trigger = document.activeElement
    modal.showModal()
    document.body.classList.add('gallery-lightbox-open')

    return () => {
      swipe = null
      backdropPress = null
      modal.close()
      document.body.classList.remove('gallery-lightbox-open')
      if (trigger instanceof HTMLElement && trigger.isConnected) {
        trigger.focus({ preventScroll: true })
      }
    }
  })

  function navigate(direction: 1 | -1): void {
    swipe = null
    backdropPress = null
    if (isOpen && photos[currentIndex + direction]) onnavigate(direction)
  }

  function close(): void {
    swipe = null
    backdropPress = null
    if (isOpen) onclose()
  }

  function handleCancel(event: Event): void {
    event.preventDefault()
    close()
  }

  function handleNativeClose(): void {
    // A native close event can arrive after the viewer has reopened.
    if (!dialog?.open && isOpen) close()
  }

  function handleKeydown(event: KeyboardEvent): void {
    // A successful retry removes its button, so focus can temporarily be on body.
    if (!isOpen || !dialog?.open) return
    if (
      event.defaultPrevented ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    )
      return
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    navigate(event.key === 'ArrowLeft' ? -1 : 1)
  }

  function cancelPointer(): void {
    swipe = null
    backdropPress = null
  }

  function isBackground(event: PointerEvent): boolean {
    const target = event.target
    if (!(target instanceof HTMLElement)) return false
    if (target.hasAttribute('data-lightbox-dismiss')) return true
    if (!(target instanceof HTMLImageElement) || !target.naturalWidth)
      return false

    // The image element fills the stage. Only the letterbox around its bitmap dismisses.
    const box = target.getBoundingClientRect()
    const scale = Math.min(
      box.width / target.naturalWidth,
      box.height / target.naturalHeight
    )
    const width = target.naturalWidth * scale
    const height = target.naturalHeight * scale
    const left = box.x + (box.width - width) / 2
    const top = box.y + (box.height - height) / 2
    return (
      event.clientX < left ||
      event.clientX > left + width ||
      event.clientY < top ||
      event.clientY > top + height
    )
  }

  function handlePointerDown(event: PointerEvent): void {
    cancelPointer()
    if (!event.isPrimary || event.button !== 0 || !photo) return
    if (
      !(event.target instanceof HTMLElement) ||
      event.target.closest('button')
    )
      return
    const start: PointerStart = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      target: event.target,
      photoId: photo.id
    }
    if (isBackground(event)) backdropPress = start
    if (
      event.pointerType === 'touch' &&
      event.target.closest('.lightbox-image-wrapper') &&
      (window.visualViewport?.scale ?? 1) <= 1
    )
      swipe = start
  }

  function handlePointerMove(event: PointerEvent): void {
    if (
      backdropPress?.id === event.pointerId &&
      Math.hypot(
        event.clientX - backdropPress.x,
        event.clientY - backdropPress.y
      ) > 8
    ) {
      backdropPress = null
    }
    if (swipe?.id !== event.pointerId) return
    const dx = Math.abs(event.clientX - swipe.x)
    const dy = Math.abs(event.clientY - swipe.y)
    // Once a gesture goes vertically, it cannot turn into photo navigation.
    if (dy > 12 && dy >= dx) swipe = null
  }

  function handlePointerUp(event: PointerEvent): void {
    const gesture = swipe
    const backdrop = backdropPress
    cancelPointer()
    if (!photo) return
    if (gesture?.id === event.pointerId && gesture.photoId === photo.id) {
      const dx = event.clientX - gesture.x
      const dy = event.clientY - gesture.y
      if (
        Math.abs(dx) >= 48 &&
        Math.abs(dx) > Math.abs(dy) * 1.5 &&
        (window.visualViewport?.scale ?? 1) <= 1
      ) {
        navigate(dx < 0 ? 1 : -1)
        return
      }
    }
    if (
      backdrop?.id === event.pointerId &&
      backdrop.photoId === photo.id &&
      backdrop.target === event.target &&
      isBackground(event) &&
      Math.hypot(event.clientX - backdrop.x, event.clientY - backdrop.y) <= 8
    )
      close()
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<dialog
  bind:this={dialog}
  class="lightbox"
  aria-label="Photo viewer"
  oncancel={handleCancel}
  onclose={handleNativeClose}
  onpointerdown={handlePointerDown}
  onpointermove={handlePointerMove}
  onpointerup={handlePointerUp}
  onpointercancel={cancelPointer}
>
  {#if photo && isOpen}
    <header class="lightbox-header">
      <div class="photo-caption">
        {#if category}<p class="lightbox-category">{category.name}</p>{/if}
        <h2 class="photo-title" title={photo.name}>{photo.name}</h2>
      </div>
      <button
        type="button"
        class="lightbox-btn lightbox-close"
        onclick={close}
        aria-label="Close viewer"
      >
        <Icon name="x" size="lg" />
      </button>
    </header>

    <div class="lightbox-image-wrapper" data-lightbox-dismiss>
      {#key photo.id}
        <GalleryLightboxImage {photo} />
      {/key}
    </div>

    <footer class="lightbox-footer">
      <p class="keyboard-hint">Use ← → to browse <span>·</span> Esc to close</p>
      <p class="touch-hint">Swipe or use the arrows</p>
      <nav class="photo-navigation" aria-label="Photo navigation">
        <button
          type="button"
          class="lightbox-btn lightbox-prev"
          onclick={() => navigate(-1)}
          disabled={currentIndex === 0}
          aria-label="Previous photo"
        >
          <span class="previous-icon"
            ><Icon name="chevron-right" size="lg" /></span
          >
        </button>
        <p class="lightbox-counter" aria-live="polite" aria-atomic="true">
          {currentIndex + 1} / {photos.length}
        </p>
        <button
          type="button"
          class="lightbox-btn"
          onclick={() => navigate(1)}
          disabled={currentIndex === photos.length - 1}
          aria-label="Next photo"
        >
          <Icon name="chevron-right" size="lg" />
        </button>
      </nav>
    </footer>
  {/if}
</dialog>

<style>
  :global(body.gallery-lightbox-open) {
    overflow: hidden;
  }

  .lightbox {
    position: fixed;
    inset: 0;
    width: 100%;
    max-width: none;
    height: 100dvh;
    max-height: none;
    margin: 0;
    padding: 0;
    border: 0;
    background: var(--color-bg);
    color: var(--color-text);
    overflow: hidden;
    overscroll-behavior: contain;
  }

  .lightbox[open] {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto;
  }
  .lightbox::backdrop {
    background: var(--color-overlay-heavy);
  }

  .lightbox-header,
  .lightbox-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    padding: var(--space-4) max(var(--space-6), env(safe-area-inset-right))
      var(--space-4) max(var(--space-6), env(safe-area-inset-left));
  }

  .lightbox-header {
    padding-top: max(var(--space-4), env(safe-area-inset-top));
  }
  .lightbox-footer {
    padding-bottom: max(var(--space-4), env(safe-area-inset-bottom));
  }
  .photo-caption {
    min-width: 0;
  }
  .lightbox-category {
    color: var(--color-text-muted);
    font-size: var(--text-xs);
    margin: 0 0 var(--space-1);
  }
  .photo-title {
    font-size: var(--text-base);
    font-weight: 400;
    margin: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .lightbox-image-wrapper {
    min-width: 0;
    min-height: 0;
    padding-inline: var(--space-6);
    touch-action: pan-y pinch-zoom;
  }

  .lightbox-btn {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: var(--space-12);
    height: var(--space-12);
    padding: 0;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-full);
    background: var(--color-surface);
    color: var(--color-text);
    cursor: pointer;
  }

  .lightbox-btn:disabled {
    opacity: 0.35;
    cursor: default;
  }
  .lightbox-btn:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 3px;
  }
  .photo-navigation {
    display: flex;
    align-items: center;
    gap: var(--space-4);
  }
  .previous-icon {
    transform: rotate(180deg);
  }
  .lightbox-counter {
    min-width: 7ch;
    margin: 0;
    text-align: center;
    font-size: var(--text-sm);
    font-variant-numeric: tabular-nums;
  }
  .keyboard-hint,
  .touch-hint {
    margin: 0;
    color: var(--color-text-muted);
    font-size: var(--text-xs);
  }
  .keyboard-hint span {
    margin-inline: var(--space-2);
  }
  .touch-hint {
    display: none;
  }

  @media (hover: hover) {
    .lightbox-btn:hover:enabled {
      background: var(--color-surface-hover);
      border-color: var(--color-border-hover);
    }
  }
  @media (pointer: coarse) {
    .keyboard-hint {
      display: none;
    }
    .touch-hint {
      display: block;
    }
  }
  @media (max-width: 600px) {
    .lightbox-header,
    .lightbox-footer {
      padding-inline: max(var(--space-4), env(safe-area-inset-left))
        max(var(--space-4), env(safe-area-inset-right));
    }
    .lightbox-image-wrapper {
      padding-inline: var(--space-2);
    }
    .lightbox-footer {
      flex-direction: column-reverse;
      gap: var(--space-3);
    }
    .keyboard-hint {
      display: none;
    }
    .touch-hint {
      display: block;
    }
  }
  @media (max-height: 450px) {
    .lightbox-header,
    .lightbox-footer {
      padding-block: var(--space-2);
    }
    .lightbox-category,
    .keyboard-hint,
    .touch-hint {
      display: none;
    }
    .lightbox-footer {
      flex-direction: row;
      justify-content: center;
    }
  }
</style>
