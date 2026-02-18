export interface PhotoCategory {
	name: string;
	slug: string;
	description?: string;
	order: number;
}

export interface Photo {
	id: string;
	name: string;
	url: string;
	thumbUrl?: string;
	mediumUrl?: string;
	fullUrl?: string;
	category: string;
	createdAt: Date;
}
