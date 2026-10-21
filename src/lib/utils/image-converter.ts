export type ImageFormat = 'webp' | 'jpeg' | 'png'
export type ImageRotation = 0 | 90 | 180 | 270
export type CropRatio = 'original' | '1:1' | '4:3' | '3:2' | '16:9'
export type ImageResize = { mode: 'bounds'; width?: number; height?: number } | { mode: 'percent'; percent: number }

export interface ConversionOptions {
  format: ImageFormat
  quality: number
  maxEdge: number
  background: string
  resize?: ImageResize
  rotation?: ImageRotation
  flipHorizontal?: boolean
  flipVertical?: boolean
  cropRatio?: CropRatio
  targetBytes?: number
}

export interface ConvertedImage {
  blob: Blob
  width: number
  height: number
  originalWidth: number
  originalHeight: number
  quality: number
  targetMet: boolean
  referenceBlob?: Blob
}

export const MAX_FILE_BYTES = 25 * 1024 * 1024
export const MAX_BATCH_BYTES = 100 * 1024 * 1024
export const MAX_FILES = 20
export const MAX_PIXELS = 40_000_000
export const INPUT_ACCEPT = 'image/jpeg,image/png,image/webp,image/avif,image/bmp,.jpg,.jpeg,.png,.webp,.avif,.bmp'

export function validateImageFile(file: File): string | null {
  if (!/\.(jpe?g|png|webp|avif|bmp)$/i.test(file.name)) {
    return 'Choose a JPEG, PNG, WebP, AVIF, or BMP image.'
  }
  if (file.size === 0) return 'This file is empty. Choose another image.'
  if (file.size > MAX_FILE_BYTES) return 'This image exceeds 25 MB. Choose a smaller file.'
  return null
}

export function fitDimensions(width: number, height: number, maxEdge: number): { width: number; height: number } {
  if (![width, height].every(value => Number.isSafeInteger(value) && value > 0)) {
    throw new Error('This image has invalid dimensions.')
  }
  if (!Number.isSafeInteger(maxEdge) || maxEdge < 0 || maxEdge > 8192) {
    throw new Error('Enter a whole number from 1 to 8192, or leave the size empty.')
  }
  const scale = maxEdge === 0 ? 1 : Math.min(1, maxEdge / Math.max(width, height))
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

export function imageGeometry(width: number, height: number, options: Pick<ConversionOptions, 'maxEdge' | 'resize' | 'cropRatio' | 'rotation'>): { width: number; height: number; cropX: number; cropY: number; cropWidth: number; cropHeight: number; rotation: ImageRotation } {
  fitDimensions(width, height, 0)
  const ratios: Record<CropRatio, number> = { original: 0, '1:1': 1, '4:3': 4 / 3, '3:2': 3 / 2, '16:9': 16 / 9 }
  const ratio = ratios[options.cropRatio ?? 'original']
  if (ratio === undefined) throw new Error('Choose a supported crop ratio.')
  const rotation = options.rotation ?? 0
  if (![0, 90, 180, 270].includes(rotation)) throw new Error('Choose a rotation in steps of 90 degrees.')
  const cropWidth = ratio && width / height > ratio ? Math.max(1, Math.floor(height * ratio)) : width
  const cropHeight = ratio && width / height < ratio ? Math.max(1, Math.floor(width / ratio)) : height
  const rotatedWidth = rotation % 180 ? cropHeight : cropWidth
  const rotatedHeight = rotation % 180 ? cropWidth : cropHeight
  let dimensions = fitDimensions(rotatedWidth, rotatedHeight, options.maxEdge)
  const resize = options.resize
  if (resize?.mode === 'bounds') {
    for (const edge of [resize.width, resize.height]) {
      if (edge !== undefined && (!Number.isSafeInteger(edge) || edge < 1 || edge > 8192)) throw new Error('Width and height must be whole numbers from 1 to 8192.')
    }
    const scale = Math.min(1, (resize.width ?? rotatedWidth) / rotatedWidth, (resize.height ?? rotatedHeight) / rotatedHeight)
    dimensions = { width: Math.max(1, Math.round(rotatedWidth * scale)), height: Math.max(1, Math.round(rotatedHeight * scale)) }
  } else if (resize?.mode === 'percent') {
    if (!Number.isFinite(resize.percent) || resize.percent < 1 || resize.percent > 100) throw new Error('Choose a scale from 1 to 100%.')
    dimensions = { width: Math.max(1, Math.round(rotatedWidth * resize.percent / 100)), height: Math.max(1, Math.round(rotatedHeight * resize.percent / 100)) }
  }
  return { ...dimensions, cropX: Math.floor((width - cropWidth) / 2), cropY: Math.floor((height - cropHeight) / 2), cropWidth, cropHeight, rotation }
}

export function outputFilename(name: string, format: ImageFormat): string {
  const stem = name.replace(/\.[^.]*$/, '').replace(/[\\/\x00-\x1f\x7f]/g, '_').trim() || 'image'
  return `${stem}-optimized.${format === 'jpeg' ? 'jpg' : format}`
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function savingsLabel(before: number, after: number): string {
  const percent = Math.abs((1 - after / before) * 100)
  if (percent < 0.5) return 'About the same size'
  return `${Math.round(percent)}% ${after < before ? 'smaller' : 'larger'}`
}

async function encode(canvas: HTMLCanvasElement | OffscreenCanvas, format: ImageFormat, quality: number): Promise<Blob> {
  const blob = 'convertToBlob' in canvas
    ? await canvas.convertToBlob({ type: `image/${format}`, quality: quality / 100 })
    : await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) return reject(new Error('The browser could not export this image. Try a smaller size.'))
      resolve(blob)
    }, `image/${format}`, quality / 100)
  })
  if (blob.type !== `image/${format}`) throw new Error(`${format.toUpperCase()} export is unavailable in this browser. Choose another format.`)
  return blob
}

export async function supportedFormats(): Promise<ImageFormat[]> {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 1
  const formats: ImageFormat[] = []
  for (const format of ['webp', 'jpeg', 'png'] as const) {
    try { await encode(canvas, format, 80); formats.push(format) } catch { /* Unsupported encoders fall back to PNG. */ }
  }
  return formats
}

export async function convertImage(file: File, options: ConversionOptions, signal?: AbortSignal): Promise<ConvertedImage> {
  signal?.throwIfAborted()
  const validation = validateImageFile(file)
  if (validation) throw new Error(validation)
  if (!Number.isFinite(options.quality) || options.quality < 1 || options.quality > 100) throw new Error('Choose a quality from 1 to 100.')
  if (options.targetBytes !== undefined && (!Number.isSafeInteger(options.targetBytes) || options.targetBytes < 1024 || options.targetBytes > MAX_FILE_BYTES)) throw new Error('Choose a target size from 1 to 25600 KB.')
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new Error('This browser could not read the image. Try a JPEG, PNG, or WebP file.')
  }
  const canvas = typeof document === 'undefined' ? new OffscreenCanvas(1, 1) : document.createElement('canvas')
  try {
    signal?.throwIfAborted()
    if (bitmap.width * bitmap.height > MAX_PIXELS) throw new Error('This image exceeds 40 megapixels. Resize it before adding it.')
    const dimensions = imageGeometry(bitmap.width, bitmap.height, options)
    canvas.width = dimensions.width
    canvas.height = dimensions.height
    const context = 'convertToBlob' in canvas ? canvas.getContext('2d') : canvas.getContext('2d')
    if (!context) throw new Error('Image editing is unavailable in this browser.')
    if (options.format === 'jpeg') {
      context.fillStyle = options.background
      context.fillRect(0, 0, canvas.width, canvas.height)
    }
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.translate(canvas.width / 2, canvas.height / 2)
    context.scale(options.flipHorizontal ? -1 : 1, options.flipVertical ? -1 : 1)
    context.rotate(dimensions.rotation * Math.PI / 180)
    const drawWidth = dimensions.rotation % 180 ? canvas.height : canvas.width
    const drawHeight = dimensions.rotation % 180 ? canvas.width : canvas.height
    context.drawImage(bitmap, dimensions.cropX, dimensions.cropY, dimensions.cropWidth, dimensions.cropHeight, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight)
    let quality = options.quality
    let blob = await encode(canvas, options.format, quality)
    signal?.throwIfAborted()
    const target = options.format !== 'png' ? options.targetBytes : undefined
    if (target && blob.size > target) {
      blob = await encode(canvas, options.format, 1)
      quality = 1
      let low = 2
      let high = Math.floor(options.quality) - 1
      if (blob.size <= target) {
        while (low <= high) {
          signal?.throwIfAborted()
          const candidateQuality = Math.floor((low + high) / 2)
          const candidate = await encode(canvas, options.format, candidateQuality)
          if (candidate.size <= target) { blob = candidate; quality = candidateQuality; low = candidateQuality + 1 }
          else high = candidateQuality - 1
        }
      }
    }
    signal?.throwIfAborted()
    const transformed = dimensions.rotation !== 0 || options.flipHorizontal || options.flipVertical || (options.cropRatio && options.cropRatio !== 'original')
    const referenceBlob = transformed ? await encode(canvas, 'png', 100) : undefined
    signal?.throwIfAborted()
    return { blob, width: canvas.width, height: canvas.height, originalWidth: bitmap.width, originalHeight: bitmap.height, quality, targetMet: !target || blob.size <= target, referenceBlob }
  } finally {
    bitmap.close()
    canvas.width = canvas.height = 0
  }
}
