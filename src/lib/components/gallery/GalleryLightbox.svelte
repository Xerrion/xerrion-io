<script lang="ts">
	import type { Photo, PhotoCategory } from '$lib/gallery';
	import { tick } from 'svelte';

	interface Props {
		photo: Photo | null;
		photos: Photo[];
		categories: PhotoCategory[];
		onclose: () => void;
		onnavigate: (direction: 1 | -1) => void;
	}

	let { photo, photos, categories, onclose, onnavigate }: Props = $props();

	const currentIndex = $derived(photo ? photos.findIndex((p) => p.id === photo!.id) : -1);

	// Adjacent photos for carousel peek
	const prevPhoto = $derived(currentIndex > 0 ? photos[currentIndex - 1] : null);
	const nextPhoto = $derived(currentIndex < photos.length - 1 ? photos[currentIndex + 1] : null);

	// ─── Visibility state (controls DOM mount, decoupled from `photo` for exit anim) ───
	let showLightbox = $state(false);
	let displayedPhoto = $state<Photo | null>(null);

	// Navigation & closing state
	let isNavigating = $state(false);
	let isClosing = $state(false);
	let trackEl = $state<HTMLElement | null>(null);
	let backdropEl = $state<HTMLElement | null>(null);
	let bgEl = $state<HTMLElement | null>(null);
	let headerEl = $state<HTMLElement | null>(null);
	let footerEl = $state<HTMLElement | null>(null);
	let imageWrapperEl = $state<HTMLElement | null>(null);
	let currentSlideAnim: Animation | null = null;

	const SLIDE_DURATION = 280;
	const SLIDE_EASING = 'cubic-bezier(0.32, 0.72, 0, 1)';
	const OPEN_DURATION = 400;
	const CLOSE_DURATION = 300;
	const OPEN_EASING = 'cubic-bezier(0.16, 1, 0.3, 1)';
	const CLOSE_EASING = 'cubic-bezier(0.4, 0, 0.2, 1)';

	// Check reduced motion preference
	const prefersReducedMotion = $derived(
		typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
	);

	// ─── Open/close lifecycle ─────────────────────────────────────

	$effect(() => {
		if (photo && !showLightbox && !isClosing) {
			displayedPhoto = photo;
			showLightbox = true;
			tick().then(animateOpen);
		} else if (photo && showLightbox) {
			displayedPhoto = photo;
		}
	});

	function animateOpen() {
		if (prefersReducedMotion) return;

		bgEl?.animate(
			[{ opacity: 0 }, { opacity: 1 }],
			{ duration: OPEN_DURATION * 0.75, easing: OPEN_EASING, fill: 'forwards' }
		);

		headerEl?.animate(
			[
				{ opacity: 0, transform: 'translateY(-10px)' },
				{ opacity: 1, transform: 'translateY(0)' }
			],
			{ duration: OPEN_DURATION * 0.75, easing: OPEN_EASING, delay: 80, fill: 'forwards' }
		);

		imageWrapperEl?.animate(
			[
				{ opacity: 0, transform: 'scale(0.85)', filter: 'blur(12px)' },
				{ opacity: 1, transform: 'scale(1)', filter: 'blur(0px)' }
			],
			{ duration: OPEN_DURATION, easing: OPEN_EASING, fill: 'forwards' }
		);

		footerEl?.animate(
			[
				{ opacity: 0, transform: 'translateY(10px)' },
				{ opacity: 1, transform: 'translateY(0)' }
			],
			{ duration: OPEN_DURATION * 0.75, easing: OPEN_EASING, delay: 120, fill: 'forwards' }
		);
	}

	async function animateClose() {
		if (prefersReducedMotion) {
			showLightbox = false;
			displayedPhoto = null;
			return;
		}

		const animations: Animation[] = [];

		const bgAnim = bgEl?.animate(
			[{ opacity: 1 }, { opacity: 0 }],
			{ duration: CLOSE_DURATION, easing: CLOSE_EASING, fill: 'forwards' }
		);
		if (bgAnim) animations.push(bgAnim);

		const headerAnim = headerEl?.animate(
			[
				{ opacity: 1, transform: 'translateY(0)' },
				{ opacity: 0, transform: 'translateY(-10px)' }
			],
			{ duration: CLOSE_DURATION * 0.8, easing: CLOSE_EASING, fill: 'forwards' }
		);
		if (headerAnim) animations.push(headerAnim);

		const imgAnim = imageWrapperEl?.animate(
			[
				{ opacity: 1, transform: 'scale(1)', filter: 'blur(0px)' },
				{ opacity: 0, transform: 'scale(0.9)', filter: 'blur(8px)' }
			],
			{ duration: CLOSE_DURATION, easing: CLOSE_EASING, fill: 'forwards' }
		);
		if (imgAnim) animations.push(imgAnim);

		const footerAnim = footerEl?.animate(
			[
				{ opacity: 1, transform: 'translateY(0)' },
				{ opacity: 0, transform: 'translateY(10px)' }
			],
			{ duration: CLOSE_DURATION * 0.8, easing: CLOSE_EASING, fill: 'forwards' }
		);
		if (footerAnim) animations.push(footerAnim);

		await Promise.all(animations.map((a) => a.finished));
		showLightbox = false;
		displayedPhoto = null;
	}

	// Swipe-down close: continues from gesture position instead of resetting
	async function animateSwipeClose(currentY: number, currentOpacity: number) {
		if (prefersReducedMotion) {
			showLightbox = false;
			displayedPhoto = null;
			return;
		}

		const animations: Animation[] = [];
		const duration = CLOSE_DURATION;

		// Background: continue fading from current opacity
		const bgAnim = bgEl?.animate(
			[{ opacity: currentOpacity }, { opacity: 0 }],
			{ duration, easing: CLOSE_EASING, fill: 'forwards' }
		);
		if (bgAnim) animations.push(bgAnim);

		// Header: fade + slide up
		const headerAnim = headerEl?.animate(
			[
				{ opacity: 1, transform: 'translateY(0)' },
				{ opacity: 0, transform: 'translateY(-20px)' }
			],
			{ duration: duration * 0.7, easing: CLOSE_EASING, fill: 'forwards' }
		);
		if (headerAnim) animations.push(headerAnim);

		// Image: continue sliding down from current position + scale down + fade
		const imgAnim = imageWrapperEl?.animate(
			[
				{ transform: `translateY(${currentY}px) scale(1)`, opacity: 1 },
				{ transform: `translateY(${currentY + 120}px) scale(0.85)`, opacity: 0 }
			],
			{ duration, easing: CLOSE_EASING, fill: 'forwards' }
		);
		if (imgAnim) animations.push(imgAnim);

		// Footer: fade + slide down
		const footerAnim = footerEl?.animate(
			[
				{ opacity: 1, transform: 'translateY(0)' },
				{ opacity: 0, transform: 'translateY(20px)' }
			],
			{ duration: duration * 0.7, easing: CLOSE_EASING, fill: 'forwards' }
		);
		if (footerAnim) animations.push(footerAnim);

		await Promise.all(animations.map((a) => a.finished));
		showLightbox = false;
		displayedPhoto = null;
	}

	// Reset state when lightbox fully closes
	$effect(() => {
		if (!showLightbox) {
			isNavigating = false;
			isClosing = false;
			currentSlideAnim?.cancel();
			currentSlideAnim = null;
		}
	});

	// Register touchmove with { passive: false } so we can preventDefault
	$effect(() => {
		const el = backdropEl;
		if (!el) return;
		el.addEventListener('touchmove', handleTouchMove, { passive: false });
		return () => el.removeEventListener('touchmove', handleTouchMove);
	});

	function handleClose() {
		if (isClosing) return;
		isClosing = true;
		onclose();
		animateClose();
	}

	// ─── Navigation (imperative slide via Web Animations API) ──────

	async function handleNavigate(direction: 1 | -1) {
		if (isNavigating || isClosing) return;

		if (direction === -1 && currentIndex <= 0) return;
		if (direction === 1 && currentIndex >= photos.length - 1) return;

		isNavigating = true;

		const target = direction === 1 ? '-200%' : '0%';

		if (trackEl && !prefersReducedMotion) {
			currentSlideAnim?.cancel();
			const currentTransform = trackEl.style.transform || 'translateX(-100%)';
			const anim = trackEl.animate(
				[
					{ transform: currentTransform },
					{ transform: `translateX(${target})` }
				],
				{ duration: SLIDE_DURATION, easing: SLIDE_EASING, fill: 'forwards' }
			);
			currentSlideAnim = anim;
			await anim.finished;
		}

		onnavigate(direction);
		await tick();

		// Reset track position instantly
		if (trackEl) {
			currentSlideAnim?.cancel();
			trackEl.style.transform = 'translateX(-100%)';
		}

		isNavigating = false;
	}

	// ─── Touch/swipe gesture support ───────────────────────────────

	let touchStartX = 0;
	let touchStartY = 0;
	let touchDeltaX = 0;
	let touchDeltaY = 0;
	let isSwiping = false;
	let swipeDirection: 'none' | 'horizontal' | 'vertical' = 'none';
	let swipeHintShown = $state(false);

	const SWIPE_THRESHOLD = 50;
	const SWIPE_Y_THRESHOLD = 80;
	const DIRECTION_LOCK_THRESHOLD = 8;
	const DAMPEN_X = 0.4;
	const DAMPEN_Y = 0.5;

	function handleTouchStart(event: TouchEvent) {
		if (isNavigating || isClosing) return;
		const touch = event.touches[0];
		touchStartX = touch.clientX;
		touchStartY = touch.clientY;
		touchDeltaX = 0;
		touchDeltaY = 0;
		isSwiping = true;
		swipeDirection = 'none';
	}

	function handleTouchMove(event: TouchEvent) {
		if (!isSwiping) return;
		const touch = event.touches[0];
		touchDeltaX = touch.clientX - touchStartX;
		touchDeltaY = touch.clientY - touchStartY;

		// Lock direction after passing threshold
		if (swipeDirection === 'none') {
			if (Math.abs(touchDeltaX) > DIRECTION_LOCK_THRESHOLD || Math.abs(touchDeltaY) > DIRECTION_LOCK_THRESHOLD) {
				swipeDirection = Math.abs(touchDeltaX) > Math.abs(touchDeltaY) ? 'horizontal' : 'vertical';
			} else {
				return; // Not enough movement to determine direction
			}
		}

		if (swipeDirection === 'horizontal') {
			event.preventDefault();
			// Move the track horizontally
			const dampened = touchDeltaX * DAMPEN_X;
			if (trackEl) {
				trackEl.style.transform = `translateX(calc(-100% + ${dampened}px))`;
			}
		} else if (swipeDirection === 'vertical' && touchDeltaY > 0) {
			event.preventDefault();
			// Move the image wrapper down + scale + fade bg
			const dampened = touchDeltaY * DAMPEN_Y;
			const progress = Math.min(touchDeltaY / 300, 1);
			const scale = 1 - progress * 0.1;
			const bgOpacity = Math.max(0.2, 1 - progress * 0.8);

			if (imageWrapperEl) {
				imageWrapperEl.style.transform = `translateY(${dampened}px) scale(${scale})`;
			}
			if (bgEl) {
				bgEl.style.opacity = String(bgOpacity);
			}
		}
	}

	function handleTouchEnd() {
		if (!isSwiping) return;
		isSwiping = false;

		const dir = swipeDirection;
		const dx = touchDeltaX;
		const dy = touchDeltaY;

		if (dir === 'horizontal') {
			if (dx < -SWIPE_THRESHOLD) {
				handleNavigate(1);
			} else if (dx > SWIPE_THRESHOLD) {
				handleNavigate(-1);
			} else {
				// Snap back horizontally
				snapBackTrack(dx);
			}
		} else if (dir === 'vertical' && dy > 0) {
			if (dy > SWIPE_Y_THRESHOLD) {
				// Close with swipe-down: continue from current position
				const progress = Math.min(dy / 300, 1);
				const currentY = dy * DAMPEN_Y;
				const bgOpacity = Math.max(0.2, 1 - progress * 0.8);
				isClosing = true;
				onclose();
				animateSwipeClose(currentY, bgOpacity);
			} else {
				// Snap back vertically
				snapBackVertical(dy);
			}
		} else {
			// No meaningful gesture — reset
			touchDeltaX = 0;
			touchDeltaY = 0;
		}

		swipeDirection = 'none';

		if (!swipeHintShown) {
			swipeHintShown = true;
		}
	}

	function snapBackTrack(fromDeltaX: number) {
		if (trackEl && !prefersReducedMotion) {
			const dampened = fromDeltaX * DAMPEN_X;
			const anim = trackEl.animate(
				[
					{ transform: `translateX(calc(-100% + ${dampened}px))` },
					{ transform: 'translateX(-100%)' }
				],
				{ duration: 250, easing: OPEN_EASING, fill: 'forwards' }
			);
			anim.onfinish = () => {
				if (trackEl) trackEl.style.transform = 'translateX(-100%)';
				anim.cancel();
			};
		} else if (trackEl) {
			trackEl.style.transform = 'translateX(-100%)';
		}
		touchDeltaX = 0;
		touchDeltaY = 0;
	}

	function snapBackVertical(fromDeltaY: number) {
		if (!prefersReducedMotion) {
			const dampened = fromDeltaY * DAMPEN_Y;
			const progress = Math.min(fromDeltaY / 300, 1);
			const scale = 1 - progress * 0.1;
			const bgOpacity = Math.max(0.2, 1 - progress * 0.8);

			// Snap image wrapper back
			if (imageWrapperEl) {
				const anim = imageWrapperEl.animate(
					[
						{ transform: `translateY(${dampened}px) scale(${scale})` },
						{ transform: 'translateY(0) scale(1)' }
					],
					{ duration: 300, easing: OPEN_EASING, fill: 'forwards' }
				);
				anim.onfinish = () => {
					if (imageWrapperEl) imageWrapperEl.style.transform = '';
					anim.cancel();
				};
			}

			// Snap bg opacity back
			if (bgEl) {
				const anim = bgEl.animate(
					[{ opacity: bgOpacity }, { opacity: 1 }],
					{ duration: 300, easing: OPEN_EASING, fill: 'forwards' }
				);
				anim.onfinish = () => {
					if (bgEl) bgEl.style.opacity = '';
					anim.cancel();
				};
			}
		} else {
			if (imageWrapperEl) imageWrapperEl.style.transform = '';
			if (bgEl) bgEl.style.opacity = '';
		}
		touchDeltaX = 0;
		touchDeltaY = 0;
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') handleClose();
		if (event.key === 'ArrowLeft') handleNavigate(-1);
		if (event.key === 'ArrowRight') handleNavigate(1);
	}

	function getCategoryName(slug: string): string | undefined {
		return categories.find((c) => c.slug === slug)?.name;
	}
</script>

<svelte:window onkeydown={showLightbox ? handleKeydown : undefined} />

{#if showLightbox && displayedPhoto}
	{@const currentPhoto = displayedPhoto}
	<div
		class="lightbox-backdrop"
		role="dialog"
		aria-modal="true"
		aria-label="Photo viewer"
		tabindex="-1"
	>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="lightbox-touch-layer"
			bind:this={backdropEl}
			ontouchstart={handleTouchStart}
			ontouchend={handleTouchEnd}
		>
		<div
			class="lightbox-bg"
			bind:this={bgEl}
		></div>

		<div class="lightbox-header" bind:this={headerEl}>
			<span class="lightbox-counter">
				{currentIndex + 1} / {photos.length}
			</span>
			<button class="lightbox-btn lightbox-close" onclick={handleClose} aria-label="Close viewer">
				<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<line x1="18" y1="6" x2="6" y2="18"></line>
					<line x1="6" y1="6" x2="18" y2="18"></line>
				</svg>
			</button>
		</div>

		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="lightbox-body" onclick={handleClose}>
			<button
				class="lightbox-btn lightbox-nav lightbox-prev"
				onclick={(e) => { e.stopPropagation(); handleNavigate(-1); }}
				aria-label="Previous photo"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<polyline points="15 18 9 12 15 6"></polyline>
				</svg>
			</button>

			<div
				class="lightbox-image-wrapper"
				bind:this={imageWrapperEl}
				onclick={(e) => e.stopPropagation()}
			>
				<div
					class="lightbox-track"
					bind:this={trackEl}
				>
					<!-- Previous photo slot -->
					<div class="lightbox-slide">
						{#if prevPhoto}
							<img
								class="lightbox-image"
								src={prevPhoto.fullUrl || prevPhoto.url}
								alt={prevPhoto.name}
							/>
						{/if}
					</div>
					<!-- Current photo slot -->
					<div class="lightbox-slide">
						<img
							class="lightbox-image"
							src={currentPhoto.fullUrl || currentPhoto.url}
							alt={currentPhoto.name}
						/>
					</div>
					<!-- Next photo slot -->
					<div class="lightbox-slide">
						{#if nextPhoto}
							<img
								class="lightbox-image"
								src={nextPhoto.fullUrl || nextPhoto.url}
								alt={nextPhoto.name}
							/>
						{/if}
					</div>
				</div>
			</div>

			<button
				class="lightbox-btn lightbox-nav lightbox-next"
				onclick={(e) => { e.stopPropagation(); handleNavigate(1); }}
				aria-label="Next photo"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<polyline points="9 18 15 12 9 6"></polyline>
				</svg>
			</button>
		</div>

		<div class="lightbox-footer" bind:this={footerEl}>
			{#if getCategoryName(currentPhoto.category)}
				<span class="lightbox-category">{getCategoryName(currentPhoto.category)}</span>
			{/if}
			{#if !swipeHintShown && photos.length > 1}
				<span class="swipe-hint">Swipe to navigate</span>
			{/if}
		</div>
		</div>
	</div>
{/if}

<style>
	.lightbox-backdrop {
		position: fixed;
		inset: 0;
		z-index: 1000;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.lightbox-touch-layer {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-height: 0;
	}

	.lightbox-bg {
		position: absolute;
		inset: 0;
		background-color: rgba(0, 0, 0, 0.92);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		z-index: 0;
	}

	.lightbox-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-4) var(--space-6);
		flex-shrink: 0;
		position: relative;
		z-index: 1;
		opacity: 0;
	}

	.lightbox-counter {
		font-size: var(--text-sm);
		color: rgba(255, 255, 255, 0.7);
		font-variant-numeric: tabular-nums;
		font-weight: 500;
	}

	.lightbox-body {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
		min-height: 0;
		padding: 0 var(--space-16);
		z-index: 2;
	}

	.lightbox-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(255, 255, 255, 0.08);
		border: none;
		color: white;
		cursor: pointer;
		transition: background-color var(--transition-fast), transform var(--transition-fast);
		border-radius: var(--radius-full);
	}

	.lightbox-btn:hover {
		background: rgba(255, 255, 255, 0.15);
	}

	.lightbox-btn:active {
		transform: scale(0.95);
	}

	.lightbox-close {
		width: 40px;
		height: 40px;
	}

	.lightbox-nav {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		width: 48px;
		height: 48px;
		z-index: 10;
	}

	.lightbox-nav:hover {
		transform: translateY(-50%) scale(1.05);
	}

	.lightbox-prev {
		left: var(--space-4);
	}

	.lightbox-next {
		right: var(--space-4);
	}

	.lightbox-image-wrapper {
		width: calc(100vw - 160px);
		max-height: calc(100vh - 160px);
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
		will-change: transform;
		z-index: 2;
		opacity: 0;
	}

	.lightbox-track {
		display: flex;
		width: 300%;
		transform: translateX(-100%);
		will-change: transform;
	}

	.lightbox-slide {
		width: 100%;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.lightbox-image {
		max-width: 100%;
		max-height: calc(100vh - 160px);
		object-fit: contain;
		border-radius: var(--radius-lg);
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
		user-select: none;
		-webkit-user-drag: none;
	}

	.lightbox-footer {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-4) var(--space-6);
		flex-shrink: 0;
		min-height: 48px;
		position: relative;
		z-index: 1;
		opacity: 0;
	}

	.lightbox-category {
		font-size: var(--text-sm);
		color: rgba(255, 255, 255, 0.6);
		background: rgba(255, 255, 255, 0.08);
		padding: var(--space-1) var(--space-3);
		border-radius: var(--radius-full);
		font-weight: 500;
	}

	.swipe-hint {
		font-size: var(--text-xs);
		color: rgba(255, 255, 255, 0.4);
		animation: swipeHintFade 3s ease-out forwards;
		display: none;
	}

	@keyframes swipeHintFade {
		0% { opacity: 0; }
		15% { opacity: 1; }
		70% { opacity: 1; }
		100% { opacity: 0; }
	}

	/* ===== Responsive ===== */
	@media (max-width: 768px) {
		.lightbox-body {
			padding: 0;
		}

		.lightbox-header {
			padding: var(--space-3) var(--space-4);
		}

		.lightbox-footer {
			padding: var(--space-3) var(--space-4);
			gap: var(--space-2);
		}

		.lightbox-image-wrapper {
			width: 100vw;
			max-height: calc(100vh - 120px);
		}

		.lightbox-image {
			max-height: calc(100vh - 120px);
			border-radius: 0;
		}
	}

	/* Hide nav buttons on touch devices — swipe instead */
	@media (pointer: coarse) {
		.lightbox-nav {
			display: none;
		}

		.swipe-hint {
			display: inline;
		}

		.lightbox-body {
			padding: 0;
		}

		.lightbox-image-wrapper {
			width: 100vw;
		}
	}

	/* ===== Reduced Motion ===== */
	@media (prefers-reduced-motion: reduce) {
		.lightbox-header,
		.lightbox-footer,
		.lightbox-image-wrapper {
			opacity: 1;
		}
	}
</style>
