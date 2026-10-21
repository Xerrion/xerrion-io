import { describe, expect, test } from 'bun:test'

import { waterGeometry, waterTimestep } from '$lib/experiments/flux-water/settings'

describe('water simulation limits', () => {
  test('uses complete workgroups within device limits for portrait and wide canvases', () => {
    for (const [width, height] of [[390, 600], [1000, 400], [100_000, 100], [1, 100_000]]) {
      const geometry = waterGeometry(width, height, 448, 2, 3, 1, 2048)
      expect(geometry.width % 8).toBe(0)
      expect(geometry.height % 8).toBe(0)
      expect(geometry.width).toBeGreaterThanOrEqual(8)
      expect(geometry.height).toBeGreaterThanOrEqual(8)
      expect(geometry.width).toBeLessThanOrEqual(2048)
      expect(geometry.height).toBeLessThanOrEqual(2048)
      expect(geometry.canvasWidth).toBeLessThanOrEqual(2048)
      expect(geometry.canvasHeight).toBeLessThanOrEqual(2048)
    }
  })

  test('bounds output pixels and reduces work at lower quality', () => {
    const light = waterGeometry(1800, 1200, 192, 0, 2)
    const ultra = waterGeometry(1800, 1200, 448, 2, 2)
    expect(light.canvasWidth * light.canvasHeight).toBeLessThan(802_000)
    expect(ultra.canvasWidth * ultra.canvasHeight).toBeLessThan(2_403_000)
    expect(light.width * light.height).toBeLessThan(ultra.width * ultra.height)
    const adapted = waterGeometry(1800, 1200, 128, 0, 2, .55)
    expect(adapted.canvasWidth).toBeLessThan(light.canvasWidth)
  })

  test('keeps solver steps at most 1/120 second after slow frames or tab suspension', () => {
    for (const milliseconds of [0, 8.33, 16.67, 33, 50, 1000, -1]) {
      const { elapsed, steps } = waterTimestep(milliseconds)
      expect(elapsed).toBeGreaterThanOrEqual(0)
      expect(elapsed).toBeLessThanOrEqual(.05)
      expect(elapsed / steps).toBeLessThanOrEqual(1 / 120)
      expect(steps).toBeLessThanOrEqual(6)
    }
    expect(waterTimestep(1000)).toEqual({ elapsed: .05, steps: 6 })
  })
})
