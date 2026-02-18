<script lang="ts">
	import SEOHead from '$lib/components/SEOHead.svelte';
	import { breadcrumbSchema } from '$lib/seo';
	import type { PhotoCategory, Photo } from '$lib/gallery';

	interface Props {
		data: {
			categories: PhotoCategory[];
			photosByCategory: Record<string, Photo[]>;
			totalPhotos: number;
		};
	}

	let { data }: Props = $props();

	let selectedCategory = $state<string | null>(null);
	let lightboxPhoto = $state<Photo | null>(null);

	const displayedPhotos = $derived(() => {
		if (selectedCategory === null) {
			// Show all photos, mixed
			return Object.values(data.photosByCategory)
				.flat()
				.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
		}
		return data.photosByCategory[selectedCategory] || [];
	});

	function openLightbox(photo: Photo) {
		lightboxPhoto = photo;
		document.body.style.overflow = 'hidden';
	}

	function closeLightbox() {
		lightboxPhoto = null;
		document.body.style.overflow = '';
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && lightboxPhoto) {
			closeLightbox();
		}
	}

	function getCategoryInfo(slug: string): PhotoCategory | undefined {
		return data.categories.find((c) => c.slug === slug);
	}
</script>

<SEOHead
	title="Gallery"
	description="Photos from everyday life - Charlie the golden retriever, food, places, and random moments captured by Lasse Skovgaard Nielsen."
	jsonLd={breadcrumbSchema([
		{ name: 'Home', url: '/' },
		{ name: 'Gallery', url: '/gallery' }
	])}
/>

<svelte:window onkeydown={handleKeydown} />

<div class="gallery-page">
	<div class="container">
		<header class="gallery-header">
			<h1>📸 Gallery</h1>
			<p class="subtitle">Photos from life. Mostly Charlie, let's be honest.</p>
		</header>

		<!-- Category Filter -->
		<div class="category-filter">
			<button
				class="filter-btn"
				class:active={selectedCategory === null}
				onclick={() => (selectedCategory = null)}
			>
				All ({data.totalPhotos})
			</button>
			{#each data.categories as category}
				{@const count = data.photosByCategory[category.slug]?.length || 0}
				{#if count > 0}
					<button
						class="filter-btn"
						class:active={selectedCategory === category.slug}
						onclick={() => (selectedCategory = category.slug)}
					>
						{category.name} ({count})
					</button>
				{/if}
			{/each}
		</div>

		<!-- Photo Grid -->
		{#if displayedPhotos().length > 0}
			<div class="photo-grid">
				{#each displayedPhotos() as photo (photo.id)}
					<button class="photo-card" onclick={() => openLightbox(photo)}>
						<img src={photo.url} alt={photo.name} loading="lazy" />
						{#if selectedCategory === null}
							{@const categoryInfo = getCategoryInfo(photo.category)}
							{#if categoryInfo}
								<span class="photo-category">{categoryInfo.name}</span>
							{/if}
						{/if}
					</button>
				{/each}
			</div>
		{:else}
			<div class="empty-state">
				<span class="empty-emoji">📷</span>
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
	</div>
</div>

<!-- Lightbox -->
{#if lightboxPhoto}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<dialog
		class="lightbox"
		open
		onclick={closeLightbox}
		onkeydown={(e) => e.key === 'Escape' && closeLightbox()}
	>
		<button class="lightbox-close" onclick={closeLightbox} aria-label="Close">
			<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<line x1="18" y1="6" x2="6" y2="18"></line>
				<line x1="6" y1="6" x2="18" y2="18"></line>
			</svg>
		</button>
		<div class="lightbox-content">
			<img src={lightboxPhoto.url} alt={lightboxPhoto.name} />
		</div>
	</dialog>
{/if}

<style>
	.gallery-page {
		padding: var(--space-16) 0;
		min-height: calc(100vh - var(--header-height) - 200px);
	}

	.gallery-header {
		margin-bottom: var(--space-8);
	}

	.gallery-header h1 {
		font-size: var(--text-4xl);
		margin-bottom: var(--space-2);
	}

	.subtitle {
		font-size: var(--text-lg);
		color: var(--color-text-muted);
		margin: 0;
	}

	/* Category Filter */
	.category-filter {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		margin-bottom: var(--space-8);
	}

	.filter-btn {
		padding: var(--space-2) var(--space-4);
		background-color: var(--color-bg-secondary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-full);
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.filter-btn:hover {
		background-color: var(--color-bg-tertiary);
		color: var(--color-text);
	}

	.filter-btn.active {
		background-color: var(--color-primary);
		border-color: var(--color-primary);
		color: white;
	}

	/* Photo Grid */
	.photo-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
		gap: var(--space-4);
	}

	.photo-card {
		position: relative;
		aspect-ratio: 1;
		overflow: hidden;
		border-radius: var(--radius-xl);
		border: none;
		padding: 0;
		cursor: pointer;
		background-color: var(--color-bg-tertiary);
		transition: transform var(--transition-base), box-shadow var(--transition-base);
	}

	.photo-card:hover {
		transform: scale(1.02);
		box-shadow: var(--shadow-lg);
	}

	.photo-card img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform var(--transition-slow);
	}

	.photo-card:hover img {
		transform: scale(1.05);
	}

	.photo-category {
		position: absolute;
		bottom: var(--space-3);
		left: var(--space-3);
		padding: var(--space-1) var(--space-3);
		background-color: rgba(0, 0, 0, 0.7);
		backdrop-filter: blur(4px);
		border-radius: var(--radius-full);
		font-size: var(--text-xs);
		color: white;
		font-weight: 500;
	}

	/* Empty State */
	.empty-state {
		text-align: center;
		padding: var(--space-16);
	}

	.empty-emoji {
		font-size: 4rem;
		display: block;
		margin-bottom: var(--space-4);
	}

	.empty-state h2 {
		font-size: var(--text-2xl);
		margin-bottom: var(--space-2);
	}

	.empty-state p {
		color: var(--color-text-muted);
	}

	/* Lightbox */
	.lightbox {
		position: fixed;
		inset: 0;
		z-index: 1000;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: rgba(0, 0, 0, 0.9);
		backdrop-filter: blur(8px);
		animation: fadeIn 0.2s ease;
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	.lightbox-close {
		position: absolute;
		top: var(--space-4);
		right: var(--space-4);
		padding: var(--space-2);
		background: rgba(255, 255, 255, 0.1);
		border: none;
		border-radius: var(--radius-full);
		color: white;
		cursor: pointer;
		transition: background-color var(--transition-fast);
	}

	.lightbox-close:hover {
		background: rgba(255, 255, 255, 0.2);
	}

	.lightbox-content {
		max-width: 90vw;
		max-height: 90vh;
	}

	.lightbox-content img {
		max-width: 100%;
		max-height: 90vh;
		object-fit: contain;
		border-radius: var(--radius-lg);
	}

	@media (max-width: 768px) {
		.gallery-header h1 {
			font-size: var(--text-3xl);
		}

		.photo-grid {
			grid-template-columns: repeat(2, 1fr);
			gap: var(--space-2);
		}

		.photo-card {
			border-radius: var(--radius-lg);
		}
	}
</style>
