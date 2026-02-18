import { env } from '$env/dynamic/private';
import type { PageServerLoad } from './$types';
import type { GitHubRepo, GitHubGraphQLResponse } from '$lib/types/github';
import { transformRepo, type ProjectRepo } from '$lib/types/github';

const PINNED_REPOS_QUERY = `
	query {
		user(login: "Xerrion") {
			pinnedItems(first: 6, types: REPOSITORY) {
				nodes {
					... on Repository {
						name
						description
						url
						stargazerCount
						forkCount
						primaryLanguage {
							name
						}
					}
				}
			}
		}
	}
`;

async function fetchPinnedRepoNames(fetchFn: typeof fetch): Promise<Set<string>> {
	const token = env.GITHUB_TOKEN;
	if (!token) {
		console.warn('GITHUB_TOKEN not set, pinned repos will not be highlighted');
		return new Set();
	}

	try {
		const response = await fetchFn('https://api.github.com/graphql', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ query: PINNED_REPOS_QUERY })
		});

		if (!response.ok) {
			console.error('GraphQL API error:', response.status);
			return new Set();
		}

		const data: GitHubGraphQLResponse = await response.json();
		const pinnedNames = data.data.user.pinnedItems.nodes.map((repo) => repo.name);
		return new Set(pinnedNames);
	} catch (error) {
		console.error('Failed to fetch pinned repos:', error);
		return new Set();
	}
}

export const load: PageServerLoad = async ({ fetch }) => {
	const token = env.GITHUB_TOKEN;
	const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

	try {
		const [reposResponse, pinnedNames] = await Promise.all([
			fetch('https://api.github.com/users/Xerrion/repos?per_page=100&sort=updated', { headers }),
			fetchPinnedRepoNames(fetch)
		]);

		if (!reposResponse.ok) {
			throw new Error(`GitHub API error: ${reposResponse.status}`);
		}

		const repos: GitHubRepo[] = await reposResponse.json();

		const projects: ProjectRepo[] = repos
			.filter((repo) => !repo.fork)
			.map((repo) => transformRepo(repo, pinnedNames.has(repo.name)))
			.sort((a, b) => {
				if (a.isPinned !== b.isPinned) {
					return a.isPinned ? -1 : 1;
				}
				return b.updatedAt.getTime() - a.updatedAt.getTime();
			});

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
