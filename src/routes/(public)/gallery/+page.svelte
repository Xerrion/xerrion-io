<script lang="ts">
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
			photosByCategory: Record<string, Photo[]>;
			totalPhotos: number;
			error: string | null;
		};
	}

	let { data }: Props = $props();

	let selectedCategory = $state<string | null>(null);
	let lightboxPhoto = $state<Photo | null>(null);
	let gridVisible = $state(true);

	const displayedPhotos = $derived.by(() => {
		if (selectedCategory === null) {
			return Object.values(data.photosByCategory)
				.flat()
				.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
		}
		return data.photosByCategory[selectedCategory] || [];
	});

	const photoCounts = $derived.by(() => {
		const counts: Record<string, number> = {};
		for (const [slug, photos] of Object.entries(data.photosByCategory)) {
			counts[slug] = photos.length;
		}
		return counts;
	});

	function selectCategory(slug: string | null) {
		if (slug === selectedCategory) return;
		gridVisible = false;
		setTimeout(() => {
			selectedCategory = slug;
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
		const nextIndex = (currentIndex + direction + photos.length) % photos.length;
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
				photoCounts={photoCounts}
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
</style>
