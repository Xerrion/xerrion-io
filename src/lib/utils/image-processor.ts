import { convertImage } from './image-converter'
import type { ConversionOptions, ConvertedImage } from './image-converter'

export async function processImage(file: File, options: ConversionOptions, signal: AbortSignal): Promise<ConvertedImage> {
  signal.throwIfAborted()
  if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined' || typeof OffscreenCanvas.prototype.convertToBlob !== 'function') return convertImage(file, options, signal)
  let worker: Worker
  try { worker = new Worker(new URL('./image-converter.worker.ts', import.meta.url), { type: 'module' }) }
  catch { return convertImage(file, options, signal) }
  return new Promise((resolve, reject) => {
    const cleanup = (): void => { worker.terminate(); signal.removeEventListener('abort', abort) }
    const abort = (): void => { cleanup(); reject(new DOMException('Conversion cancelled.', 'AbortError')) }
    signal.addEventListener('abort', abort, { once: true })
    worker.onmessage = (event: MessageEvent<{ result?: ConvertedImage; error?: string }>): void => {
      cleanup()
      if (signal.aborted) return reject(signal.reason)
      if (event.data.result) resolve(event.data.result)
      else reject(new Error(event.data.error ?? 'Conversion failed. Try another image.'))
    }
    worker.onerror = (event): void => { event.preventDefault(); cleanup(); reject(new Error('Image processing could not start. Reload this page and try again.')) }
    try { worker.postMessage({ file, options }) }
    catch { cleanup(); reject(new Error('The image could not be sent for processing. Try another file.')) }
  })
}
