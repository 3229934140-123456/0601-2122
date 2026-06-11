import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface HintState {
  usedHints: Record<string, number>
  revealedHints: Record<string, number>
  getUsedCount: (levelId: string) => number
  getRevealedCount: (levelId: string) => number
  useHint: (levelId: string) => number
  resetLevelHints: (levelId: string) => void
}

export const useHintStore = create<HintState>()(
  persist(
    (set, get) => ({
      usedHints: {},
      revealedHints: {},

      getUsedCount: (levelId: string) => get().usedHints[levelId] || 0,

      getRevealedCount: (levelId: string) => get().revealedHints[levelId] || 0,

      useHint: (levelId: string): number => {
        const current = get().revealedHints[levelId] || 0
        const newCount = current + 1
        set((state) => ({
          usedHints: { ...state.usedHints, [levelId]: (state.usedHints[levelId] || 0) + 1 },
          revealedHints: { ...state.revealedHints, [levelId]: newCount },
        }))
        return newCount
      },

      resetLevelHints: (levelId: string) => {
        set((state) => ({
          revealedHints: { ...state.revealedHints, [levelId]: 0 },
        }))
      },
    }),
    { name: 'mechpuzzle-hints' }
  )
)
