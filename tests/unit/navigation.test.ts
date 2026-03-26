import { describe, test, expect } from 'bun:test'

import { navigation, socialLinks } from '$lib/config/navigation'

describe('navigation', () => {
  test('has 4 items', () => {
    expect(navigation).toHaveLength(4)
  })

  test('has correct labels and hrefs', () => {
    expect(navigation[0]).toEqual({ label: 'Home', href: '/' })
    expect(navigation[1]).toEqual({ label: 'About', href: '/about' })
    expect(navigation[2]).toEqual({ label: 'Projects', href: '/projects' })
    expect(navigation[3]).toEqual({ label: 'Gallery', href: '/gallery' })
  })

  test('all hrefs start with /', () => {
    for (const item of navigation) {
      expect(item.href.startsWith('/')).toBe(true)
    }
  })
})

describe('socialLinks', () => {
  test('has 3 items', () => {
    expect(socialLinks).toHaveLength(3)
  })

  test('has correct names, urls, and icons', () => {
    expect(socialLinks[0]).toEqual({
      name: 'GitHub',
      url: 'https://github.com/Xerrion',
      icon: 'github'
    })
    expect(socialLinks[1]).toEqual({
      name: 'LinkedIn',
      url: 'https://www.linkedin.com/in/lasse-skovgaard-nielsen/',
      icon: 'linkedin'
    })
    expect(socialLinks[2]).toEqual({
      name: 'Email',
      url: 'mailto:lasse@xerrion.dk',
      icon: 'email'
    })
  })

  test('all urls are valid URLs or mailto: links', () => {
    for (const link of socialLinks) {
      const isValidUrl =
        link.url.startsWith('https://') || link.url.startsWith('mailto:')
      expect(isValidUrl).toBe(true)
    }
  })

  test('all icons are one of github, linkedin, email', () => {
    const validIcons = ['github', 'linkedin', 'email']
    for (const link of socialLinks) {
      expect(validIcons).toContain(link.icon)
    }
  })
})
