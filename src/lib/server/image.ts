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

async function decodeHeic(input: Buffer): Promise<{ data: Buffer; width: number; height: number }> {
	const decode = (await import('heic-decode')).default;
	const arrayBuffer = input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength);
	const { data, width, height } = await decode({ buffer: arrayBuffer as ArrayBufferLike });
	return { data: Buffer.from(data), width, height };
}

export async function processImage(inputBuffer: Buffer): Promise<ProcessedImageSet> {
	let sharpInput: sharp.Sharp;

	if (await isHeic(inputBuffer)) {
		const { data, width, height } = await decodeHeic(inputBuffer);
		sharpInput = sharp(data, { raw: { width, height, channels: 4 } }).rotate();
	} else {
		sharpInput = sharp(inputBuffer).rotate();
	}

	const metadata = await sharpInput.metadata();
	const originalWidth = metadata.width ?? 0;
	const originalHeight = metadata.height ?? 0;
	const rotatedBuffer = await sharpInput.toBuffer();

	const results = await Promise.all(
		(Object.keys(SIZES) as SizeKey[]).map(async (size) => {
			const { width } = SIZES[size];

			const { data, info } = await sharp(rotatedBuffer)
				.resize({
					width: Math.min(width, originalWidth),
					withoutEnlargement: true
				})
				.webp({ quality: 82 })
				.toBuffer({ resolveWithObject: true });

			return {
				size,
				buffer: data,
				width: info.width,
				height: info.height,
				byteLength: info.size
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
