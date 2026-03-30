import { error, json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { env } from '$env/dynamic/private'
import OpenAI from 'openai'

interface SuggestTagsBody {
  content: string
  title: string
  existingTags: string[]
}

function parseSuggestTagsBody(raw: unknown): SuggestTagsBody {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid request body')
  }
  const body = raw as Record<string, unknown>
  if (typeof body.title !== 'string' || !body.title.trim()) {
    throw new Error('Missing or empty title')
  }
  if (typeof body.content !== 'string') {
    throw new Error('Missing content')
  }
  if (!Array.isArray(body.existingTags)) {
    throw new Error('Missing existingTags array')
  }
  return {
    title: body.title.trim(),
    content: body.content.trim(),
    existingTags: body.existingTags.filter(
      (t): t is string => typeof t === 'string'
    )
  }
}

function parseSuggestions(raw: string): string[] {
  const parsed = JSON.parse(raw)
  const items = parsed.suggestions ?? parsed.tags ?? parsed
  if (!Array.isArray(items)) return []
  return items
    .filter((item): item is string => typeof item === 'string')
    .map((tag) => tag.toLowerCase().trim())
    .filter((tag) => tag.length > 0)
    .slice(0, 5)
}

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) error(401, 'Unauthorized')

  const apiKey = env.OPENAI_API_KEY
  if (!apiKey) {
    console.error('[suggest-tags] OPENAI_API_KEY is not set')
    return json({ suggestions: [] })
  }

  let body: SuggestTagsBody
  try {
    body = parseSuggestTagsBody(await request.json())
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid request body'
    error(400, message)
  }

  try {
    const openai = new OpenAI({ apiKey })

    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You suggest relevant tags for blog posts. Respond with only a JSON object containing a "suggestions" array of lowercase tag name strings. Example: {"suggestions": ["typescript", "svelte", "web-dev"]}'
        },
        {
          role: 'user',
          content: `Given the following blog post, suggest 3-5 relevant tags from the existing tags list or propose new ones if needed.

Title: ${body.title}
Content: ${body.content.slice(0, 3000)}
Existing tags: ${body.existingTags.join(', ')}

Respond with only a JSON object containing a "suggestions" array of tag name strings.`
        }
      ]
    })

    const rawContent = response.choices[0]?.message?.content
    if (!rawContent) {
      return json({ suggestions: [] })
    }

    const suggestions = parseSuggestions(rawContent)
    return json({ suggestions })
  } catch (err) {
    console.error('[suggest-tags] OpenAI request failed:', err)
    return json({ suggestions: [] })
  }
}
