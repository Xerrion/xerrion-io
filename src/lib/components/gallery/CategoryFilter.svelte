<script lang="ts">
	import type { PhotoCategory } from '$lib/gallery';
	import { motion } from '@humanspeak/svelte-motion';

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
	<motion.button
		class="filter-btn {selectedCategory === null ? 'active' : ''}"
		initial={{ opacity: 0, scale: 0.92, y: 8 }}
		animate={{ opacity: 1, scale: 1, y: 0 }}
		transition={{ duration: 0.4, delay: 0.15 }}
		whileHover={{ y: -2, transition: { duration: 0.12 } }}
		whileTap={{ scale: 0.95 }}
		onclick={() => onselect(null)}
	>
		All
		<span class="filter-count">{totalPhotos}</span>
	</motion.button>
	{#each categories as category, i}
		{@const count = photoCounts[category.slug] || 0}
		{#if count > 0}
			<motion.button
				class="filter-btn {selectedCategory === category.slug ? 'active' : ''}"
				initial={{ opacity: 0, scale: 0.92, y: 8 }}
				animate={{ opacity: 1, scale: 1, y: 0 }}
				transition={{ duration: 0.4, delay: (i + 1) * 0.06 + 0.15 }}
				whileHover={{ y: -2, transition: { duration: 0.12 } }}
				whileTap={{ scale: 0.95 }}
				onclick={() => onselect(category.slug)}
			>
				{category.name}
				<span class="filter-count">{count}</span>
			</motion.button>
		{/if}
	{/each}
</nav>

<style>
	.category-filter {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		margin-bottom: var(--space-4);
	}

	:global(.filter-btn) {
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
		transition: background-color var(--transition-base), border-color var(--transition-base), color var(--transition-base), box-shadow var(--transition-base);
		font-weight: 500;
	}

	:global(.filter-btn:hover) {
		background-color: var(--color-bg-tertiary);
		border-color: var(--color-border-hover);
		color: var(--color-text);
		box-shadow: var(--shadow-sm);
	}

	:global(.filter-btn.active .filter-count) {
		opacity: 0.9;
		background: rgba(255, 255, 255, 0.2);
		padding: 0.1em 0.5em;
		border-radius: var(--radius-full);
	}

	:global(.filter-btn.active) {
		background-color: var(--color-primary);
		border-color: var(--color-primary);
		color: white;
		box-shadow: 0 2px 8px color-mix(in oklch, var(--color-primary) 30%, transparent);
	}

	:global([data-theme="dark"]) :global(.filter-btn.active) {
		box-shadow: 0 2px 8px color-mix(in oklch, var(--color-primary-light) 25%, transparent);
	}

	.filter-count {
		font-size: var(--text-xs);
		opacity: 0.7;
		font-weight: 400;
	}

	@media (max-width: 480px) {
		:global(.filter-btn) {
			font-size: var(--text-xs);
			padding: var(--space-1) var(--space-3);
		}
	}
</style>
