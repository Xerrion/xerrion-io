import type { PageServerLoad } from './$types';
import type { GitHubRepo } from '$lib/types/github';
import { transformRepo, type ProjectRepo } from '$lib/types/github';

export const load: PageServerLoad = async ({ fetch }) => {
	try {
		const response = await fetch('https://api.github.com/users/Xerrion/repos?per_page=100&sort=updated');

		if (!response.ok) {
			throw new Error(`GitHub API error: ${response.status}`);
		}

		const repos: GitHubRepo[] = await response.json();

		// Filter out forks and transform to display format
		const projects: ProjectRepo[] = repos
			.filter((repo) => !repo.fork)
			.map(transformRepo)
			.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

		return {
			projects,
			error: null
		};
	} catch (error) {
		console.error('Failed to fetch GitHub repos:', error);
		return {
			projects: [],
			error: 'Failed to load projects. Please try again later.'
		};
	}
};
