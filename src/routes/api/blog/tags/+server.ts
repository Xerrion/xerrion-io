import type { RequestHandler } from './$types'
import { error, json } from '@sveltejs/kit'
import { getPrisma } from '$lib/server/db'
import { toSlug } from '$lib/utils/slug'

interface CreateTagBody {
  name: string
}

function parseCreateTagBody(raw: unknown): CreateTagBody {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid request body')
  }
  const body = raw as Record<string, unknown>
  if (typeof body.name !== 'string' || !body.name.trim()) {
    throw new Error('Tag name is required')
  }
  return { name: body.name.trim() }
}

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) error(401, 'Unauthorized')

  let body: CreateTagBody
  try {
    body = parseCreateTagBody(await request.json())
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err) throw err
    const message = err instanceof Error ? err.message : 'Invalid request body'
    error(400, message)
  }

  const slug = toSlug(body.name)
  if (!slug) error(400, 'Invalid tag name - produces empty slug')

  const prisma = getPrisma()

  try {
    const tag = await prisma.tag.upsert({
      where: { slug },
      update: {},
      create: { slug, name: body.name }
    })
    return json({ tag: { id: tag.id, name: tag.name, slug: tag.slug } })
  } catch (err) {
    console.error('[api/blog/tags] Failed to create tag:', err)
    error(500, 'Failed to create tag')
  }
}
