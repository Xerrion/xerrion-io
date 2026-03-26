import { describe, test, expect } from 'bun:test'

import { languageColors } from '$lib/utils/languages'

describe('languageColors', () => {
  test('has exactly 17 entries', () => {
    expect(Object.keys(languageColors)).toHaveLength(17)
  })

  test('contains expected languages', () => {
    const expectedLanguages = [
      'TypeScript',
      'JavaScript',
      'Python',
      'Rust',
      'Go',
      'Java',
      'C#',
      'C++',
      'C',
      'HTML',
      'CSS',
      'Shell',
      'Ruby',
      'PHP',
      'Swift',
      'Kotlin',
      'Svelte'
    ]

    for (const lang of expectedLanguages) {
      expect(languageColors).toHaveProperty(lang)
    }
  })

  test('all values are valid hex color strings', () => {
    const hexPattern = /^#[0-9a-fA-F]{6}$/

    for (const [language, color] of Object.entries(languageColors)) {
      expect(color).toMatch(hexPattern)
    }
  })

  test('has correct color for TypeScript', () => {
    expect(languageColors['TypeScript']).toBe('#3178c6')
  })

  test('has correct color for Svelte', () => {
    expect(languageColors['Svelte']).toBe('#ff3e00')
  })
})
