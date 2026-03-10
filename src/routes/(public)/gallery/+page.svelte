<script lang="ts">
	import { untrack } from 'svelte';
	import SEOHead from '$lib/components/SEOHead.svelte';
	import CategoryFilter from '$lib/components/gallery/CategoryFilter.svelte';
	import PhotoGrid from '$lib/components/gallery/PhotoGrid.svelte';
	import GalleryLightbox from '$lib/components/gallery/GalleryLightbox.svelte';
	import { breadcrumbSchema } from '$lib/seo';
	import type { PhotoCategory, Photo } from '$lib/gallery';
	import { fadeInDown, fadeInUp } from '$lib/utils/animate';

	interface Props {
		data: {
			categories: PhotoCategory[];
			initialPhotos: Photo[];
			photoCounts: Record<string, number>;
			totalPhotos: number;
			error: string | null;
		};
	}

	let { data }: Props = $props();

	let selectedCategory = $state<string | null>(null);
	let lightboxPhoto = $state<Photo | null>(null);
	let gridVisible = $state(true);

	let allPhotos = $state<Photo[]>(untrack(() => data.initialPhotos));
	let loadingMore = $state(false);
	let hasMore = $state(untrack(() => data.initialPhotos.length >= 20));
	let sentinel = $state<HTMLElement | null>(null);

	const displayedPhotos = $derived(allPhotos);

	async function fetchPhotos(category: string | null, offset: number) {
		const params = new URLSearchParams();
		if (category) params.set('category', category);
		params.set('offset', offset.toString());
		params.set('limit', '20');

		const res = await fetch(`/api/gallery/photos?${params.toString()}`);
		const json = await res.json();
		// Convert dates back to Date objects
		return (json.photos || []).map((p: any) => ({
			...p,
			createdAt: new Date(p.createdAt)
		})) as Photo[];
	}

	async function loadMore() {
		if (loadingMore || !hasMore) return;
		loadingMore = true;

		try {
			const newPhotos = await fetchPhotos(selectedCategory, allPhotos.length);
			if (newPhotos.length === 0) {
				hasMore = false;
			} else {
				const existingIds = new Set(allPhotos.map((p) => p.id));
				const uniqueNew = newPhotos.filter((p) => !existingIds.has(p.id));
				allPhotos = [...allPhotos, ...uniqueNew];
				if (newPhotos.length < 20) {
					hasMore = false;
				}
			}
		} catch (error) {
			console.error('Failed to load more photos:', error);
		} finally {
			loadingMore = false;
		}
	}

	$effect(() => {
		if (!sentinel) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting) {
					if (!loadingMore && hasMore) {
						loadMore();
					}
				}
			},
			{ rootMargin: '400px' }
		);

		observer.observe(sentinel);
		return () => observer.disconnect();
	});

	function selectCategory(slug: string | null) {
		if (slug === selectedCategory) return;
		gridVisible = false;
		
		setTimeout(async () => {
			selectedCategory = slug;
			allPhotos = [];
			hasMore = true;
			loadingMore = true;

			try {
				const photos = await fetchPhotos(slug, 0);
				allPhotos = photos;
				if (photos.length < 20) hasMore = false;
			} catch (error) {
				console.error('Failed to load category photos:', error);
			} finally {
				loadingMore = false;
			}

			requestAnimationFrame(() => {
				gridVisible = true;
			});
		}, 300);
	}

	function openLightbox(photo: Photo) {
		lightboxPhoto = photo;
		document.body.style.overflow = 'hidden';
	}

	function closeLightbox() {
		lightboxPhoto = null;
		document.body.style.overflow = '';
	}

	// Safety: restore body scroll if component unmounts while lightbox is open
	$effect(() => {
		return () => {
			document.body.style.overflow = '';
		};
	});

	function navigateLightbox(direction: 1 | -1) {
		const photos = displayedPhotos;
		const currentIndex = lightboxPhoto ? photos.findIndex((p) => p.id === lightboxPhoto!.id) : -1;
		if (currentIndex === -1) return;
		const nextIndex = currentIndex + direction;
		if (nextIndex < 0 || nextIndex >= photos.length) return;
		lightboxPhoto = photos[nextIndex];
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

<div class="gallery-page">
	<div class="container">
		<header class="gallery-header" use:fadeInDown={{ duration: 500, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }}>
			<h1>Gallery</h1>
			<p class="subtitle">Photos from life. Mostly Charlie, let's be honest.</p>
		</header>

		{#if data.error}
			<div class="gallery-error">
				<p>Gallery is temporarily unavailable. Please try again later.</p>
			</div>
		{:else}
			<CategoryFilter
				categories={data.categories}
				photoCounts={data.photoCounts}
				totalPhotos={data.totalPhotos}
				{selectedCategory}
				onselect={selectCategory}
			/>

			{#if selectedCategory}
				{@const info = getCategoryInfo(selectedCategory)}
				{#if info?.description}
					<p class="category-description" use:fadeInUp={{ duration: 350 }}>
						{info.description}
					</p>
				{/if}
			{/if}

			<PhotoGrid
				photos={displayedPhotos}
				categories={data.categories}
				{selectedCategory}
				visible={gridVisible}
				onphotoclick={openLightbox}
			/>

			{#if hasMore}
				<div class="sentinel" bind:this={sentinel}>
					{#if loadingMore}
						<div class="loading-spinner"></div>
					{/if}
				</div>
			{/if}
		{/if}
	</div>
</div>

<GalleryLightbox
	photo={lightboxPhoto}
	photos={displayedPhotos}
	categories={data.categories}
	onclose={closeLightbox}
	onnavigate={navigateLightbox}
/>

<style>
	.gallery-page {
		padding: var(--space-16) 0 var(--space-24);
		min-height: calc(100vh - var(--header-height) - 200px);
	}

	.gallery-header {
		margin-bottom: var(--space-8);
	}

	.gallery-header h1 {
		font-size: var(--text-4xl);
		margin-bottom: var(--space-2);
		letter-spacing: -0.03em;
	}

	.subtitle {
		font-size: var(--text-lg);
		color: var(--color-text-muted);
		margin: 0;
	}

	.category-description {
		color: var(--color-text-muted);
		font-size: var(--text-sm);
		margin: 0 0 var(--space-6);
	}

	@media (max-width: 768px) {
		.gallery-page {
			padding: var(--space-8) 0 var(--space-16);
		}

		.gallery-header h1 {
			font-size: var(--text-3xl);
		}
	}

	.gallery-error {
		text-align: center;
		padding: var(--space-16) var(--space-4);
		color: var(--color-text-muted);
		font-size: var(--text-lg);
	}

	.sentinel {
		display: flex;
		justify-content: center;
		padding: var(--space-8) 0;
		min-height: 80px;
	}

	.loading-spinner {
		width: 32px;
		height: 32px;
		border: 3px solid var(--color-border);
		border-top-color: var(--color-primary);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
