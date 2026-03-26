import { describe, test, expect, mock } from 'bun:test'

// Stub SvelteKit env module that db.ts imports at top level.
// hashPassword/verifyPassword don't use the database, but auth.ts
// imports db.ts which triggers this resolution.
mock.module('$env/dynamic/private', () => ({ env: {} }))

const { hashPassword, verifyPassword } = await import('$lib/server/auth')

describe('hashPassword', () => {
  test('returns a non-empty string', async () => {
    const hashed = await hashPassword('testpassword')
    expect(typeof hashed).toBe('string')
    expect(hashed.length).toBeGreaterThan(0)
  })

  test('returns different hashes for different passwords', async () => {
    const hash1 = await hashPassword('password-one')
    const hash2 = await hashPassword('password-two')
    expect(hash1).not.toBe(hash2)
  })

  test('returns different hashes for the same password (random salt)', async () => {
    const hash1 = await hashPassword('same-password')
    const hash2 = await hashPassword('same-password')
    expect(hash1).not.toBe(hash2)
  })

  test('hash starts with $argon2', async () => {
    const hashed = await hashPassword('testpassword')
    expect(hashed.startsWith('$argon2')).toBe(true)
  })
})

describe('verifyPassword', () => {
  test('returns true for correct password', async () => {
    const hashed = await hashPassword('correct-password')
    const isValid = await verifyPassword(hashed, 'correct-password')
    expect(isValid).toBe(true)
  })

  test('returns false for wrong password', async () => {
    const hashed = await hashPassword('correct-password')
    const isValid = await verifyPassword(hashed, 'wrong-password')
    expect(isValid).toBe(false)
  })

  test('returns false for empty password', async () => {
    const hashed = await hashPassword('correct-password')
    const isValid = await verifyPassword(hashed, '')
    expect(isValid).toBe(false)
  })

  test('throws on malformed hash input', async () => {
    await expect(
      verifyPassword('not-a-valid-hash', 'password')
    ).rejects.toThrow()
  })
})

describe('hashPassword + verifyPassword round-trip', () => {
  test('hash then verify with correct password succeeds', async () => {
    const password = 'my-secure-password-123!'
    const hashed = await hashPassword(password)
    const isValid = await verifyPassword(hashed, password)
    expect(isValid).toBe(true)
  })

  test('hash then verify with wrong password fails', async () => {
    const password = 'my-secure-password-123!'
    const hashed = await hashPassword(password)
    const isValid = await verifyPassword(hashed, 'not-the-right-one')
    expect(isValid).toBe(false)
  })
})
