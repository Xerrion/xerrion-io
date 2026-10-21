export interface ZipImage {
  name: string
  blob: Blob
}

const crcTable = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
  return value >>> 0
})

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

// Images are already compressed. STORE avoids spending CPU compressing them again.
export async function createImageZip(images: ZipImage[]): Promise<Blob> {
  if (images.length === 0 || images.length > 20) throw new Error('Choose between 1 and 20 converted images.')
  const files: BlobPart[] = []
  const directory: BlobPart[] = []
  const names = new Set<string>()
  let offset = 0
  let directorySize = 0
  for (const image of images) {
    const cleanName = image.name.replace(/[\\/\x00-\x1f\x7f]/g, '_') || 'image'
    let name = cleanName
    let suffix = 2
    while (names.has(name.toLowerCase())) {
      const dot = cleanName.lastIndexOf('.')
      name = dot > 0 ? `${cleanName.slice(0, dot)}-${suffix++}${cleanName.slice(dot)}` : `${cleanName}-${suffix++}`
    }
    names.add(name.toLowerCase())
    const filename = new TextEncoder().encode(name)
    if (filename.length > 65535) throw new Error('An image filename is too long.')
    const bytes = new Uint8Array(await image.blob.arrayBuffer())
    if (bytes.length > 0xffffffff || offset + bytes.length + filename.length + 30 > 0xffffffff) throw new Error('These images exceed the ZIP size limit.')
    const crc = crc32(bytes)
    const local = new Uint8Array(30)
    const header = new DataView(local.buffer)
    header.setUint32(0, 0x04034b50, true)
    header.setUint16(4, 20, true)
    header.setUint16(6, 0x0800, true)
    header.setUint16(12, 0x0021, true) // January 1, 1980, the minimum DOS date.
    header.setUint32(14, crc, true)
    header.setUint32(18, bytes.length, true)
    header.setUint32(22, bytes.length, true)
    header.setUint16(26, filename.length, true)
    files.push(local, filename, bytes)

    const central = new Uint8Array(46)
    const entry = new DataView(central.buffer)
    entry.setUint32(0, 0x02014b50, true)
    entry.setUint16(4, 20, true)
    entry.setUint16(6, 20, true)
    entry.setUint16(8, 0x0800, true)
    entry.setUint16(14, 0x0021, true)
    entry.setUint32(16, crc, true)
    entry.setUint32(20, bytes.length, true)
    entry.setUint32(24, bytes.length, true)
    entry.setUint16(28, filename.length, true)
    entry.setUint32(42, offset, true)
    directory.push(central, filename)
    offset += local.length + filename.length + bytes.length
    directorySize += central.length + filename.length
  }
  const end = new Uint8Array(22)
  const footer = new DataView(end.buffer)
  footer.setUint32(0, 0x06054b50, true)
  footer.setUint16(8, images.length, true)
  footer.setUint16(10, images.length, true)
  footer.setUint32(12, directorySize, true)
  footer.setUint32(16, offset, true)
  return new Blob([...files, ...directory, end], { type: 'application/zip' })
}
