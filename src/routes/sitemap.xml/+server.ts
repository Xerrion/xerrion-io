import type { RequestHandler } from './$types'

import { getPrisma } from '$lib/server/db'
import { escapeXml } from '$lib/server/xml'
import { SITE_URL } from '$lib/seo'

/** Static pages with their relative priority and change frequency */
const staticPages: { path: string; priority: number; changefreq: string }[] = [
  { path: '/', priority: 1, changefreq: 'weekly' },
  { path: '/about', priority: 0.8, changefreq: 'monthly' },
  { path: '/projects', priority: 0.9, changefreq: 'weekly' },
  { path: '/gallery', priority: 0.7, changefreq: 'weekly' },
  { path: '/blog', priority: 0.8, changefreq: 'weekly' }
]

export const GET: RequestHandler = async () => {
  const lastmod = new Date().toISOString().split('T')[0]

  const staticUrls = staticPages
    .map(
      (page) => `  <url>
    <loc>${SITE_URL}${page.path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority.toFixed(1)}</priority>
  </url>`
    )
    .join('\n')

  let blogUrls = ''
  try {
    const prisma = getPrisma()

    const posts = await prisma.post.findMany({
      where: { status: 'published' },
      select: { slug: true, updatedAt: true },
      orderBy: { publishedAt: 'desc' }
    })

    blogUrls = posts
      .map(
        (post) => `  <url>
    <loc>${SITE_URL}/blog/${escapeXml(post.slug)}</loc>
    <lastmod>${post.updatedAt.toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`
      )
      .join('\n')
  } catch (err) {
    console.error('[sitemap] Failed to load blog posts:', err)
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticUrls}
${blogUrls}
</urlset>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'max-age=3600'
    }
  })
}
