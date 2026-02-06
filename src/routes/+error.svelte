<script lang="ts">
	import { page } from '$app/stores';
</script>

<svelte:head>
	<title>Oops - Xerrion</title>
</svelte:head>

<div class="error-page">
	<div class="error-content container">
		<span class="error-emoji">🤔</span>
		<h1>404</h1>
		<p class="error-message">
			This page doesn't exist. Maybe it never did, maybe I moved it, maybe you typo'd the URL.
		</p>
		<p class="error-suggestion">
			Either way, let's get you back on track.
		</p>
		<a href="/" class="btn-home">← Back home</a>
	</div>
</div>

<style>
	.error-page {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: calc(100vh - var(--header-height) - 150px);
		text-align: center;
		padding: var(--space-8);
	}

	.error-content {
		max-width: 400px;
	}

	.error-emoji {
		font-size: 4rem;
		display: block;
		margin-bottom: var(--space-4);
	}

	h1 {
		font-size: var(--text-5xl);
		font-weight: 800;
		color: var(--color-primary);
		margin: 0 0 var(--space-4);
	}

	.error-message {
		font-size: var(--text-lg);
		color: var(--color-text-secondary);
		line-height: 1.6;
	}

	.error-suggestion {
		font-size: var(--text-base);
		color: var(--color-text-muted);
	}

	.btn-home {
		display: inline-flex;
		align-items: center;
		padding: var(--space-3) var(--space-5);
		margin-top: var(--space-6);
		background-color: var(--color-bg-secondary);
		color: var(--color-text);
		font-weight: 500;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		text-decoration: none;
		transition: all var(--transition-fast);
	}

	.btn-home:hover {
		background-color: var(--color-bg-tertiary);
		border-color: var(--color-border-hover);
	}
</style>
