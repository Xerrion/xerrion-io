import type { RequestHandler } from './$types'

import { getPrisma } from '$lib/server/db'
import { escapeXml } from '$lib/server/xml'
import { SITE_URL, SITE_NAME } from '$lib/seo'

const FEED_DESCRIPTION =
  'Thoughts on software, photography, and building things on the web.'

function buildRssXml(
  posts: {
    slug: string
    title: string
    description: string | null
    publishedAt: Date
    tags: { name: string }[]
  }[]
): string {
  const lastBuildDate =
    posts.length > 0
      ? new Date(posts[0].publishedAt).toUTCString()
      : new Date().toUTCString()

  const items = posts
    .map(
      (post) => `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${SITE_URL}/blog/${escapeXml(post.slug)}</link>
      <guid isPermaLink="true">${SITE_URL}/blog/${escapeXml(post.slug)}</guid>
      <description><![CDATA[${post.description ?? ''}]]></description>
      <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>
${post.tags.map((tag) => `      <category>${escapeXml(tag.name)}</category>`).join('\n')}
    </item>`
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${SITE_NAME} Blog</title>
    <link>${SITE_URL}/blog</link>
    <description>${FEED_DESCRIPTION}</description>
    <language>en-us</language>
    <atom:link href="${SITE_URL}/blog/rss.xml" rel="self" type="application/rss+xml"/>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
${items}
  </channel>
</rss>`
}

export const GET: RequestHandler = async () => {
  try {
    const prisma = getPrisma()

    const posts = await prisma.post.findMany({
      where: { status: 'published' },
      orderBy: { publishedAt: 'desc' },
      take: 50,
      include: {
        tags: { include: { tag: true } }
      }
    })

    const feedPosts = posts
      .filter(
        (post): post is typeof post & { publishedAt: Date } =>
          post.publishedAt !== null
      )
      .map((post) => ({
        slug: post.slug,
        title: post.title,
        description: post.description,
        publishedAt: post.publishedAt,
        tags: post.tags.map((pt) => ({ name: pt.tag.name }))
      }))

    const xml = buildRssXml(feedPosts)

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'max-age=3600'
      }
    })
  } catch (err) {
    console.error('[rss] Failed to generate RSS feed:', err)

    const xml = buildRssXml([])

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'max-age=300'
      }
    })
  }
}
