import type { NavItem, SocialLink } from '$lib/types/navigation'

export const navigation: NavItem[] = [
  { label: 'Home', href: '/' },
  { label: 'Projects', href: '/projects' },
  { label: 'About', href: '/about' },
  { label: 'Blog', href: '/blog' },
  { label: 'Gallery', href: '/gallery' }
]

export const socialLinks: SocialLink[] = [
  {
    name: 'GitHub',
    url: 'https://github.com/Xerrion',
    icon: 'github'
  },
  {
    name: 'LinkedIn',
    url: 'https://www.linkedin.com/in/lasse-skovgaard-nielsen/',
    icon: 'linkedin'
  },
  {
    name: 'Email',
    url: 'mailto:lasse@xerrion.dk',
    icon: 'email'
  }
]
