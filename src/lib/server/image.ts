import sharp from 'sharp';

const SIZES = {
	thumb: { width: 400, label: 'thumb' },
	medium: { width: 1200, label: 'medium' },
	full: { width: 2400, label: 'full' }
} as const;

type SizeKey = keyof typeof SIZES;

export type ProcessingStep =
	| 'decoding'
	| 'resizing:thumb'
	| 'resizing:medium'
	| 'resizing:full';

export type ProgressCallback = (step: ProcessingStep) => void;

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

function isHeic(buffer: Buffer): boolean {
	if (buffer.length < 12) return false;
	const header = buffer.subarray(4, 12).toString('ascii');
	return (
		header.includes('ftyp') &&
		(header.includes('heic') || header.includes('heix') || header.includes('mif1'))
	);
}

async function decodeHeic(
	input: Buffer
): Promise<{ data: Buffer; width: number; height: number }> {
	const decode = (await import('heic-decode')).default;
	// heic-decode internally spreads buffer.slice() — ArrayBuffer.slice() returns
	// a non-iterable ArrayBuffer, so we must pass a Uint8Array instead.
	const uint8 = new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
	const { data, width, height } = await decode({ buffer: uint8 as unknown as ArrayBufferLike });
	return { data: Buffer.from(data), width, height };
}

interface SharpSource {
	instance: () => sharp.Sharp;
	width: number;
	height: number;
}

async function prepareSource(
	inputBuffer: Buffer,
	onProgress?: ProgressCallback
): Promise<SharpSource> {
	if (isHeic(inputBuffer)) {
		onProgress?.('decoding');
		const { data, width, height } = await decodeHeic(inputBuffer);
		return {
			instance: () => sharp(data, { raw: { width, height, channels: 4 } }).rotate(),
			width,
			height
		};
	}

	const rotated = sharp(inputBuffer).rotate();
	const { data, info } = await rotated.toBuffer({ resolveWithObject: true });
	return {
		instance: () => sharp(data),
		width: info.width,
		height: info.height
	};
}

async function resizeToWebp(
	source: SharpSource,
	size: SizeKey,
	onProgress?: ProgressCallback
): Promise<ProcessedImage> {
	onProgress?.(`resizing:${size}`);
	const { width } = SIZES[size];

	const { data, info } = await source
		.instance()
		.resize({
			width: Math.min(width, source.width),
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
	};
}

export async function processImage(
	inputBuffer: Buffer,
	onProgress?: ProgressCallback
): Promise<ProcessedImageSet> {
	const source = await prepareSource(inputBuffer, onProgress);

	const [thumb, medium, full] = await Promise.all([
		resizeToWebp(source, 'thumb', onProgress),
		resizeToWebp(source, 'medium', onProgress),
		resizeToWebp(source, 'full', onProgress)
	]);

	return {
		thumb,
		medium,
		full,
		originalWidth: source.width,
		originalHeight: source.height
	};
}

export function generateBlobPath(categorySlug: string, baseName: string, size: SizeKey): string {
	const sanitized = baseName
		.replace(/\.[^.]+$/, '')
		.replace(/[^a-zA-Z0-9_-]/g, '_')
		.toLowerCase();

	return `gallery/${categorySlug}/${sanitized}-${size}.webp`;
}
