import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Level } from '@/types'
import { defaultLevels } from '@/data/levels'

interface LevelState {
  levels: Level[]
  unlockedIds: string[]
  customLevels: Level[]
  getLevelById: (id: string) => Level | undefined
  isUnlocked: (id: string) => boolean
  unlockLevel: (id: string) => void
  addCustomLevel: (level: Level) => void
  removeCustomLevel: (id: string) => void
  getCustomLevelByShareCode: (code: string) => Level | undefined
}

export const useLevelStore = create<LevelState>()(
  persist(
    (set, get) => ({
      levels: defaultLevels,
      unlockedIds: ['mirror-1'],
      customLevels: [],

      getLevelById: (id: string) => {
        const state = get()
        return state.levels.find((l) => l.id === id) || state.customLevels.find((l) => l.id === id)
      },

      getLevelByCode: (code: string) => {
        const state = get()
        return state.customLevels.find((l) => l.id === `custom-${code}`)
          || state.customLevels.find((l) => l.id === `custom_${code}`)
          || state.customLevels.find((l) => l.id === code)
      },

      isUnlocked: (id: string) => {
        if (id.startsWith('custom_')) return true
        return get().unlockedIds.includes(id)
      },

      unlockLevel: (id: string) => {
        if (id.startsWith('custom_')) return
        set((state) => {
          if (state.unlockedIds.includes(id)) return state
          return { unlockedIds: [...state.unlockedIds, id] }
        })
      },

      addCustomLevel: (level: Level) => {
        set((state) => {
          const existingIdx = state.customLevels.findIndex((l) => l.id === level.id)
          if (existingIdx >= 0) {
            const updated = [...state.customLevels]
            updated[existingIdx] = level
            return { customLevels: updated }
          }
          return {
            customLevels: [...state.customLevels, level],
          }
        })
      },

      removeCustomLevel: (id: string) => {
        set((state) => ({
          customLevels: state.customLevels.filter((l) => l.id !== id),
        }))
      },

      getCustomLevelByShareCode: (code: string) => {
        return get().customLevels.find((l) => l.id === `custom-${code}`)
      },
    }),
    { name: 'mechpuzzle-levels' }
  )
)
