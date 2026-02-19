<script lang="ts">
	import type { Photo, PhotoCategory } from '$lib/gallery';
	import { motion, AnimatePresence } from '@humanspeak/svelte-motion';

	interface Props {
		photo: Photo | null;
		photos: Photo[];
		categories: PhotoCategory[];
		onclose: () => void;
		onnavigate: (direction: 1 | -1) => void;
	}

	let { photo, photos, categories, onclose, onnavigate }: Props = $props();

	const isOpen = $derived(photo !== null);
	const currentIndex = $derived(photo ? photos.findIndex((p) => p.id === photo!.id) : -1);

	function handleClose() {
		onclose();
	}

	// Touch/swipe gesture support
	let touchStartX = $state(0);
	let touchStartY = $state(0);
	let touchDeltaX = $state(0);
	let touchDeltaY = $state(0);
	let isSwiping = $state(false);
	let swipeHintShown = $state(false);

	const SWIPE_THRESHOLD = 50;
	const SWIPE_Y_THRESHOLD = 100;

	function handleTouchStart(event: TouchEvent) {
		const touch = event.touches[0];
		touchStartX = touch.clientX;
		touchStartY = touch.clientY;
		touchDeltaX = 0;
		touchDeltaY = 0;
		isSwiping = true;
	}

	function handleTouchMove(event: TouchEvent) {
		if (!isSwiping) return;
		const touch = event.touches[0];
		touchDeltaX = touch.clientX - touchStartX;
		touchDeltaY = touch.clientY - touchStartY;

		if (Math.abs(touchDeltaX) > 10) {
			event.preventDefault();
		}
	}

	function handleTouchEnd() {
		if (!isSwiping) return;
		isSwiping = false;

		if (touchDeltaX < -SWIPE_THRESHOLD && Math.abs(touchDeltaY) < Math.abs(touchDeltaX)) {
			onnavigate(1);
		} else if (touchDeltaX > SWIPE_THRESHOLD && Math.abs(touchDeltaY) < Math.abs(touchDeltaX)) {
			onnavigate(-1);
		} else if (touchDeltaY > SWIPE_Y_THRESHOLD && Math.abs(touchDeltaX) < Math.abs(touchDeltaY)) {
			handleClose();
		}

		touchDeltaX = 0;
		touchDeltaY = 0;

		if (!swipeHintShown) {
			swipeHintShown = true;
		}
	}

	const swipeTransform = $derived(() => {
		if (!isSwiping || (touchDeltaX === 0 && touchDeltaY === 0)) return '';
		if (Math.abs(touchDeltaX) > Math.abs(touchDeltaY)) {
			const dampened = touchDeltaX * 0.4;
			return `translateX(${dampened}px)`;
		}
		if (touchDeltaY > 0) {
			const dampened = touchDeltaY * 0.3;
			return `translateY(${dampened}px)`;
		}
		return '';
	});

	const swipeOpacity = $derived(() => {
		if (!isSwiping || touchDeltaY <= 0) return 1;
		return Math.max(0.3, 1 - (touchDeltaY / 400));
	});

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') handleClose();
		if (event.key === 'ArrowLeft') onnavigate(-1);
		if (event.key === 'ArrowRight') onnavigate(1);
	}

	function getCategoryName(slug: string): string | undefined {
		return categories.find((c) => c.slug === slug)?.name;
	}
</script>

<svelte:window onkeydown={isOpen ? handleKeydown : undefined} />

<AnimatePresence>
{#if photo}
	{@const currentPhoto = photo}
<motion.div
	class="lightbox-backdrop"
	role="dialog"
	aria-modal="true"
	aria-label="Photo viewer"
	tabindex="-1"
	style={`opacity: ${swipeOpacity()}`}
	ontouchstart={handleTouchStart}
	ontouchmove={handleTouchMove}
	ontouchend={handleTouchEnd}
	initial={{ opacity: 0 }}
	animate={{ opacity: 1 }}
	exit={{ opacity: 0 }}
	transition={{ duration: 0.3 }}
>
	<motion.div
		class="lightbox-header"
		initial={{ opacity: 0, y: -10 }}
		animate={{ opacity: 1, y: 0 }}
		transition={{ duration: 0.35, delay: 0.1 }}
	>
		<span class="lightbox-counter">
			{currentIndex + 1} / {photos.length}
		</span>
		<button class="lightbox-btn lightbox-close" onclick={handleClose} aria-label="Close viewer">
			<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<line x1="18" y1="6" x2="6" y2="18"></line>
				<line x1="6" y1="6" x2="18" y2="18"></line>
			</svg>
		</button>
	</motion.div>

	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="lightbox-body" onclick={handleClose}>
		<button
			class="lightbox-btn lightbox-nav lightbox-prev"
			onclick={(e) => { e.stopPropagation(); onnavigate(-1); }}
			aria-label="Previous photo"
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<polyline points="15 18 9 12 15 6"></polyline>
			</svg>
		</button>

		<motion.div
			class="lightbox-image-wrapper"
			onclick={(e: MouseEvent) => e.stopPropagation()}
			style={`transform: ${swipeTransform()}`}
			initial={{ opacity: 0, scale: 0.94 }}
			animate={{ opacity: 1, scale: 1 }}
			transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
		>
		{#key currentPhoto.id}
			<img
				class="lightbox-image"
				src={currentPhoto.fullUrl || currentPhoto.url}
				alt={currentPhoto.name}
			/>
			{/key}
		</motion.div>

		<button
			class="lightbox-btn lightbox-nav lightbox-next"
			onclick={(e) => { e.stopPropagation(); onnavigate(1); }}
			aria-label="Next photo"
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<polyline points="9 18 15 12 9 6"></polyline>
			</svg>
		</button>
	</div>

	<motion.div
		class="lightbox-footer"
		initial={{ opacity: 0, y: 10 }}
		animate={{ opacity: 1, y: 0 }}
		transition={{ duration: 0.35, delay: 0.15 }}
	>
	{#if getCategoryName(currentPhoto.category)}
		<span class="lightbox-category">{getCategoryName(currentPhoto.category)}</span>
		{/if}
		{#if !swipeHintShown && photos.length > 1}
			<span class="swipe-hint">Swipe to navigate</span>
		{/if}
	</motion.div>
</motion.div>
{/if}
</AnimatePresence>

<style>
	:global(.lightbox-backdrop) {
		position: fixed;
		inset: 0;
		z-index: 1000;
		background-color: rgba(0, 0, 0, 0.92);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		display: flex;
		flex-direction: column;
	}

	:global(.lightbox-header) {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-4) var(--space-6);
		flex-shrink: 0;
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

	:global(.lightbox-image-wrapper) {
		max-width: calc(100vw - 160px);
		max-height: calc(100vh - 160px);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: transform 0.1s ease-out;
		will-change: transform;
	}

	.lightbox-image {
		max-width: 100%;
		max-height: calc(100vh - 160px);
		object-fit: contain;
		border-radius: var(--radius-lg);
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
	}

	:global(.lightbox-footer) {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-4) var(--space-6);
		flex-shrink: 0;
		min-height: 48px;
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

		:global(.lightbox-header) {
			padding: var(--space-3) var(--space-4);
		}

		:global(.lightbox-footer) {
			padding: var(--space-3) var(--space-4);
			gap: var(--space-2);
		}

		:global(.lightbox-image-wrapper) {
			max-width: 100vw;
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

		:global(.lightbox-image-wrapper) {
			max-width: 100vw;
		}
	}

	/* ===== Reduced Motion ===== */
	@media (prefers-reduced-motion: reduce) {
		/* Motion is now handled by motion.div */
	}
</style>
