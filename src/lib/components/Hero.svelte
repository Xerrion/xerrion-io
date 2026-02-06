<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		subtitle?: string;
		highlight?: string;
		centered?: boolean;
		children?: Snippet;
	}

	let { title, subtitle, highlight, centered = true, children }: Props = $props();
</script>

<section class="hero" class:centered>
	<div class="hero-content container">
		<h1 class="hero-title animate-fade-in-up">
			{#if highlight}
				{title} <span class="highlight">{highlight}</span>
			{:else}
				{title}
			{/if}
		</h1>
		{#if subtitle}
			<p class="hero-subtitle animate-fade-in-up stagger-1">{subtitle}</p>
		{/if}
		{#if children}
			<div class="hero-actions animate-fade-in-up stagger-2">
				{@render children()}
			</div>
		{/if}
	</div>
</section>

<style>
	.hero {
		padding: var(--space-24) 0 var(--space-16);
	}

	.hero-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
	}

	.centered {
		text-align: center;
	}

	.centered .hero-content {
		align-items: center;
	}

	.hero-title {
		font-size: var(--text-5xl);
		font-weight: 700;
		line-height: 1.1;
		letter-spacing: -0.02em;
		max-width: 800px;
	}

	.highlight {
		background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.hero-subtitle {
		font-size: var(--text-xl);
		color: var(--color-text-secondary);
		max-width: 600px;
		margin: 0;
	}

	.hero-actions {
		display: flex;
		gap: var(--space-4);
		flex-wrap: wrap;
		margin-top: var(--space-4);
	}

	.centered .hero-actions {
		justify-content: center;
	}

	@media (max-width: 768px) {
		.hero {
			padding: var(--space-16) 0 var(--space-12);
		}

		.hero-title {
			font-size: var(--text-3xl);
		}

		.hero-subtitle {
			font-size: var(--text-lg);
		}
	}
</style>
