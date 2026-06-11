import LZString from 'lz-string'
import type { Level } from '@/types'

export function encodeLevel(level: Level): string {
  const json = JSON.stringify(level)
  return LZString.compressToEncodedURIComponent(json)
}

export function decodeLevel(code: string): Level | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(code)
    if (!json) return null
    return JSON.parse(json) as Level
  } catch {
    return null
  }
}

export function getShareUrl(code: string): string {
  return `${window.location.origin}/play/custom/${code}`
}

export function getShareCode(level: Level): string {
  return encodeLevel(level)
}
