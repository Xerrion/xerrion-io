/** Photo category discovered from Vercel Blob folder structure */
export interface PhotoCategory {
	name: string;
	slug: string;
}

/** Photo item from Vercel Blob Storage */
export interface Photo {
	id: string;
	name: string;
	url: string;
	category: string;
	createdAt: Date;
}

/** Root prefix for gallery blobs */
export const GALLERY_PREFIX = 'gallery/';

/** Image file extensions supported by browsers */
const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|avif)$/i;

/** Check if a blob pathname is a displayable image */
export function isDisplayableImage(pathname: string): boolean {
	return IMAGE_EXTENSIONS.test(pathname);
}

/** Extract the filename from a blob pathname */
export function getFileName(pathname: string): string {
	return pathname.split('/').pop() ?? pathname;
}

/** Convert a folder slug to a display name (e.g. "charlie" -> "Charlie") */
export function slugToName(slug: string): string {
	return slug.charAt(0).toUpperCase() + slug.slice(1);
}
