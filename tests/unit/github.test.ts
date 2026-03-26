import { describe, test, expect } from 'bun:test'

import { transformRepo } from '$lib/types/github'
import type { GitHubRepo } from '$lib/types/github'

function makeGitHubRepo(overrides: Partial<GitHubRepo> = {}): GitHubRepo {
  return {
    id: 12345,
    name: 'test-repo',
    full_name: 'user/test-repo',
    description: 'A test repository',
    html_url: 'https://github.com/user/test-repo',
    homepage: 'https://test-repo.dev',
    language: 'TypeScript',
    stargazers_count: 42,
    forks_count: 7,
    watchers_count: 42,
    open_issues_count: 3,
    topics: ['typescript', 'testing'],
    fork: false,
    archived: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-06-15T12:00:00Z',
    pushed_at: '2024-06-15T12:00:00Z',
    ...overrides
  }
}

describe('transformRepo', () => {
  test('maps all fields correctly from GitHubRepo to ProjectRepo', () => {
    const repo = makeGitHubRepo()
    const result = transformRepo(repo)

    expect(result.id).toBe(12345)
    expect(result.name).toBe('test-repo')
    expect(result.description).toBe('A test repository')
    expect(result.url).toBe('https://github.com/user/test-repo')
    expect(result.homepage).toBe('https://test-repo.dev')
    expect(result.language).toBe('TypeScript')
    expect(result.stars).toBe(42)
    expect(result.forks).toBe(7)
    expect(result.topics).toEqual(['typescript', 'testing'])
    expect(result.isArchived).toBe(false)
  })

  test('converts updated_at string to Date object', () => {
    const repo = makeGitHubRepo({ updated_at: '2024-06-15T12:00:00Z' })
    const result = transformRepo(repo)

    expect(result.updatedAt).toBeInstanceOf(Date)
    expect(result.updatedAt.toISOString()).toBe('2024-06-15T12:00:00.000Z')
  })

  test('isPinned defaults to false', () => {
    const result = transformRepo(makeGitHubRepo())
    expect(result.isPinned).toBe(false)
  })

  test('isPinned can be set to true', () => {
    const result = transformRepo(makeGitHubRepo(), true)
    expect(result.isPinned).toBe(true)
  })

  test('null description stays null', () => {
    const result = transformRepo(makeGitHubRepo({ description: null }))
    expect(result.description).toBeNull()
  })

  test('null homepage stays null', () => {
    const result = transformRepo(makeGitHubRepo({ homepage: null }))
    expect(result.homepage).toBeNull()
  })

  test('null language stays null', () => {
    const result = transformRepo(makeGitHubRepo({ language: null }))
    expect(result.language).toBeNull()
  })

  test('empty topics array stays empty', () => {
    const result = transformRepo(makeGitHubRepo({ topics: [] }))
    expect(result.topics).toEqual([])
  })

  test('undefined/null topics defaults to empty array', () => {
    const repo = makeGitHubRepo()
    // Force topics to be undefined/null to test the || [] guard
    ;(repo as any).topics = undefined
    const result = transformRepo(repo)
    expect(result.topics).toEqual([])
    ;(repo as any).topics = null
    const resultNull = transformRepo(repo)
    expect(resultNull.topics).toEqual([])
  })

  test('archived flag passes through', () => {
    const resultArchived = transformRepo(makeGitHubRepo({ archived: true }))
    expect(resultArchived.isArchived).toBe(true)

    const resultNotArchived = transformRepo(makeGitHubRepo({ archived: false }))
    expect(resultNotArchived.isArchived).toBe(false)
  })
})
