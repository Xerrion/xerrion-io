<script lang="ts">
	import '../lib/styles/global.css';
	import '../lib/styles/animations.css';
	import Navigation from '$lib/components/Navigation.svelte';
	import Footer from '$lib/components/Footer.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<title>Xerrion - Software Engineer</title>
</svelte:head>

<div class="app">
	<Navigation />

	<main class="main">
		{@render children()}
	</main>

	<Footer />
</div>

<style>
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
