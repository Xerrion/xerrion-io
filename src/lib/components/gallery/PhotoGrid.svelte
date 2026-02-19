<script lang="ts">
	import type { Photo, PhotoCategory } from '$lib/gallery';
	import { fadeIn as waapiFadeIn, fadeInUp as waapiFadeInUp } from '$lib/utils/animate';

	interface Props {
		photos: Photo[];
		categories: PhotoCategory[];
		selectedCategory: string | null;
		visible: boolean;
		onphotoclick: (photo: Photo) => void;
	}

	let { photos, categories, selectedCategory, visible, onphotoclick }: Props = $props();

	function onImageLoad(event: Event) {
		const img = event.target as HTMLImageElement;
		img.classList.add('loaded');
		const shimmer = img.previousElementSibling;
		if (shimmer?.classList.contains('photo-shimmer')) {
			shimmer.classList.add('loaded');
		}
	}

	// Coordinate staggering for batches of items revealing together
	let nextStaggerDelay = 0;
	let staggerResetTimer: ReturnType<typeof setTimeout> | null = null;
	const STAGGER_INCREMENT = 50; // ms between items in a batch

	function revealOnScroll(node: HTMLElement) {
		const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

		const observer = new IntersectionObserver(
			(entries) => {
				const intersecting = entries.filter(e => e.isIntersecting);
				if (intersecting.length > 0) {
					// Disconnect observer for these elements immediately
					observer.disconnect();

					if (reducedMotion) {
						node.style.opacity = '1';
						node.style.transform = 'none';
						return;
					}

					// Get grid container for relative positioning
					const container = node.closest('.photo-masonry');
					
					let delay = 0;
					
					if (container) {
						// We want the delay to be based on position relative to the VIEWPORT,
						// not the container. This ensures the "ripple" effect happens 
						// where the user is looking, regardless of how far down the page they are.
						
						const rect = node.getBoundingClientRect();
						
						// X is relative to container (left-to-right sweep)
						// We still need container rect for this
						const containerRect = container.getBoundingClientRect();
						const relativeX = rect.left - containerRect.left;
						
						// Y is relative to the viewport top
						// We use Math.max(0, ...) because rect.top can be negative if 
						// the observer fires late or we scroll past fast
						const relativeY = Math.max(0, rect.top);
						
						// Create a diagonal wave front (x + y)
						// 0.5ms per pixel of distance roughly
						const waveFront = (relativeX * 0.5) + (relativeY * 0.5);
						
						// Cap delay to prevent items waiting too long
						// Since we are now viewport-relative, the max delay naturally 
						// caps based on screen height, but we keep a safety cap.
						delay = Math.min(waveFront * 0.5, 400); 
					} else {
						// Fallback if we can't measure
						delay = nextStaggerDelay;
						nextStaggerDelay += STAGGER_INCREMENT;
						
						// Reset fallback counter
						if (staggerResetTimer) clearTimeout(staggerResetTimer);
						staggerResetTimer = setTimeout(() => {
							nextStaggerDelay = 0;
						}, 100);
					}

					node.animate(
						[
							{ opacity: 0, transform: 'scale(0.85) translateY(20px)', filter: 'blur(4px)' },
							{ opacity: 1, transform: 'scale(1) translateY(0)', filter: 'blur(0px)' }
						],
						{
							duration: 600,
							easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)', // Snappier ease-out
							delay,
							fill: 'forwards'
						}
					);
				}
			},
			{ rootMargin: '50px' }
		);
		observer.observe(node);

		return {
			destroy() {
				observer.disconnect();
			}
		};
	}

	function getCategoryInfo(slug: string): PhotoCategory | undefined {
		return categories.find((c) => c.slug === slug);
	}
</script>

{#if photos.length > 0}
	<div class="photo-grid-wrapper">
		<!-- Skeleton loader — visible during category switch transition -->
		{#if !visible}
			<div class="photo-masonry skeleton-grid" aria-hidden="true" use:waapiFadeIn={{ duration: 200 }}>
				{#each photos as photo, i (photo.id)}
					<div
						class="skeleton-card"
						style:aspect-ratio={photo.width && photo.height ? `${photo.width} / ${photo.height}` : '3 / 4'}
					></div>
				{/each}
			</div>
		{/if}

		<div class="photo-masonry" class:grid-hidden={!visible}>
		{#each photos as photo, index (photo.id)}
			<figure
				class="photo-card"
				use:revealOnScroll
			>
				<button
					class="photo-button"
					onclick={() => onphotoclick(photo)}
					aria-label="View {photo.name} in fullscreen"
				>
					<div class="photo-shimmer"></div>
					<img
						src={photo.thumbUrl || photo.url}
						alt={photo.name}
						width={photo.width}
						height={photo.height}
						loading="lazy"
						onload={onImageLoad}
					/>
					<div class="photo-overlay">
						<svg class="expand-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
						<figcaption class="photo-badge">{categoryInfo.name}</figcaption>
					{/if}
				{/if}
			</figure>
		{/each}
	</div>
	</div>
{:else}
	<div class="empty-state" use:waapiFadeInUp={{ duration: 500 }}>
		<div class="empty-icon">
			<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
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
		columns: 3;
		column-gap: var(--space-4);
		transition: opacity 0.3s ease, transform 0.3s ease;
	}

	.photo-masonry.grid-hidden {
		opacity: 0;
		transform: scale(0.98);
	}

	/* ===== Photo Card ===== */
	.photo-card {
		break-inside: avoid;
		margin: 0 0 var(--space-4);
		padding: 0;
		position: relative;
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
		transition: box-shadow var(--transition-fast), transform var(--transition-fast);
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
		to { background-position: -200% 0; }
	}

	/* Image */
	.photo-button img {
		display: block;
		width: 100%;
		height: auto;
		opacity: 0;
		filter: blur(8px);
		transform: scale(1.04);
		transition: opacity 0.5s ease, filter 0.6s ease, transform 0.6s ease;
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
		background: linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 50%);
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
		color: white;
		filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
		transform: translateY(4px);
		opacity: 0;
		transition: transform 0.3s ease, opacity 0.3s ease;
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
		background-color: rgba(0, 0, 0, 0.6);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		border-radius: var(--radius-full);
		font-size: var(--text-xs);
		color: white;
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
		break-inside: avoid;
		margin: 0 0 var(--space-4);
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
	@media (max-width: 1024px) {
		.photo-masonry {
			columns: 2;
		}
	}

	@media (max-width: 768px) {
		.photo-masonry {
			columns: 2;
			column-gap: var(--space-2);
		}

		.photo-card {
			margin-bottom: var(--space-2);
			border-radius: var(--radius-lg);
		}

		.photo-button {
			border-radius: var(--radius-lg);
		}

		.skeleton-card {
			margin-bottom: var(--space-2);
			border-radius: var(--radius-lg);
		}
	}

	@media (max-width: 480px) {
		.photo-masonry {
			columns: 1;
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
	}
</style>
