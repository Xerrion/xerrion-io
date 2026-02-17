<script lang="ts">
	import ProjectCard from '$lib/components/ProjectCard.svelte';
	import SEOHead from '$lib/components/SEOHead.svelte';
	import { breadcrumbSchema } from '$lib/seo';
	import type { ProjectRepo } from '$lib/types/github';

	interface Props {
		data: {
			projects: ProjectRepo[];
			error: string | null;
		};
	}

	let { data }: Props = $props();

	let searchQuery = $state('');
	let selectedLanguage = $state<string | null>(null);

	// Get unique languages for filter
	const languages = $derived(() => {
		const langs = new Set<string>();
		data.projects.forEach((repo) => {
			if (repo.language) langs.add(repo.language);
		});
		return Array.from(langs).sort();
	});

	// Filter projects based on search and language
	const filteredProjects = $derived(() => {
		return data.projects.filter((repo) => {
			const matchesSearch =
				searchQuery === '' ||
				repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				(repo.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
				repo.topics.some((topic) => topic.toLowerCase().includes(searchQuery.toLowerCase()));

			const matchesLanguage = selectedLanguage === null || repo.language === selectedLanguage;

			return matchesSearch && matchesLanguage;
		});
	});

	function clearFilters() {
		searchQuery = '';
		selectedLanguage = null;
	}
</script>

<SEOHead
	title="Projects"
	description="Open source projects and side projects by Lasse Skovgaard Nielsen (Xerrion). Mostly TypeScript, Rust, and Python - pulled live from GitHub."
	jsonLd={breadcrumbSchema([
		{ name: 'Home', url: '/' },
		{ name: 'Projects', url: '/projects' }
	])}
/>

<div class="projects-page">
	<div class="container">
		<header class="projects-header">
			<h1>🛠️ Projects</h1>
			<p class="subtitle">Stuff I've built. Pulled from GitHub, so it's always up to date.</p>
		</header>

		{#if data.error}
			<div class="error-message">
				<span class="error-emoji">😅</span>
				<p>{data.error}</p>
				<p class="error-hint">GitHub might be having issues, or I hit the rate limit. Try again in a bit!</p>
			</div>
		{:else}
			<div class="filters">
				<div class="search-box">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="18"
						height="18"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<circle cx="11" cy="11" r="8" />
						<line x1="21" y1="21" x2="16.65" y2="16.65" />
					</svg>
					<input
						type="text"
						placeholder="Search projects..."
						bind:value={searchQuery}
						class="search-input"
					/>
				</div>

				<div class="language-filter">
					<select bind:value={selectedLanguage} class="language-select">
						<option value={null}>All languages</option>
						{#each languages() as lang}
							<option value={lang}>{lang}</option>
						{/each}
					</select>
				</div>

				{#if searchQuery || selectedLanguage}
					<button class="clear-btn" onclick={clearFilters}>Clear</button>
				{/if}
			</div>

			<p class="results-count">
				{filteredProjects().length} project{filteredProjects().length !== 1 ? 's' : ''}
				{#if searchQuery || selectedLanguage}
					<span class="filtered-note">(filtered)</span>
				{/if}
			</p>

			{#if filteredProjects().length > 0}
				<div class="projects-grid">
					{#each filteredProjects() as repo (repo.id)}
						<ProjectCard {repo} />
					{/each}
				</div>
			{:else}
				<div class="empty-state">
					<span class="empty-emoji">🔍</span>
					<h2>Nothing found</h2>
					<p>Try different search terms or clear the filters.</p>
					<button class="btn-reset" onclick={clearFilters}>Clear filters</button>
				</div>
			{/if}
		{/if}
	</div>
</div>

<style>
	.projects-page {
		padding: var(--space-16) 0;
	}

	.projects-header {
		margin-bottom: var(--space-8);
	}

	.projects-header h1 {
		font-size: var(--text-4xl);
		margin-bottom: var(--space-2);
	}

	.subtitle {
		font-size: var(--text-lg);
		color: var(--color-text-muted);
		margin: 0;
	}

	/* Filters */
	.filters {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-3);
		margin-bottom: var(--space-4);
	}

	.search-box {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-4);
		background-color: var(--color-bg-secondary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		flex: 1;
		min-width: 200px;
		max-width: 300px;
		color: var(--color-text-muted);
	}

	.search-box:focus-within {
		border-color: var(--color-primary);
	}

	.search-input {
		flex: 1;
		border: none;
		background: none;
		font-size: var(--text-base);
		color: var(--color-text);
		outline: none;
	}

	.search-input::placeholder {
		color: var(--color-text-muted);
	}

	.language-select {
		padding: var(--space-2) var(--space-4);
		background-color: var(--color-bg-secondary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		font-size: var(--text-base);
		color: var(--color-text);
		cursor: pointer;
		outline: none;
	}

	.language-select:focus {
		border-color: var(--color-primary);
	}

	.clear-btn {
		padding: var(--space-2) var(--space-3);
		background: none;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.clear-btn:hover {
		background-color: var(--color-bg-tertiary);
		color: var(--color-text);
	}

	.results-count {
		font-size: var(--text-sm);
		color: var(--color-text-muted);
		margin-bottom: var(--space-6);
	}

	.filtered-note {
		color: var(--color-primary);
	}

	/* Projects Grid */
	.projects-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: var(--space-4);
	}

	/* Error State */
	.error-message {
		text-align: center;
		padding: var(--space-12);
		background-color: var(--color-bg-secondary);
		border-radius: var(--radius-xl);
	}

	.error-emoji {
		font-size: 3rem;
		display: block;
		margin-bottom: var(--space-4);
	}

	.error-message p {
		margin: 0;
	}

	.error-hint {
		font-size: var(--text-sm);
		color: var(--color-text-muted);
		margin-top: var(--space-2) !important;
	}

	/* Empty State */
	.empty-state {
		text-align: center;
		padding: var(--space-12);
	}

	.empty-emoji {
		font-size: 3rem;
		display: block;
		margin-bottom: var(--space-4);
	}

	.empty-state h2 {
		font-size: var(--text-xl);
		margin-bottom: var(--space-2);
	}

	.empty-state p {
		color: var(--color-text-muted);
		margin-bottom: var(--space-4);
	}

	.btn-reset {
		padding: var(--space-2) var(--space-4);
		background-color: var(--color-primary);
		border: none;
		border-radius: var(--radius-lg);
		font-size: var(--text-sm);
		color: white;
		cursor: pointer;
		transition: background-color var(--transition-fast);
	}

	.btn-reset:hover {
		background-color: var(--color-primary-hover);
	}

	@media (max-width: 768px) {
		.projects-header h1 {
			font-size: var(--text-3xl);
		}

		.filters {
			flex-direction: column;
			align-items: stretch;
		}

		.search-box {
			max-width: none;
		}

		.projects-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
