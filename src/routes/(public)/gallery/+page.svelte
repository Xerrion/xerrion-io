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
	let gridVisible = $state(true);

	const displayedPhotos = $derived(() => {
		if (selectedCategory === null) {
			return Object.values(data.photosByCategory)
				.flat()
				.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
		}
		return data.photosByCategory[selectedCategory] || [];
	});

	const lightboxIndex = $derived(() => {
		if (!lightboxPhoto) return -1;
		return displayedPhotos().findIndex((p) => p.id === lightboxPhoto!.id);
	});

	function selectCategory(slug: string | null) {
		if (slug === selectedCategory) return;
		gridVisible = false;
		setTimeout(() => {
			selectedCategory = slug;
			gridVisible = true;
		}, 200);
	}

	function openLightbox(photo: Photo) {
		lightboxPhoto = photo;
		document.body.style.overflow = 'hidden';
	}

	function closeLightbox() {
		lightboxPhoto = null;
		document.body.style.overflow = '';
	}

	function navigateLightbox(direction: 1 | -1) {
		const photos = displayedPhotos();
		const currentIndex = lightboxIndex();
		if (currentIndex === -1) return;
		const nextIndex = (currentIndex + direction + photos.length) % photos.length;
		lightboxPhoto = photos[nextIndex];
	}

	function handleKeydown(event: KeyboardEvent) {
		if (!lightboxPhoto) return;
		if (event.key === 'Escape') closeLightbox();
		if (event.key === 'ArrowLeft') navigateLightbox(-1);
		if (event.key === 'ArrowRight') navigateLightbox(1);
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
		if (!lightboxPhoto) return;
		const touch = event.touches[0];
		touchStartX = touch.clientX;
		touchStartY = touch.clientY;
		touchDeltaX = 0;
		touchDeltaY = 0;
		isSwiping = true;
	}

	function handleTouchMove(event: TouchEvent) {
		if (!isSwiping || !lightboxPhoto) return;
		const touch = event.touches[0];
		touchDeltaX = touch.clientX - touchStartX;
		touchDeltaY = touch.clientY - touchStartY;

		// Prevent default scroll when swiping horizontally
		if (Math.abs(touchDeltaX) > 10) {
			event.preventDefault();
		}
	}

	function handleTouchEnd() {
		if (!isSwiping || !lightboxPhoto) return;
		isSwiping = false;

		// Swipe left → next photo
		if (touchDeltaX < -SWIPE_THRESHOLD && Math.abs(touchDeltaY) < Math.abs(touchDeltaX)) {
			navigateLightbox(1);
		}
		// Swipe right → previous photo
		else if (touchDeltaX > SWIPE_THRESHOLD && Math.abs(touchDeltaY) < Math.abs(touchDeltaX)) {
			navigateLightbox(-1);
		}
		// Swipe down → close
		else if (touchDeltaY > SWIPE_Y_THRESHOLD && Math.abs(touchDeltaX) < Math.abs(touchDeltaY)) {
			closeLightbox();
		}

		touchDeltaX = 0;
		touchDeltaY = 0;

		// Hide swipe hint after first interaction
		if (!swipeHintShown) {
			swipeHintShown = true;
		}
	}

	// Compute transform for swipe feedback
	const swipeTransform = $derived(() => {
		if (!isSwiping || (touchDeltaX === 0 && touchDeltaY === 0)) return '';
		// Horizontal drag: follow finger with dampening
		if (Math.abs(touchDeltaX) > Math.abs(touchDeltaY)) {
			const dampened = touchDeltaX * 0.4;
			return `translateX(${dampened}px)`;
		}
		// Vertical drag down: follow finger with opacity fade hint
		if (touchDeltaY > 0) {
			const dampened = touchDeltaY * 0.3;
			return `translateY(${dampened}px)`;
		}
		return '';
	});

	const swipeOpacity = $derived(() => {
		if (!isSwiping || touchDeltaY <= 0) return 1;
		// Fade out as user swipes down
		return Math.max(0.3, 1 - (touchDeltaY / 400));
	});

	function onImageLoad(event: Event) {
		const img = event.target as HTMLImageElement;
		img.classList.add('loaded');
		// Hide the shimmer sibling
		const shimmer = img.previousElementSibling;
		if (shimmer?.classList.contains('photo-shimmer')) {
			shimmer.classList.add('loaded');
		}
	}

	function getCategoryInfo(slug: string): PhotoCategory | undefined {
		return data.categories.find((c) => c.slug === slug);
	}

	function observeCard(node: HTMLElement, _index: number) {
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						node.classList.add('visible');
						observer.unobserve(node);
					}
				});
			},
			{ threshold: 0.1, rootMargin: '50px' }
		);
		observer.observe(node);
		return {
			destroy() {
				observer.disconnect();
			}
		};
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
			<h1>Gallery</h1>
			<p class="subtitle">Photos from life. Mostly Charlie, let's be honest.</p>
		</header>

		<!-- Category Filter -->
		<nav class="category-filter" aria-label="Photo categories">
			<button
				class="filter-btn"
				class:active={selectedCategory === null}
				onclick={() => selectCategory(null)}
			>
				All
				<span class="filter-count">{data.totalPhotos}</span>
			</button>
			{#each data.categories as category}
				{@const count = data.photosByCategory[category.slug]?.length || 0}
				{#if count > 0}
					<button
						class="filter-btn"
						class:active={selectedCategory === category.slug}
						onclick={() => selectCategory(category.slug)}
					>
						{category.name}
						<span class="filter-count">{count}</span>
					</button>
				{/if}
			{/each}
		</nav>

		{#if selectedCategory}
			{@const info = getCategoryInfo(selectedCategory)}
			{#if info?.description}
				<p class="category-description">{info.description}</p>
			{/if}
		{/if}

		<!-- Photo Grid -->
		{#if displayedPhotos().length > 0}
			<div class="photo-masonry" class:grid-hidden={!gridVisible}>
				{#each displayedPhotos() as photo, index (photo.id)}
					<figure
						class="photo-card"
						style="--stagger: {Math.min(index, 15)}"
						use:observeCard={index}
					>
						<button
							class="photo-button"
							onclick={() => openLightbox(photo)}
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
	</div>
</div>

<!-- Lightbox -->
{#if lightboxPhoto}
	<div
		class="lightbox-backdrop"
		role="dialog"
		aria-modal="true"
		aria-label="Photo viewer"
		tabindex="-1"
		style:opacity={swipeOpacity()}
		ontouchstart={handleTouchStart}
		ontouchmove={handleTouchMove}
		ontouchend={handleTouchEnd}
	>
		<div class="lightbox-header">
			<span class="lightbox-counter">
				{lightboxIndex() + 1} / {displayedPhotos().length}
			</span>
			<button class="lightbox-btn lightbox-close" onclick={closeLightbox} aria-label="Close viewer">
				<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<line x1="18" y1="6" x2="6" y2="18"></line>
					<line x1="6" y1="6" x2="18" y2="18"></line>
				</svg>
			</button>
		</div>

		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="lightbox-body" onclick={closeLightbox}>
			<button
				class="lightbox-btn lightbox-nav lightbox-prev"
				onclick={(e) => { e.stopPropagation(); navigateLightbox(-1); }}
				aria-label="Previous photo"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<polyline points="15 18 9 12 15 6"></polyline>
				</svg>
			</button>

			<div
				class="lightbox-image-wrapper"
				onclick={(e) => e.stopPropagation()}
				style:transform={swipeTransform()}
			>
				{#key lightboxPhoto.id}
					<img
						class="lightbox-image"
						src={lightboxPhoto.fullUrl || lightboxPhoto.url}
						alt={lightboxPhoto.name}
					/>
				{/key}
			</div>

			<button
				class="lightbox-btn lightbox-nav lightbox-next"
				onclick={(e) => { e.stopPropagation(); navigateLightbox(1); }}
				aria-label="Next photo"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<polyline points="9 18 15 12 9 6"></polyline>
				</svg>
			</button>
		</div>

		<div class="lightbox-footer">
			{#if getCategoryInfo(lightboxPhoto.category)}
				<span class="lightbox-category">{getCategoryInfo(lightboxPhoto.category)?.name}</span>
			{/if}
			{#if !swipeHintShown && displayedPhotos().length > 1}
				<span class="swipe-hint">Swipe to navigate</span>
			{/if}
		</div>
	</div>
{/if}

<style>
	/* ===== Page Layout ===== */
	.gallery-page {
		padding: var(--space-16) 0 var(--space-24);
		min-height: calc(100vh - var(--header-height) - 200px);
	}

	.gallery-header {
		margin-bottom: var(--space-8);
		animation: fadeInDown 0.5s ease-out;
	}

	@keyframes fadeInDown {
		from { opacity: 0; transform: translateY(-12px); }
		to { opacity: 1; transform: translateY(0); }
	}

	.gallery-header h1 {
		font-size: var(--text-4xl);
		margin-bottom: var(--space-2);
		letter-spacing: -0.02em;
	}

	.subtitle {
		font-size: var(--text-lg);
		color: var(--color-text-muted);
		margin: 0;
	}

	/* ===== Category Filter ===== */
	.category-filter {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		margin-bottom: var(--space-4);
		animation: fadeInUp 0.5s ease-out 0.1s both;
	}

	@keyframes fadeInUp {
		from { opacity: 0; transform: translateY(12px); }
		to { opacity: 1; transform: translateY(0); }
	}

	.category-description {
		color: var(--color-text-muted);
		font-size: var(--text-sm);
		margin: 0 0 var(--space-6);
		animation: fadeIn 0.3s ease-out;
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	.filter-btn {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-4);
		background-color: var(--color-bg-secondary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-full);
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
		cursor: pointer;
		transition: all var(--transition-base);
		font-weight: 500;
	}

	.filter-btn:hover {
		background-color: var(--color-bg-tertiary);
		border-color: var(--color-border-hover);
		color: var(--color-text);
		transform: translateY(-1px);
	}

	.filter-btn.active {
		background-color: var(--color-primary);
		border-color: var(--color-primary);
		color: white;
		box-shadow: 0 2px 8px rgba(91, 94, 224, 0.3);
	}

	:global([data-theme="dark"]) .filter-btn.active {
		box-shadow: 0 2px 8px rgba(129, 140, 248, 0.25);
	}

	.filter-count {
		font-size: var(--text-xs);
		opacity: 0.7;
		font-weight: 400;
	}

	/* ===== Photo Masonry Grid ===== */
	.photo-masonry {
		columns: 3;
		column-gap: var(--space-4);
		transition: opacity 0.2s ease;
	}

	.photo-masonry.grid-hidden {
		opacity: 0;
	}

	/* ===== Photo Card ===== */
	.photo-card {
		break-inside: avoid;
		margin: 0 0 var(--space-4);
		padding: 0;
		position: relative;
		border-radius: var(--radius-xl);
		overflow: hidden;
		opacity: 0;
		transform: translateY(20px);
		transition: opacity 0.5s ease-out, transform 0.5s ease-out;
		transition-delay: calc(var(--stagger) * 50ms);
	}

	.photo-card:global(.visible) {
		opacity: 1;
		transform: translateY(0);
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
		transition: opacity 0.4s ease, transform 0.4s ease;
	}

	.photo-button img:global(.loaded) {
		opacity: 1;
	}

	.photo-button:hover img:global(.loaded) {
		transform: scale(1.04);
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
	}

	/* ===== Empty State ===== */
	.empty-state {
		text-align: center;
		padding: var(--space-24) var(--space-4);
		animation: fadeInUp 0.5s ease-out;
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

	/* ===== Lightbox ===== */
	.lightbox-backdrop {
		position: fixed;
		inset: 0;
		z-index: 1000;
		background-color: rgba(0, 0, 0, 0.92);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		display: flex;
		flex-direction: column;
		animation: lightboxIn 0.25s ease-out;
	}

	@keyframes lightboxIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	.lightbox-header {
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

	.lightbox-image-wrapper {
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
		animation: imageReveal 0.3s ease-out;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
	}

	@keyframes imageReveal {
		from { opacity: 0; transform: scale(0.97); }
		to { opacity: 1; transform: scale(1); }
	}

	.lightbox-footer {
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
	@media (max-width: 1024px) {
		.photo-masonry {
			columns: 2;
		}
	}

	@media (max-width: 768px) {
		.gallery-page {
			padding: var(--space-8) 0 var(--space-16);
		}

		.gallery-header h1 {
			font-size: var(--text-3xl);
		}

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

		.lightbox-image-wrapper {
			max-width: 100vw;
		}
	}

	@media (max-width: 480px) {
		.photo-masonry {
			columns: 1;
		}

		.filter-btn {
			font-size: var(--text-xs);
			padding: var(--space-1) var(--space-3);
		}
	}

	/* ===== Reduced Motion ===== */
	@media (prefers-reduced-motion: reduce) {
		.photo-card {
			opacity: 1;
			transform: none;
			transition: none;
		}

		.gallery-header,
		.category-filter,
		.category-description,
		.empty-state {
			animation: none;
		}

		.photo-shimmer {
			animation: none;
		}

		.lightbox-backdrop {
			animation: none;
		}

		.lightbox-image {
			animation: none;
		}

		.photo-masonry {
			transition: none;
		}
	}
</style>
