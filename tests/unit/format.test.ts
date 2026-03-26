import { describe, test, expect } from 'bun:test'

import { formatDate } from '$lib/utils/format'

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000)

describe('formatDate', () => {
  test('returns "Today" for same day', () => {
    expect(formatDate(daysAgo(0))).toBe('Today')
  })

  test('returns "Yesterday" for 1 day ago', () => {
    expect(formatDate(daysAgo(1))).toBe('Yesterday')
  })

  test('returns "N days ago" for 2-6 days ago', () => {
    expect(formatDate(daysAgo(2))).toBe('2 days ago')
    expect(formatDate(daysAgo(3))).toBe('3 days ago')
    expect(formatDate(daysAgo(6))).toBe('6 days ago')
  })

  test('returns "N weeks ago" for 7-29 days ago', () => {
    expect(formatDate(daysAgo(7))).toBe('1 weeks ago')
    expect(formatDate(daysAgo(13))).toBe('1 weeks ago')
    expect(formatDate(daysAgo(14))).toBe('2 weeks ago')
    expect(formatDate(daysAgo(20))).toBe('2 weeks ago')
    expect(formatDate(daysAgo(29))).toBe('4 weeks ago')
  })

  test('returns "N months ago" for 30-364 days ago', () => {
    expect(formatDate(daysAgo(30))).toBe('1 months ago')
    expect(formatDate(daysAgo(59))).toBe('1 months ago')
    expect(formatDate(daysAgo(60))).toBe('2 months ago')
    expect(formatDate(daysAgo(364))).toBe('12 months ago')
  })

  test('returns "N years ago" for 365+ days ago', () => {
    expect(formatDate(daysAgo(365))).toBe('1 years ago')
    expect(formatDate(daysAgo(730))).toBe('2 years ago')
  })

  test('handles future dates without throwing', () => {
    const futureDate = new Date(Date.now() + 86400000 * 10)
    expect(() => formatDate(futureDate)).not.toThrow()
  })
})
