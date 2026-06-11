import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { LevelRecord, PlayerProgress, Rating } from '@/types'

interface ProgressState {
  records: Record<string, LevelRecord>
  progress: PlayerProgress
  favorites: string[]
  getRecord: (levelId: string) => LevelRecord | undefined
  isFavorite: (levelId: string) => boolean
  toggleFavorite: (levelId: string) => void
  completeLevel: (levelId: string, steps: number, time: number, minSteps: number) => Rating
  getRating: (steps: number, minSteps: number) => Rating
  updateStreak: () => void
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      records: {},
      progress: { totalSolved: 0, streakDays: 0, lastPlayDate: null },
      favorites: [],

      getRecord: (levelId: string) => get().records[levelId],

      isFavorite: (levelId: string) => get().favorites.includes(levelId),

      toggleFavorite: (levelId: string) => {
        set((state) => {
          const exists = state.favorites.includes(levelId)
          return {
            favorites: exists
              ? state.favorites.filter((id) => id !== levelId)
              : [...state.favorites, levelId],
          }
        })
      },

      getRating: (steps: number, minSteps: number): Rating => {
        if (steps <= minSteps) return 'S'
        if (steps <= minSteps * 1.3) return 'A'
        if (steps <= minSteps * 1.7) return 'B'
        return 'C'
      },

      completeLevel: (levelId: string, steps: number, time: number, minSteps: number): Rating => {
        const rating = get().getRating(steps, minSteps)
        set((state) => {
          const existing = state.records[levelId]
          const shouldUpdate =
            !existing ||
            !existing.completed ||
            steps < existing.bestSteps ||
            time < existing.bestTime

          const newRecord: LevelRecord = shouldUpdate
            ? {
                levelId,
                bestSteps: existing?.completed ? Math.min(existing.bestSteps, steps) : steps,
                bestTime: existing?.completed ? Math.min(existing.bestTime, time) : time,
                rating,
                completed: true,
                completedAt: new Date().toISOString(),
              }
            : { ...existing, rating: rating }

          const isNewlyCompleted = !existing?.completed
          return {
            records: { ...state.records, [levelId]: newRecord },
            progress: {
              ...state.progress,
              totalSolved: state.progress.totalSolved + (isNewlyCompleted ? 1 : 0),
            },
          }
        })
        get().updateStreak()
        return rating
      },

      updateStreak: () => {
        const today = new Date().toISOString().split('T')[0]
        set((state) => {
          const lastDate = state.progress.lastPlayDate
          if (lastDate === today) return state

          let newStreak = state.progress.streakDays
          if (lastDate) {
            const last = new Date(lastDate)
            const now = new Date(today)
            const diff = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24))
            newStreak = diff === 1 ? newStreak + 1 : diff === 0 ? newStreak : 1
          } else {
            newStreak = 1
          }

          return {
            progress: {
              ...state.progress,
              streakDays: newStreak,
              lastPlayDate: today,
            },
          }
        })
      },
    }),
    { name: 'mechpuzzle-progress' }
  )
)
