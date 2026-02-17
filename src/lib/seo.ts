/** Site-wide SEO constants */
export const SITE_URL = 'https://xerrion.io';
export const SITE_NAME = 'Xerrion';
export const SITE_AUTHOR = 'Lasse Skovgaard Nielsen';

/** Default meta description */
export const DEFAULT_DESCRIPTION =
	'Lasse Skovgaard Nielsen (Xerrion) - Software Engineer based in Odense, Denmark. Building pragmatic solutions with TypeScript, Rust, and Python.';

/** JSON-LD: WebSite schema (for the root layout) */
export function websiteSchema() {
	return {
		'@context': 'https://schema.org',
		'@type': 'WebSite',
		name: SITE_NAME,
		url: SITE_URL,
		description: DEFAULT_DESCRIPTION,
		author: personSchema()
	};
}

/** JSON-LD: Person schema */
export function personSchema() {
	return {
		'@context': 'https://schema.org',
		'@type': 'Person',
		name: SITE_AUTHOR,
		alternateName: 'Xerrion',
		url: SITE_URL,
		jobTitle: 'Software Engineer',
		worksFor: {
			'@type': 'Organization',
			name: 'TV 2 Danmark'
		},
		address: {
			'@type': 'PostalAddress',
			addressLocality: 'Odense',
			addressCountry: 'DK'
		},
		sameAs: [
			'https://github.com/Xerrion',
			'https://www.linkedin.com/in/lasse-skovgaard-nielsen/'
		],
		knowsAbout: ['TypeScript', 'Rust', 'Python', 'Svelte', 'ServiceNow', 'API Development']
	};
}

/** JSON-LD: BreadcrumbList schema */
export function breadcrumbSchema(items: { name: string; url: string }[]) {
	return {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: items.map((item, index) => ({
			'@type': 'ListItem',
			position: index + 1,
			name: item.name,
			item: `${SITE_URL}${item.url}`
		}))
	};
}
