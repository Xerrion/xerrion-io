import type { RequestHandler } from './$types'

import { getPrisma } from '$lib/server/db'
import { escapeXml } from '$lib/server/xml'
import { SITE_URL, SITE_NAME } from '$lib/seo'

function buildAtomXml(
  posts: {
    slug: string
    title: string
    description: string | null
    publishedAt: Date
    updatedAt: Date
    tags: { slug: string; name: string }[]
  }[]
): string {
  const updatedDate =
    posts.length > 0
      ? new Date(posts[0].updatedAt).toISOString()
      : new Date().toISOString()

  const entries = posts
    .map(
      (post) => `  <entry>
    <title>${escapeXml(post.title)}</title>
    <link href="${SITE_URL}/blog/${escapeXml(post.slug)}"/>
    <id>${SITE_URL}/blog/${escapeXml(post.slug)}</id>
    <updated>${new Date(post.updatedAt).toISOString()}</updated>
    <published>${new Date(post.publishedAt).toISOString()}</published>
    <summary>${escapeXml(post.description ?? '')}</summary>
${post.tags.map((tag) => `    <category term="${escapeXml(tag.slug)}" label="${escapeXml(tag.name)}"/>`).join('\n')}
  </entry>`
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${SITE_NAME} Blog</title>
  <link href="${SITE_URL}/blog"/>
  <link href="${SITE_URL}/blog/atom.xml" rel="self"/>
  <id>${SITE_URL}/blog</id>
  <updated>${updatedDate}</updated>
  <author>
    <name>${SITE_NAME}</name>
  </author>
${entries}
</feed>`
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
        updatedAt: post.updatedAt,
        tags: post.tags.map((pt) => ({
          slug: pt.tag.slug,
          name: pt.tag.name
        }))
      }))

    const xml = buildAtomXml(feedPosts)

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/atom+xml; charset=utf-8',
        'Cache-Control': 'max-age=3600'
      }
    })
  } catch (err) {
    console.error('[atom] Failed to generate Atom feed:', err)

    const xml = buildAtomXml([])

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/atom+xml; charset=utf-8',
        'Cache-Control': 'max-age=300'
      }
    })
  }
}
