import { describe, test, expect } from 'bun:test'

import {
  SITE_URL,
  SITE_NAME,
  SITE_AUTHOR,
  DEFAULT_DESCRIPTION,
  websiteSchema,
  personSchema,
  breadcrumbSchema
} from '$lib/seo'

describe('SEO constants', () => {
  test('SITE_URL is correct', () => {
    expect(SITE_URL).toBe('https://xerrion.io')
  })

  test('SITE_NAME is correct', () => {
    expect(SITE_NAME).toBe('Xerrion')
  })

  test('SITE_AUTHOR is correct', () => {
    expect(SITE_AUTHOR).toBe('Lasse Skovgaard Nielsen')
  })

  test('DEFAULT_DESCRIPTION contains key terms', () => {
    expect(DEFAULT_DESCRIPTION).toContain('Xerrion')
    expect(DEFAULT_DESCRIPTION).toContain('Software Engineer')
  })
})

describe('websiteSchema', () => {
  test('returns correct JSON-LD structure', () => {
    const schema = websiteSchema()

    expect(schema['@context']).toBe('https://schema.org')
    expect(schema['@type']).toBe('WebSite')
    expect(schema.name).toBe(SITE_NAME)
    expect(schema.url).toBe(SITE_URL)
    expect(schema.description).toBe(DEFAULT_DESCRIPTION)
  })

  test('author matches personSchema output', () => {
    const schema = websiteSchema()
    const person = personSchema()

    expect(schema.author).toEqual(person)
  })
})

describe('personSchema', () => {
  test('returns correct @type', () => {
    const schema = personSchema()
    expect(schema['@type']).toBe('Person')
  })

  test('has correct name and alternateName', () => {
    const schema = personSchema()
    expect(schema.name).toBe(SITE_AUTHOR)
    expect(schema.alternateName).toBe('Xerrion')
  })

  test('has correct url and jobTitle', () => {
    const schema = personSchema()
    expect(schema.url).toBe(SITE_URL)
    expect(schema.jobTitle).toBe('Software Engineer')
  })

  test('sameAs includes GitHub and LinkedIn URLs', () => {
    const schema = personSchema()
    expect(schema.sameAs).toContain('https://github.com/Xerrion')
    expect(schema.sameAs).toContain(
      'https://www.linkedin.com/in/lasse-skovgaard-nielsen/'
    )
  })
})

describe('breadcrumbSchema', () => {
  test('returns empty itemListElement for empty items', () => {
    const schema = breadcrumbSchema([])
    expect(schema.itemListElement).toEqual([])
  })

  test('has correct @type', () => {
    const schema = breadcrumbSchema([])
    expect(schema['@type']).toBe('BreadcrumbList')
  })

  test('has correct @context', () => {
    const schema = breadcrumbSchema([])
    expect(schema['@context']).toBe('https://schema.org')
  })

  test('positions are 1-indexed', () => {
    const schema = breadcrumbSchema([
      { name: 'Home', url: '/' },
      { name: 'Projects', url: '/projects' }
    ])

    expect(schema.itemListElement[0].position).toBe(1)
    expect(schema.itemListElement[1].position).toBe(2)
  })

  test('URLs are prefixed with SITE_URL', () => {
    const schema = breadcrumbSchema([
      { name: 'Home', url: '/' },
      { name: 'Projects', url: '/projects' }
    ])

    expect(schema.itemListElement[0].item).toBe('https://xerrion.io/')
    expect(schema.itemListElement[1].item).toBe('https://xerrion.io/projects')
  })

  test('items have correct names and ListItem type', () => {
    const schema = breadcrumbSchema([{ name: 'About', url: '/about' }])

    expect(schema.itemListElement[0]['@type']).toBe('ListItem')
    expect(schema.itemListElement[0].name).toBe('About')
  })
})
