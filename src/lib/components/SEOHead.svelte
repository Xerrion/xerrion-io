<script lang="ts">
	import { page } from '$app/stores';

	interface Props {
		title: string;
		description: string;
		type?: 'website' | 'article' | 'profile';
		image?: string;
		imageAlt?: string;
		noindex?: boolean;
		jsonLd?: Record<string, unknown> | Record<string, unknown>[];
	}

	const SITE_URL = 'https://xerrion.io';
	const SITE_NAME = 'Xerrion';
	const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;
	const DEFAULT_IMAGE_ALT = 'Xerrion - Software Engineer';

	let {
		title,
		description,
		type = 'website',
		image = DEFAULT_IMAGE,
		imageAlt = DEFAULT_IMAGE_ALT,
		noindex = false,
		jsonLd
	}: Props = $props();

	const canonicalUrl = $derived(`${SITE_URL}${$page.url.pathname}`);
	const fullTitle = $derived(title === SITE_NAME ? title : `${title} | ${SITE_NAME}`);

	const jsonLdString = $derived(jsonLd ? JSON.stringify(Array.isArray(jsonLd) ? jsonLd : jsonLd) : null);
</script>

<svelte:head>
	<title>{fullTitle}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={canonicalUrl} />

	{#if noindex}
		<meta name="robots" content="noindex, nofollow" />
	{/if}

	<!-- Open Graph -->
	<meta property="og:type" content={type} />
	<meta property="og:site_name" content={SITE_NAME} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={canonicalUrl} />
	<meta property="og:image" content={image} />
	<meta property="og:image:alt" content={imageAlt} />
	<meta property="og:image:type" content="image/png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:locale" content="en_US" />

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={image} />
	<meta name="twitter:image:alt" content={imageAlt} />

	<!-- JSON-LD Structured Data -->
	{#if jsonLdString}
		{@html '<script type="application/ld+json">' + jsonLdString + '<\/script>'}
	{/if}
</svelte:head>
