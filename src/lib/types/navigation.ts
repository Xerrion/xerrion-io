/** Navigation item */
export interface NavItem {
	label: string;
	href: string;
	external?: boolean;
}

/** Social link */
export interface SocialLink {
	name: string;
	url: string;
	icon: 'github' | 'linkedin' | 'email';
}

/** Site navigation */
export const navigation: NavItem[] = [
	{ label: 'Home', href: '/' },
	{ label: 'About', href: '/about' },
	{ label: 'Projects', href: '/projects' },
	{ label: 'Gallery', href: '/gallery' }
];

/** Social links */
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
];
