import sharp from 'sharp';
import exifr from 'exifr';

export interface ImageMetadata {
	cameraMake: string | null;
	cameraModel: string | null;
	lensModel: string | null;
	iso: number | null;
	aperture: number | null;
	shutterSpeed: string | null;
	focalLength: number | null;
	dateTaken: string | null;
	colorSpace: string | null;
}

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
	metadata: ImageMetadata;
}

function formatShutterSpeed(exposureTime: number | undefined): string | null {
	if (!exposureTime) return null;
	if (exposureTime >= 1) return `${exposureTime}s`;
	return `1/${Math.round(1 / exposureTime)}s`;
}

function resolveColorSpace(space: number | string | undefined): string | null {
	if (space === 1 || space === 'sRGB') return 'sRGB';
	if (space === 2 || space === 'Adobe RGB') return 'Adobe RGB';
	if (space === 0xffff || space === 'Uncalibrated') return 'Uncalibrated';
	if (typeof space === 'string') return space;
	return null;
}

async function extractMetadata(buffer: Buffer): Promise<ImageMetadata> {
	try {
		const exif = await exifr.parse(buffer, {
			pick: [
				'Make', 'Model', 'LensModel',
				'ISO', 'FNumber', 'ExposureTime', 'FocalLength',
				'DateTimeOriginal', 'CreateDate',
				'ColorSpace', 'ProfileDescription'
			]
		});

		if (!exif) {
			return emptyMetadata();
		}

		const dateTaken = exif.DateTimeOriginal || exif.CreateDate;

		return {
			cameraMake: exif.Make?.trim() || null,
			cameraModel: exif.Model?.trim() || null,
			lensModel: exif.LensModel?.trim() || null,
			iso: exif.ISO ?? null,
			aperture: exif.FNumber ?? null,
			shutterSpeed: formatShutterSpeed(exif.ExposureTime),
			focalLength: exif.FocalLength ?? null,
			dateTaken: dateTaken instanceof Date ? dateTaken.toISOString() : null,
			colorSpace: resolveColorSpace(exif.ColorSpace) || exif.ProfileDescription || null
		};
	} catch {
		return emptyMetadata();
	}
}

function emptyMetadata(): ImageMetadata {
	return {
		cameraMake: null,
		cameraModel: null,
		lensModel: null,
		iso: null,
		aperture: null,
		shutterSpeed: null,
		focalLength: null,
		dateTaken: null,
		colorSpace: null
	};
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
	const [source, metadata] = await Promise.all([
		prepareSource(inputBuffer, onProgress),
		extractMetadata(inputBuffer)
	]);

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
		originalHeight: source.height,
		metadata
	};
}

export function generateBlobPath(categorySlug: string, baseName: string, size: SizeKey): string {
	const sanitized = baseName
		.replace(/\.[^.]+$/, '')
		.replace(/[^a-zA-Z0-9_-]/g, '_')
		.toLowerCase();

	return `gallery/${categorySlug}/${sanitized}-${size}.webp`;
}
