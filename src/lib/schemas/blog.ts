import { z } from 'zod/v4'

export const postCreateSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  slug: z
    .string()
    .trim()
    .min(1, 'Slug is required')
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Slug must start and end with a letter or number; hyphens may only appear between words'
    ),
  description: z.string().optional(),
  content: z.string().min(1, 'Content is required'),

  status: z.enum(['draft', 'published']).default('draft'),
  tagIds: z.array(z.coerce.number().int().positive()).default([]),
  coverR2Key: z.string().optional(),
  coverR2KeyFull: z.string().optional()
})

export const postUpdateSchema = postCreateSchema.extend({
  id: z.coerce.number().int().positive(),
  existingCoverR2Key: z.string().optional(),
  existingCoverR2KeyFull: z.string().optional()
})

export const tagCreateSchema = z.object({
  name: z.string().trim().min(1, 'Name is required')
})

export const tagUpdateSchema = tagCreateSchema.extend({
  id: z.coerce.number().int().positive()
})
