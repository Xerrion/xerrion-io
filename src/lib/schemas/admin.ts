import { z } from 'zod/v4'

export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required')
})

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  description: z.string().optional(),
  sortOrder: z.coerce.number().int().default(0)
})

export const categoryUpdateSchema = z.object({
  id: z.coerce.number().int().positive(),
  name: z.string().trim().min(1, 'Name is required'),
  description: z.string().optional(),
  sortOrder: z.coerce.number().int().default(0)
})
