import { describe, expect, test } from 'bun:test'

import { fitDimensions, imageGeometry, MAX_FILE_BYTES, outputFilename, savingsLabel, validateImageFile } from '$lib/utils/image-converter'
import { crc32, createImageZip } from '$lib/utils/image-zip'

describe('image conversion boundaries', () => {
  test('center crops before rotation and fits the rotated bounds', () => {
    expect(imageGeometry(1200, 800, { maxEdge: 0, cropRatio: '1:1', rotation: 90, resize: { mode: 'bounds', width: 400, height: 300 } })).toEqual({
      width: 300, height: 300, cropX: 200, cropY: 0, cropWidth: 800, cropHeight: 800, rotation: 90
    })
    expect(imageGeometry(1200, 800, { maxEdge: 600, rotation: 90 })).toMatchObject({ width: 400, height: 600 })
  })

  test('scales by percentage and preserves the aspect ratio within two bounds', () => {
    expect(imageGeometry(1200, 800, { maxEdge: 0, resize: { mode: 'percent', percent: 25 } })).toMatchObject({ width: 300, height: 200 })
    expect(imageGeometry(1200, 800, { maxEdge: 0, resize: { mode: 'bounds', width: 900, height: 400 } })).toMatchObject({ width: 600, height: 400 })
    expect(imageGeometry(1200, 800, { maxEdge: 0, cropRatio: '16:9' })).toMatchObject({ cropWidth: 1200, cropHeight: 675, cropY: 62 })
    expect(imageGeometry(80, 60, { maxEdge: 0, resize: { mode: 'bounds', width: 900, height: 400 } })).toMatchObject({ width: 80, height: 60 })
  })

  test('rejects invalid advanced dimensions and scale percentages', () => {
    for (const percent of [0, 101, NaN]) expect(() => imageGeometry(100, 100, { maxEdge: 0, resize: { mode: 'percent', percent } })).toThrow()
    for (const width of [0, 1.5, 8193]) expect(() => imageGeometry(100, 100, { maxEdge: 0, resize: { mode: 'bounds', width } })).toThrow()
  })
  test('fits landscape and portrait images without enlarging or losing narrow edges', () => {
    expect(fitDimensions(4000, 3000, 1920)).toEqual({ width: 1920, height: 1440 })
    expect(fitDimensions(3000, 4000, 1600)).toEqual({ width: 1200, height: 1600 })
    expect(fitDimensions(400, 300, 1920)).toEqual({ width: 400, height: 300 })
    expect(fitDimensions(1, 8000, 1)).toEqual({ width: 1, height: 1 })
    expect(fitDimensions(4000, 3000, 0)).toEqual({ width: 4000, height: 3000 })
  })

  test('rejects invalid resize requests', () => {
    for (const edge of [-1, NaN, Infinity, 1.5, 8193]) expect(() => fitDimensions(400, 300, edge)).toThrow()
    expect(() => fitDimensions(0, 300, 100)).toThrow()
  })

  test('rejects unsupported, empty, and oversized files before decoding', () => {
    expect(validateImageFile(new File(['image'], 'photo.PNG', { type: '' }))).toBeNull()
    expect(validateImageFile(new File(['image'], 'animation.gif'))).toContain('Choose a JPEG')
    expect(validateImageFile(new File(['<svg />'], 'image.svg'))).toContain('Choose a JPEG')
    expect(validateImageFile(new File([], 'empty.png'))).toContain('empty')
    expect(validateImageFile(new File([new Uint8Array(MAX_FILE_BYTES + 1)], 'large.jpg'))).toContain('25 MB')
  })

  test('reports increased file sizes honestly', () => {
    expect(savingsLabel(1000, 400)).toBe('60% smaller')
    expect(savingsLabel(1000, 1600)).toBe('60% larger')
    expect(savingsLabel(1000, 1001)).toBe('About the same size')
  })

  test('uses the correct extension and safe download names', () => {
    expect(outputFilename('holiday.photo.PNG', 'jpeg')).toBe('holiday.photo-optimized.jpg')
    expect(outputFilename('../photo.png', 'webp')).toBe('.._photo-optimized.webp')
    expect(outputFilename('.png', 'png')).toBe('image-optimized.png')
  })
})

describe('batch ZIP exports', () => {
  test('matches the standard CRC-32 test vector', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926)
  })

  test('writes UTF-8 filenames, unique names, file content, and a matching directory', async () => {
    const archive = await createImageZip([
      { name: 'gåtur.webp', blob: new Blob(['first image']) },
      { name: 'gåtur.webp', blob: new Blob(['second image']) }
    ])
    const bytes = new Uint8Array(await archive.arrayBuffer())
    const view = new DataView(bytes.buffer)
    const decoder = new TextDecoder()
    const end = bytes.length - 22
    expect(view.getUint32(end, true)).toBe(0x06054b50)
    expect(view.getUint16(end + 10, true)).toBe(2)
    let directoryOffset = view.getUint32(end + 16, true)
    for (const [index, expectedName] of ['gåtur.webp', 'gåtur-2.webp'].entries()) {
      expect(view.getUint32(directoryOffset, true)).toBe(0x02014b50)
      expect(view.getUint16(directoryOffset + 8, true)).toBe(0x0800)
      const nameLength = view.getUint16(directoryOffset + 28, true)
      const name = decoder.decode(bytes.slice(directoryOffset + 46, directoryOffset + 46 + nameLength))
      expect(name).toBe(expectedName)
      const localOffset = view.getUint32(directoryOffset + 42, true)
      expect(view.getUint32(localOffset, true)).toBe(0x04034b50)
      const size = view.getUint32(localOffset + 18, true)
      const start = localOffset + 30 + nameLength
      const content = bytes.slice(start, start + size)
      expect(decoder.decode(content)).toBe(index === 0 ? 'first image' : 'second image')
      expect(crc32(content)).toBe(view.getUint32(directoryOffset + 16, true))
      directoryOffset += 46 + nameLength
    }
    expect(directoryOffset).toBe(end)
    expect(archive.type).toBe('application/zip')
  })

  test('rejects an empty archive', async () => {
    await expect(createImageZip([])).rejects.toThrow('between 1 and 20')
  })
})
