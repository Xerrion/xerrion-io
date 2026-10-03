import { test as base, expect, type Page } from '@playwright/test'
import { stringify } from 'devalue'

export const test = base.extend<{ browserChecks: void }>({
  browserChecks: [
    async ({ page }, use, testInfo) => {
      const problems: { type: string; text: string; url?: string }[] = []
      page.on('pageerror', (error) =>
        problems.push({ type: 'pageerror', text: error.message })
      )
      page.on('console', (message) => {
        if (!['error', 'warning'].includes(message.type())) return
        const url = message.location().url
        if (
          message.type() === 'error' &&
          message.text().includes('Failed to load resource') &&
          message.text().includes('404') &&
          url === page.url() &&
          page.url().includes('this-page-does-not-exist')
        )
          return
        problems.push({ type: message.type(), text: message.text(), url })
      })
      await use()
      if (problems.length)
        await testInfo.attach('browser-problems', {
          body: JSON.stringify(problems, null, 2),
          contentType: 'application/json'
        })
      expect(problems, 'Browser warnings and errors').toEqual([])
    },
    { auto: true }
  ]
})

export { expect }

export async function mockPublicData(
  page: Page,
  path: string,
  data: object | ((url: URL) => object),
  searchParams: string[] = []
): Promise<void> {
  await page.route(`**${path}/__data.json*`, (route) => {
    const value = typeof data === 'function' ? data(new URL(route.request().url())) : data
    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        type: 'data',
        nodes: [
          null,
          null,
          {
            type: 'data',
            data: JSON.parse(stringify(value)),
            uses: searchParams.length ? { search_params: searchParams } : {}
          }
        ]
      })
    })
  })
}

export async function navigatePublic(page: Page, path: string): Promise<void> {
  await page.goto('/about')
  await page.waitForLoadState('networkidle')
  const trigger = page.locator('.menu-trigger')
  if (await trigger.isVisible()) await trigger.click()
  const navigation = page.locator(
    (await trigger.isVisible()) ? '.mobile-navigation' : '.desktop-navigation'
  )
  await navigation.locator(`a[href="${path}"]`).click()
  await expect(page).toHaveURL(new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'))
}

export const projects = [
  {
    id: 1,
    name: 'particle-foundry',
    description: 'A browser sandbox where particles fall and liquids flow.',
    url: 'https://github.com/Xerrion/particle-foundry',
    homepage: null,
    language: 'Rust',
    stars: 0,
    forks: 0,
    topics: ['simulation'],
    isArchived: false,
    updatedAt: new Date('2026-04-07'),
    isPinned: false
  },
  {
    id: 2,
    name: 'servicenow-platform-mcp',
    description: 'ServiceNow developer and debugging tools.',
    url: 'https://github.com/Xerrion/servicenow-platform-mcp',
    homepage: null,
    language: 'Python',
    stars: 4,
    forks: 0,
    topics: ['model-context-protocol'],
    isArchived: false,
    updatedAt: new Date('2026-04-06'),
    isPinned: true
  },
  {
    id: 3,
    name: 'xerrion-io',
    description: 'Personal website.',
    url: 'https://github.com/Xerrion/xerrion-io',
    homepage: null,
    language: 'Svelte',
    stars: 0,
    forks: 0,
    topics: ['website'],
    isArchived: false,
    updatedAt: new Date('2026-04-05'),
    isPinned: false
  }
]

export function galleryPhotos(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `public-test-${index + 1}`,
    name: `Test photo ${index + 1}`,
    thumbUrl: `https://public-gallery.test/${index + 1}.svg`,
    mediumUrl: `https://public-gallery.test/${index + 1}.svg`,
    fullUrl: `https://public-gallery.test/${index + 1}.svg`,
    category: 'charlie',
    width: index % 2 === 0 ? 800 : 400,
    height: 600,
    createdAt: new Date('2026-04-07')
  }))
}

export async function mockGallery(page: Page, count = 22): Promise<void> {
  const photos = galleryPhotos(count)
  await page.route('https://public-gallery.test/**', (route) => {
    const index = Number(new URL(route.request().url()).pathname.match(/\d+/)?.[0]) - 1
    const photo = photos[index]
    return route.fulfill({
      contentType: 'image/svg+xml',
      body: `<svg xmlns="http://www.w3.org/2000/svg" width="${photo.width}" height="${photo.height}"><rect width="100%" height="100%" fill="hsl(${index * 30} 70% 50%)"/></svg>`
    })
  })
  await mockPublicData(
    page,
    '/gallery',
    (url) => {
      const category = url.searchParams.get('category')
      const pageNumber = Number(url.searchParams.get('page') || 1)
      const available = !category || category === 'charlie' ? photos : []
      return {
        categories: [
          { slug: 'charlie', name: 'Charlie', order: 0 },
          { slug: 'empty', name: 'Empty album', order: 1 }
        ],
        initialPhotos: available.slice(0, pageNumber * 20),
        photoCounts: { charlie: count, empty: 0 },
        totalPhotos: count,
        selectedCategory: category,
        selectedTotal: available.length,
        page: pageNumber,
        hasMore: available.length > pageNumber * 20,
        error: null
      }
    },
    ['category', 'page']
  )
}

export const blogTags = [
  { id: 1, name: 'MCP', slug: 'mcp' },
  { id: 2, name: 'Dogs', slug: 'dogs' }
]

export const blogPosts = [
  {
    id: 1,
    slug: 'inside-servicenow-platform-mcp-building-a-servicenow-mcp',
    title: 'Inside servicenow-platform-mcp: Building a ServiceNow MCP Server That Stays Safe, Composable, and Useful',
    description: 'Explore servicenow-platform-mcp, an open-source ServiceNow MCP server built for safe AI automation, guarded queries, and composable tool design.',
    coverUrl: null,
    publishedAt: '2026-04-07T06:30:46.145Z',
    readingTime: 16,
    tags: [blogTags[0]]
  },
  {
    id: 2,
    slug: 'charlie-the-golden-retriever-who-thinks-with-his-nose',
    title: 'Charlie: The Golden Retriever Who Thinks With His Nose',
    description: 'Meet Charlie, a clever Golden Retriever who thinks with his nose.',
    coverUrl: 'https://public-gallery.test/1.svg',
    publishedAt: '2026-03-30T23:02:54.835Z',
    readingTime: 4,
    tags: [blogTags[1]]
  }
]

export const articleCode = '@mcp.tool()\n@tool_handler\nasync def my_tool(param: str, correlation_id: str = "") -> str:\n    result = await do_work(param)\n    return format_response(data=result, correlation_id=correlation_id)'

export async function mockBlog(page: Page): Promise<void> {
  await mockGallery(page, 3)
  await mockPublicData(page, '/blog', (url) => {
    const activeTag = url.searchParams.get('tag')
    return {
      posts: activeTag ? blogPosts.filter(post => post.tags.some(tag => tag.slug === activeTag)) : blogPosts,
      tags: blogTags,
      activeTag,
      error: null
    }
  }, ['tag'])
  await mockPublicData(page, '/blog/' + blogPosts[0].slug, {
    post: {
      ...blogPosts[0],
      content: articleCode,
      renderedContent: '<h2 id="servicenow">Why ServiceNow needs a different kind of MCP server</h2><p>With ServiceNow, the hard part is judgment.</p><h2 id="tool-handler">The core pattern: @tool_handler</h2><p>Every tool function is wrapped with both @mcp.tool() and @tool_handler.</p><pre class="shiki"><code>' + articleCode.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;') + '</code></pre>',
      updatedAt: '2026-04-07T06:30:46.145Z',
      nextPost: null,
      prevPost: { slug: blogPosts[1].slug, title: blogPosts[1].title }
    }
  })
}
