import { describe, test, expect } from 'bun:test'

import {
  computeColumnCount,
  computeGap,
  computeLayout,
  GAP,
  GAP_MOBILE,
  BREAKPOINT_TABLET,
  BREAKPOINT_MOBILE
} from '$lib/utils/masonry'
import type { Photo } from '$lib/gallery'

function makePhoto(overrides: Partial<Photo> = {}): Photo {
  return {
    id: '1',
    name: 'test.jpg',
    category: 'test',
    createdAt: new Date(),
    ...overrides
  }
}

describe('computeColumnCount', () => {
  test('returns 3 for desktop width (1200)', () => {
    expect(computeColumnCount(1200)).toBe(3)
  })

  test('returns 3 for width 800 (above tablet breakpoint)', () => {
    expect(computeColumnCount(800)).toBe(3)
  })

  test('returns 2 for exactly tablet breakpoint (768)', () => {
    expect(computeColumnCount(BREAKPOINT_TABLET)).toBe(2)
  })

  test('returns 2 for width between mobile and tablet (500)', () => {
    expect(computeColumnCount(500)).toBe(2)
  })

  test('returns 1 for exactly mobile breakpoint (480)', () => {
    expect(computeColumnCount(BREAKPOINT_MOBILE)).toBe(1)
  })

  test('returns 1 for small mobile (320)', () => {
    expect(computeColumnCount(320)).toBe(1)
  })
})

describe('computeGap', () => {
  test('returns GAP (16) for desktop width', () => {
    expect(computeGap(1024)).toBe(GAP)
    expect(computeGap(1024)).toBe(16)
  })

  test('returns GAP (16) for width just above tablet (769)', () => {
    expect(computeGap(769)).toBe(GAP)
  })

  test('returns GAP_MOBILE (8) for exactly tablet width (768)', () => {
    expect(computeGap(BREAKPOINT_TABLET)).toBe(GAP_MOBILE)
    expect(computeGap(768)).toBe(8)
  })

  test('returns GAP_MOBILE (8) for mobile width (400)', () => {
    expect(computeGap(400)).toBe(GAP_MOBILE)
  })
})

describe('computeLayout', () => {
  test('returns empty layout for empty items', () => {
    const result = computeLayout([], 1000, 3, 16)
    expect(result).toEqual({ positions: [], totalHeight: 0 })
  })

  test('returns empty layout for width <= 0', () => {
    const items = [makePhoto()]
    expect(computeLayout(items, 0, 3, 16)).toEqual({
      positions: [],
      totalHeight: 0
    })
    expect(computeLayout(items, -100, 3, 16)).toEqual({
      positions: [],
      totalHeight: 0
    })
  })

  test('positions single item at origin in single column', () => {
    const items = [makePhoto({ width: 800, height: 600 })]
    const result = computeLayout(items, 1000, 1, 0)

    expect(result.positions).toHaveLength(1)
    expect(result.positions[0].left).toBe(0)
    expect(result.positions[0].top).toBe(0)
    expect(result.positions[0].width).toBe(1000)
    // height = columnWidth / aspectRatio = 1000 / (800/600) = 750
    expect(result.positions[0].height).toBe(750)
  })

  test('distributes multiple items across 2 columns with explicit dimensions', () => {
    const items = [
      makePhoto({ id: '1', width: 800, height: 600 }), // aspect 4:3
      makePhoto({ id: '2', width: 600, height: 800 }), // aspect 3:4
      makePhoto({ id: '3', width: 1000, height: 1000 }) // aspect 1:1
    ]

    const containerWidth = 1000
    const columnCount = 2
    const gap = 16

    const result = computeLayout(items, containerWidth, columnCount, gap)

    expect(result.positions).toHaveLength(3)

    // columnWidth = (1000 - 16 * 1) / 2 = 492
    const expectedColumnWidth =
      (containerWidth - gap * (columnCount - 1)) / columnCount

    // Item 1: column 0 (both start at 0, picks first)
    expect(result.positions[0].left).toBe(0)
    expect(result.positions[0].top).toBe(0)
    expect(result.positions[0].width).toBe(expectedColumnWidth)

    // Item 2: column 1 (both columns at 0, but col 0 now has item 1's height)
    // Actually: after item 1, col 0 height > 0, col 1 still 0, so item 2 goes to col 1
    expect(result.positions[1].left).toBe(expectedColumnWidth + gap)
    expect(result.positions[1].top).toBe(0)
  })

  test('uses 3:4 fallback aspect ratio for items without dimensions', () => {
    const items = [makePhoto()] // no width/height
    const result = computeLayout(items, 900, 1, 0)

    expect(result.positions).toHaveLength(1)
    // height = columnWidth / (3/4) = 900 / 0.75 = 1200
    expect(result.positions[0].height).toBe(1200)
    expect(result.positions[0].width).toBe(900)
  })

  test('places items in shortest column', () => {
    // First item tall, second item short - third should go to column with short item
    const items = [
      makePhoto({ id: '1', width: 100, height: 200 }), // tall (aspect 0.5)
      makePhoto({ id: '2', width: 200, height: 100 }), // wide (aspect 2.0)
      makePhoto({ id: '3', width: 100, height: 100 }) // square
    ]

    const result = computeLayout(items, 1000, 2, 0)

    // columnWidth = 500
    // Item 1 goes to col 0, height = 500/0.5 = 1000. Col 0 height = 1000
    // Item 2 goes to col 1, height = 500/2.0 = 250. Col 1 height = 250
    // Item 3: col 1 (250) < col 0 (1000), goes to col 1
    expect(result.positions[2].left).toBe(500) // col 1
    expect(result.positions[2].top).toBe(250) // below item 2
  })
})
