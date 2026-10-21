export interface WaterSettings {
  swirl: number
  persistence: number
  brush: number
  material: number
  palette: number
  quality: number
}

export const defaults: WaterSettings = { swirl: 45, persistence: 65, brush: 35, material: 0, palette: 0, quality: 1 }
export const materials = ['Clear pool', 'Tropical sand', 'Deep water']
export const qualities = ['Light', 'Balanced', 'Ultra']
export const resolutions = [192, 320, 448]
export const palettes = [
  { name: 'Daylight', colors: [[.32, .61, .77], [1, .96, .83], [1, 1, 1]] },
  { name: 'Sunset', colors: [[.29, .34, .52], [1, .66, .37], [1, .83, .68]] },
  { name: 'Overcast', colors: [[.42, .51, .56], [.81, .87, .85], [.85, .93, .98]] },
  { name: 'Moonlight', colors: [[.04, .09, .21], [.43, .62, .87], [.23, .36, .52]] }
]

export interface WaterGeometry {
  width: number
  height: number
  canvasWidth: number
  canvasHeight: number
}

/** Bound both the simulation grid and display texture to the adapter's limits. */
export function waterGeometry(cssWidth: number, cssHeight: number, resolution: number, quality: number, devicePixelRatio: number, pixelScale = 1, limit = 8192): WaterGeometry {
  const aspect = Math.max(1, cssWidth) / Math.max(1, cssHeight)
  const gridLimit = Math.floor(limit / 8) * 8
  const height = Math.max(8, Math.min(gridLimit, Math.round(Math.min(resolution, resolution / aspect, gridLimit / aspect) / 8) * 8))
  const width = Math.max(8, Math.min(gridLimit, Math.round(height * aspect / 8) * 8))
  const pixelBudget = [800_000, 1_500_000, 2_400_000][quality] ?? 1_500_000
  const scale = Math.min(devicePixelRatio || 1, 1.6, Math.sqrt(pixelBudget / (Math.max(1, cssWidth) * Math.max(1, cssHeight))), limit / Math.max(1, cssWidth), limit / Math.max(1, cssHeight)) * pixelScale
  return { width, height, canvasWidth: Math.max(1, Math.round(cssWidth * scale)), canvasHeight: Math.max(1, Math.round(cssHeight * scale)) }
}

/** A delayed animation frame must not advance the solver by more than 50 ms. */
export function waterTimestep(milliseconds: number): { elapsed: number; steps: number } {
  const elapsed = Math.max(0, Math.min(milliseconds / 1000, .05))
  return { elapsed, steps: Math.max(1, Math.ceil(elapsed * 120)) }
}
