import { env } from '$env/dynamic/private'

import {
  hasPocketIdSettings,
  parsePocketIdSettings,
  type PocketIdSettings
} from './pocket-id-policy'

export function pocketIdEnabled(): boolean {
  return hasPocketIdSettings(env)
}

export function getPocketIdSettings(): PocketIdSettings | null {
  return parsePocketIdSettings(env)
}
