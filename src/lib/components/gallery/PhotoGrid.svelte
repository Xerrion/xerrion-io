<script lang="ts">
	import type { Photo, PhotoCategory } from '$lib/gallery';
	import { motion } from '@humanspeak/svelte-motion';

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

	function getCategoryInfo(slug: string): PhotoCategory | undefined {
		return categories.find((c) => c.slug === slug);
	}
</script>

{#if photos.length > 0}
	<div class="photo-masonry" class:grid-hidden={!visible}>
		{#each photos as photo, index (photo.id)}
			<motion.figure
				class="photo-card"
				initial={{ opacity: 0, scale: 0.92, y: 24 }}
				whileInView={{ opacity: 1, scale: 1, y: 0 }}
				viewport={{ once: true, margin: "100px" }}
				transition={{ duration: 0.6, delay: Math.min(index, 15) * 0.06, ease: [0.16, 1, 0.3, 1] }}
			>
				<motion.button
					class="photo-button"
					whileHover={{ y: -4, transition: { duration: 0.15 } }}
					whileTap={{ scale: 0.98 }}
					onclick={() => onphotoclick(photo)}
					aria-label="View {photo.name} in fullscreen"
				>
					<div class="photo-shimmer"></div>
					<img
						src={photo.thumbUrl || photo.url}
						alt={photo.name}
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
				</motion.button>
				{#if selectedCategory === null}
					{@const categoryInfo = getCategoryInfo(photo.category)}
					{#if categoryInfo}
						<figcaption class="photo-badge">{categoryInfo.name}</figcaption>
					{/if}
				{/if}
			</motion.figure>
		{/each}
	</div>
{:else}
	<div class="empty-state">
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
	:global(.photo-card) {
		break-inside: avoid;
		margin: 0 0 var(--space-4);
		padding: 0;
		position: relative;
		border-radius: var(--radius-xl);
		overflow: hidden;
	}

	:global(.photo-button) {
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
	}

	:global(.photo-button:hover) {
		box-shadow: var(--shadow-lg);
	}

	:global(.photo-button:focus-visible) {
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
	:global(.photo-button img) {
		display: block;
		width: 100%;
		height: auto;
		opacity: 0;
		filter: blur(8px);
		transform: scale(1.04);
		transition: opacity 0.5s ease, filter 0.6s ease, transform 0.6s ease;
	}

	:global(.photo-button img.loaded) {
		opacity: 1;
		filter: blur(0);
		transform: scale(1);
	}

	:global(.photo-button:hover img.loaded) {
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

	:global(.photo-button:hover) .photo-overlay,
	:global(.photo-button:focus-visible) .photo-overlay {
		opacity: 1;
	}

	.expand-icon {
		color: white;
		filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
		transform: translateY(4px);
		opacity: 0;
		transition: transform 0.3s ease, opacity 0.3s ease;
	}

	:global(.photo-button:hover) .expand-icon,
	:global(.photo-button:focus-visible) .expand-icon {
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

	/* ===== Empty State ===== */
	.empty-state {
		text-align: center;
		padding: var(--space-24) var(--space-4);
		animation: fadeInUp 0.5s ease-out;
	}

	@keyframes fadeInUp {
		from { opacity: 0; transform: translateY(12px); }
		to { opacity: 1; transform: translateY(0); }
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

		:global(.photo-card) {
			margin-bottom: var(--space-2);
			border-radius: var(--radius-lg);
		}

		:global(.photo-button) {
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
		:global(.photo-button img) {
			opacity: 1;
			filter: none;
			transform: none;
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

		.photo-masonry {
			transition: none;
		}
	}
</style>
