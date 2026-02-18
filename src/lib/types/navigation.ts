export interface NavItem {
	label: string;
	href: string;
	external?: boolean;
}

export interface SocialLink {
	name: string;
	url: string;
	icon: 'github' | 'linkedin' | 'email';
}
