import sharp from 'sharp';

const SIZES = {
	thumb: { width: 400, label: 'thumb' },
	medium: { width: 1200, label: 'medium' },
	full: { width: 2400, label: 'full' }
} as const;

type SizeKey = keyof typeof SIZES;

export interface ProcessedImage {
	size: SizeKey;
	buffer: Buffer;
	width: number;
	height: number;
	byteLength: number;
}

export interface ProcessedImageSet {
	thumb: ProcessedImage;
	medium: ProcessedImage;
	full: ProcessedImage;
	originalWidth: number;
	originalHeight: number;
}

async function isHeic(buffer: Buffer): Promise<boolean> {
	if (buffer.length < 12) return false;
	const header = buffer.subarray(4, 12).toString('ascii');
	return header.includes('ftyp') && (header.includes('heic') || header.includes('heix') || header.includes('mif1'));
}

async function convertHeicToJpeg(buffer: Buffer): Promise<Buffer> {
	const convert = (await import('heic-convert')).default;
	const result = await convert({
		buffer: new Uint8Array(buffer) as unknown as ArrayBufferLike,
		format: 'JPEG',
		quality: 0.92
	});
	return Buffer.from(result);
}

export async function processImage(inputBuffer: Buffer): Promise<ProcessedImageSet> {
	let buffer = inputBuffer;

	if (await isHeic(buffer)) {
		buffer = await convertHeicToJpeg(buffer);
	}

	const metadata = await sharp(buffer).metadata();
	const originalWidth = metadata.width ?? 0;
	const originalHeight = metadata.height ?? 0;

	const results = await Promise.all(
		(Object.keys(SIZES) as SizeKey[]).map(async (size) => {
			const { width } = SIZES[size];

			const resized = sharp(buffer)
				.rotate()
				.resize({
					width: Math.min(width, originalWidth),
					withoutEnlargement: true
				})
				.webp({ quality: 82 });

			const outputBuffer = await resized.toBuffer();
			const outputMeta = await sharp(outputBuffer).metadata();

			return {
				size,
				buffer: outputBuffer,
				width: outputMeta.width ?? 0,
				height: outputMeta.height ?? 0,
				byteLength: outputBuffer.byteLength
			} satisfies ProcessedImage;
		})
	);

	const map = Object.fromEntries(results.map((r) => [r.size, r])) as Record<SizeKey, ProcessedImage>;

	return {
		thumb: map.thumb,
		medium: map.medium,
		full: map.full,
		originalWidth,
		originalHeight
	};
}

export function generateBlobPath(categorySlug: string, baseName: string, size: SizeKey): string {
	const sanitized = baseName
		.replace(/\.[^.]+$/, '')
		.replace(/[^a-zA-Z0-9_-]/g, '_')
		.toLowerCase();

	return `gallery/${categorySlug}/${sanitized}-${size}.webp`;
}
