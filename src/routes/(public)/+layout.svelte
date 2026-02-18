<script lang="ts">
	import Navigation from '$lib/components/Navigation.svelte';
	import Footer from '$lib/components/Footer.svelte';

	let { children } = $props();
</script>

<a href="#main-content" class="skip-link">Skip to content</a>

<div class="app">
	<Navigation />

	<main id="main-content" class="main">
		{@render children()}
	</main>

	<Footer />
</div>

<style>
	.skip-link {
		position: absolute;
		top: -100%;
		left: var(--space-4);
		z-index: 1000;
		padding: var(--space-2) var(--space-4);
		background-color: var(--color-primary);
		color: white;
		border-radius: var(--radius-md);
		font-weight: 500;
		text-decoration: none;
	}

	.skip-link:focus {
		top: var(--space-2);
	}

	.app {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	.main {
		flex: 1;
		padding-top: var(--header-height);
	}
</style>
