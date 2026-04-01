import { error, json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { env } from '$env/dynamic/private'
import OpenAI from 'openai'

interface SuggestDescriptionBody {
  title: string
  content: string
}

function parseSuggestDescriptionBody(raw: unknown): SuggestDescriptionBody {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid request body')
  }
  const body = raw as Record<string, unknown>
  if (typeof body.title !== 'string' || !body.title.trim()) {
    throw new Error('Missing or empty title')
  }
  return {
    title: body.title.trim(),
    content: typeof body.content === 'string' ? body.content.trim() : ''
  }
}

function parseDescription(raw: string): string {
  const parsed = JSON.parse(raw)

  if (typeof parsed === 'string') return parsed.trim()

  const text = parsed.description ?? parsed.text ?? parsed.summary
  if (typeof text === 'string') return text.trim()

  return ''
}

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) error(401, 'Unauthorized')

  const apiKey = env.OPENAI_API_KEY
  if (!apiKey) {
    console.warn('[suggest-description] OPENAI_API_KEY is not set')
    return json({ description: '' })
  }

  let body: SuggestDescriptionBody
  try {
    body = parseSuggestDescriptionBody(await request.json())
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid request body'
    error(400, message)
  }

  try {
    const openai = new OpenAI({ apiKey })

    const response = await openai.chat.completions.create({
      model: 'gpt-5.4-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are an SEO expert. Generate a concise, compelling meta description for a blog post. The description should be 150-160 characters, include relevant keywords naturally, and encourage clicks. Return JSON: { "description": "your description here" }'
        },
        {
          role: 'user',
          content: `Generate a meta description for the following blog post.

Title: ${body.title}
Content: ${body.content.slice(0, 3000)}

Respond with only a JSON object containing a "description" string.`
        }
      ]
    })

    const rawContent = response.choices[0]?.message?.content
    if (!rawContent) {
      return json({ description: '' })
    }

    const description = parseDescription(rawContent)
    return json({ description })
  } catch (err) {
    console.error('[suggest-description] OpenAI request failed:', err)
    return json({ description: '' })
  }
}
