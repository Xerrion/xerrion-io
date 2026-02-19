<script lang="ts">
	import type { PhotoCategory } from '$lib/gallery';

	interface Props {
		categories: PhotoCategory[];
		photoCounts: Record<string, number>;
		totalPhotos: number;
		selectedCategory: string | null;
		onselect: (slug: string | null) => void;
	}

	let { categories, photoCounts, totalPhotos, selectedCategory, onselect }: Props = $props();
</script>

<nav class="category-filter" aria-label="Photo categories">
	<button
		class="filter-btn"
		class:active={selectedCategory === null}
		onclick={() => onselect(null)}
	>
		All
		<span class="filter-count">{totalPhotos}</span>
	</button>
	{#each categories as category}
		{@const count = photoCounts[category.slug] || 0}
		{#if count > 0}
			<button
				class="filter-btn"
				class:active={selectedCategory === category.slug}
				onclick={() => onselect(category.slug)}
			>
				{category.name}
				<span class="filter-count">{count}</span>
			</button>
		{/if}
	{/each}
</nav>

<style>
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
		box-shadow: 0 2px 8px color-mix(in oklch, var(--color-primary) 30%, transparent);
	}

	:global([data-theme="dark"]) .filter-btn.active {
		box-shadow: 0 2px 8px color-mix(in oklch, var(--color-primary-light) 25%, transparent);
	}

	.filter-count {
		font-size: var(--text-xs);
		opacity: 0.7;
		font-weight: 400;
	}

	@media (max-width: 480px) {
		.filter-btn {
			font-size: var(--text-xs);
			padding: var(--space-1) var(--space-3);
		}
	}
</style>
