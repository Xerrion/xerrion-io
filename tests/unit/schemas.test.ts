import { describe, test, expect } from 'bun:test'

import {
  loginSchema,
  categoryCreateSchema,
  categoryUpdateSchema
} from '$lib/schemas/admin'

describe('loginSchema', () => {
  test('parses valid input successfully', () => {
    const result = loginSchema.safeParse({
      username: 'admin',
      password: 'secret'
    })
    expect(result.success).toBe(true)
  })

  test('fails when username is missing', () => {
    const result = loginSchema.safeParse({ password: 'secret' })
    expect(result.success).toBe(false)
  })

  test('fails when password is missing', () => {
    const result = loginSchema.safeParse({ username: 'admin' })
    expect(result.success).toBe(false)
  })

  test('fails for empty string username', () => {
    const result = loginSchema.safeParse({ username: '', password: 'secret' })
    expect(result.success).toBe(false)
  })

  test('rejects whitespace-only username', () => {
    const result = loginSchema.safeParse({
      username: '   ',
      password: 'secret'
    })
    expect(result.success).toBe(false)
  })

  test('trims username whitespace', () => {
    const result = loginSchema.safeParse({
      username: '  admin  ',
      password: 'secret'
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.username).toBe('admin')
    }
  })
})

describe('categoryCreateSchema', () => {
  test('parses valid input with all fields', () => {
    const result = categoryCreateSchema.safeParse({
      name: 'Nature',
      description: 'Outdoor photos',
      sortOrder: 1
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual({
        name: 'Nature',
        description: 'Outdoor photos',
        sortOrder: 1
      })
    }
  })

  test('parses valid input with only name (description optional, sortOrder defaults)', () => {
    const result = categoryCreateSchema.safeParse({ name: 'Nature' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('Nature')
      expect(result.data.sortOrder).toBe(0)
      expect(result.data.description).toBeUndefined()
    }
  })

  test('fails when name is missing', () => {
    const result = categoryCreateSchema.safeParse({
      description: 'Some desc'
    })
    expect(result.success).toBe(false)
  })

  test('coerces string sortOrder to number', () => {
    const result = categoryCreateSchema.safeParse({
      name: 'Test',
      sortOrder: '5'
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.sortOrder).toBe(5)
    }
  })

  test('defaults sortOrder to 0 when not provided', () => {
    const result = categoryCreateSchema.safeParse({ name: 'Test' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.sortOrder).toBe(0)
    }
  })

  test('fails for non-integer sortOrder', () => {
    const result = categoryCreateSchema.safeParse({
      name: 'Test',
      sortOrder: 1.5
    })
    expect(result.success).toBe(false)
  })
})

describe('categoryUpdateSchema', () => {
  test('parses valid input with all fields', () => {
    const result = categoryUpdateSchema.safeParse({
      id: 1,
      name: 'Nature',
      description: 'Updated desc',
      sortOrder: 2
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.id).toBe(1)
      expect(result.data.name).toBe('Nature')
    }
  })

  test('fails when id is missing', () => {
    const result = categoryUpdateSchema.safeParse({
      name: 'Nature'
    })
    expect(result.success).toBe(false)
  })

  test('fails when id is 0 (not positive)', () => {
    const result = categoryUpdateSchema.safeParse({
      id: 0,
      name: 'Test'
    })
    expect(result.success).toBe(false)
  })

  test('fails when id is negative', () => {
    const result = categoryUpdateSchema.safeParse({
      id: -1,
      name: 'Test'
    })
    expect(result.success).toBe(false)
  })

  test('coerces string id to number', () => {
    const result = categoryUpdateSchema.safeParse({
      id: '5',
      name: 'Test'
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.id).toBe(5)
    }
  })

  test('applies same name validation as create schema', () => {
    const result = categoryUpdateSchema.safeParse({
      id: 1,
      name: ''
    })
    expect(result.success).toBe(false)
  })

  test('applies same sortOrder defaults as create schema', () => {
    const result = categoryUpdateSchema.safeParse({
      id: 1,
      name: 'Test'
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.sortOrder).toBe(0)
    }
  })
})
