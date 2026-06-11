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

      isUnlocked: (id: string) => {
        return get().unlockedIds.includes(id)
      },

      unlockLevel: (id: string) => {
        set((state) => {
          if (state.unlockedIds.includes(id)) return state
          return { unlockedIds: [...state.unlockedIds, id] }
        })
      },

      addCustomLevel: (level: Level) => {
        set((state) => ({
          customLevels: [...state.customLevels, level],
        }))
      },

      getCustomLevelByShareCode: (code: string) => {
        return get().customLevels.find((l) => l.id === `custom-${code}`)
      },
    }),
    { name: 'mechpuzzle-levels' }
  )
)
