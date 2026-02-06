/** GitHub Repository from API */
export interface GitHubRepo {
	id: number;
	name: string;
	full_name: string;
	description: string | null;
	html_url: string;
	homepage: string | null;
	language: string | null;
	stargazers_count: number;
	forks_count: number;
	watchers_count: number;
	open_issues_count: number;
	topics: string[];
	fork: boolean;
	archived: boolean;
	created_at: string;
	updated_at: string;
	pushed_at: string;
}

/** Processed repository for display */
export interface ProjectRepo {
	id: number;
	name: string;
	description: string | null;
	url: string;
	homepage: string | null;
	language: string | null;
	stars: number;
	forks: number;
	topics: string[];
	isArchived: boolean;
	updatedAt: Date;
}

/** Transform GitHub API response to display format */
export function transformRepo(repo: GitHubRepo): ProjectRepo {
	return {
		id: repo.id,
		name: repo.name,
		description: repo.description,
		url: repo.html_url,
		homepage: repo.homepage,
		language: repo.language,
		stars: repo.stargazers_count,
		forks: repo.forks_count,
		topics: repo.topics || [],
		isArchived: repo.archived,
		updatedAt: new Date(repo.updated_at)
	};
}
