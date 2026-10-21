import { convertImage } from './image-converter'
import type { ConversionOptions } from './image-converter'

self.onmessage = async (event: MessageEvent<{ file: File; options: ConversionOptions }>): Promise<void> => {
  try {
    const result = await convertImage(event.data.file, event.data.options)
    self.postMessage({ result })
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : 'Conversion failed. Try another image.' })
  }
}
