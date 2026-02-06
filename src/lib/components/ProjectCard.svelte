<script lang="ts">
	import type { ProjectRepo } from '$lib/types/github';

	interface Props {
		repo: ProjectRepo;
	}

	let { repo }: Props = $props();

	// Language colors (common languages)
	const languageColors: Record<string, string> = {
		TypeScript: '#3178c6',
		JavaScript: '#f7df1e',
		Python: '#3572A5',
		Rust: '#dea584',
		Go: '#00ADD8',
		Java: '#b07219',
		'C#': '#178600',
		'C++': '#f34b7d',
		C: '#555555',
		HTML: '#e34c26',
		CSS: '#563d7c',
		Shell: '#89e051',
		Ruby: '#701516',
		PHP: '#4F5D95',
		Swift: '#F05138',
		Kotlin: '#A97BFF',
		Svelte: '#ff3e00'
	};

	function formatDate(date: Date): string {
		const now = new Date();
		const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

		if (diffInDays === 0) return 'Today';
		if (diffInDays === 1) return 'Yesterday';
		if (diffInDays < 7) return `${diffInDays} days ago`;
		if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
		if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
		return `${Math.floor(diffInDays / 365)} years ago`;
	}
</script>

<article class="project-card hover-lift">
	<a href={repo.url} target="_blank" rel="noopener noreferrer" class="card-link">
		<div class="card-header">
			<h3 class="card-title">{repo.name}</h3>
			{#if repo.isArchived}
				<span class="badge archived">Archived</span>
			{/if}
		</div>

		{#if repo.description}
			<p class="card-description">{repo.description}</p>
		{:else}
			<p class="card-description text-muted">No description available</p>
		{/if}

		{#if repo.topics.length > 0}
			<div class="card-topics">
				{#each repo.topics.slice(0, 4) as topic}
					<span class="topic">{topic}</span>
				{/each}
				{#if repo.topics.length > 4}
					<span class="topic more">+{repo.topics.length - 4}</span>
				{/if}
			</div>
		{/if}

		<div class="card-footer">
			<div class="card-meta">
				{#if repo.language}
					<span class="language">
						<span
							class="language-dot"
							style="background-color: {languageColors[repo.language] || '#858585'}"
						></span>
						{repo.language}
					</span>
				{/if}

				{#if repo.stars > 0}
					<span class="stat">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<polygon
								points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
							/>
						</svg>
						{repo.stars}
					</span>
				{/if}

				{#if repo.forks > 0}
					<span class="stat">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<circle cx="12" cy="18" r="3" />
							<circle cx="6" cy="6" r="3" />
							<circle cx="18" cy="6" r="3" />
							<path d="M18 9v2c0 .6-.4 1-1 1H7c-.6 0-1-.4-1-1V9" />
							<path d="M12 12v3" />
						</svg>
						{repo.forks}
					</span>
				{/if}
			</div>

			<span class="updated">Updated {formatDate(repo.updatedAt)}</span>
		</div>
	</a>
</article>

<style>
	.project-card {
		background-color: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-xl);
		overflow: hidden;
		transition:
			border-color var(--transition-fast),
			box-shadow var(--transition-base);
	}

	.project-card:hover {
		border-color: var(--color-border-hover);
	}

	.card-link {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		padding: var(--space-6);
		color: inherit;
		text-decoration: none;
		height: 100%;
	}

	.card-header {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.card-title {
		font-size: var(--text-lg);
		font-weight: 600;
		color: var(--color-primary);
	}

	.badge {
		font-size: var(--text-xs);
		font-weight: 500;
		padding: var(--space-1) var(--space-2);
		border-radius: var(--radius-full);
	}

	.badge.archived {
		background-color: var(--color-bg-tertiary);
		color: var(--color-text-muted);
	}

	.card-description {
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
		line-height: 1.5;
		margin: 0;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.card-topics {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	.topic {
		font-size: var(--text-xs);
		font-weight: 500;
		color: var(--color-primary);
		background-color: color-mix(in srgb, var(--color-primary) 10%, transparent);
		padding: var(--space-1) var(--space-2);
		border-radius: var(--radius-full);
	}

	.topic.more {
		color: var(--color-text-muted);
		background-color: var(--color-bg-tertiary);
	}

	.card-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: auto;
		padding-top: var(--space-3);
		border-top: 1px solid var(--color-border);
	}

	.card-meta {
		display: flex;
		align-items: center;
		gap: var(--space-4);
	}

	.language {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
	}

	.language-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
	}

	.stat {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		font-size: var(--text-sm);
		color: var(--color-text-muted);
	}

	.updated {
		font-size: var(--text-xs);
		color: var(--color-text-muted);
	}

	@media (max-width: 768px) {
		.card-link {
			padding: var(--space-4);
		}

		.card-footer {
			flex-direction: column;
			align-items: flex-start;
			gap: var(--space-2);
		}
	}
</style>
