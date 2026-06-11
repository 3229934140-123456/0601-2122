import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { LevelComponent, ComponentType, WinCondition } from '@/types'

interface EditorState {
  levelName: string
  levelType: ComponentType
  gridWidth: number
  gridHeight: number
  components: LevelComponent[]
  selectedComponentType: ComponentType | null
  selectedComponentId: string | null
  winConditions: WinCondition[]
  hintCount: number
  hints: string[]
  isPlaytesting: boolean
  setLevelName: (name: string) => void
  setLevelType: (type: ComponentType) => void
  setGridSize: (width: number, height: number) => void
  setSelectedComponentType: (type: ComponentType | null) => void
  setSelectedComponentId: (id: string | null) => void
  addComponent: (component: LevelComponent) => void
  removeComponent: (id: string) => void
  updateComponent: (id: string, updates: Partial<LevelComponent>) => void
  addWinCondition: (condition: WinCondition) => void
  removeWinCondition: (index: number) => void
  setHintCount: (count: number) => void
  setHints: (hints: string[]) => void
  setPlaytesting: (value: boolean) => void
  clearEditor: () => void
}

const defaultProperties: Record<ComponentType, LevelComponent['properties']> = {
  mirror: { direction: 45, isFixed: false },
  block: { isFixed: false },
  circuit: { connections: [true, false, false, false], isSource: false, isTarget: false, isPowered: false, isFixed: false },
  color_gate: { currentOrder: [1, 2, 3], targetOrder: [1, 2, 3], colorCount: 3, isFixed: false },
  light_source: { direction: 0, color: '#e67e22' },
  target: {},
  wall: {},
  exit: { isOpen: false },
}

export const getDefaultProperties = (type: ComponentType): LevelComponent['properties'] => {
  return { ...defaultProperties[type] }
}

export const useEditorStore = create<EditorState>()(
  persist(
    (set) => ({
      levelName: '',
      levelType: 'mirror',
      gridWidth: 6,
      gridHeight: 6,
      components: [],
      selectedComponentType: null,
      selectedComponentId: null,
      winConditions: [],
      hintCount: 3,
      hints: [''],
      isPlaytesting: false,

      setLevelName: (name) => set({ levelName: name }),
      setLevelType: (type) => set({ levelType: type }),
      setGridSize: (width, height) => set({ gridWidth: width, gridHeight: height }),
      setSelectedComponentType: (type) => set({ selectedComponentType: type, selectedComponentId: null }),
      setSelectedComponentId: (id) => set({ selectedComponentId: id }),

      addComponent: (component) =>
        set((state) => ({ components: [...state.components, component] })),

      removeComponent: (id) =>
        set((state) => ({
          components: state.components.filter((c) => c.id !== id),
          selectedComponentId: state.selectedComponentId === id ? null : state.selectedComponentId,
        })),

      updateComponent: (id, updates) =>
        set((state) => ({
          components: state.components.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        })),

      addWinCondition: (condition) =>
        set((state) => ({ winConditions: [...state.winConditions, condition] })),

      removeWinCondition: (index) =>
        set((state) => ({
          winConditions: state.winConditions.filter((_, i) => i !== index),
        })),

      setHintCount: (count) => set({ hintCount: count }),
      setHints: (hints) => set({ hints }),
      setPlaytesting: (value) => set({ isPlaytesting: value }),

      clearEditor: () =>
        set({
          levelName: '',
          levelType: 'mirror',
          gridWidth: 6,
          gridHeight: 6,
          components: [],
          selectedComponentType: null,
          selectedComponentId: null,
          winConditions: [],
          hintCount: 3,
          hints: [''],
          isPlaytesting: false,
        }),
    }),
    {
      name: 'mechpuzzle-editor-storage',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        levelName: state.levelName,
        levelType: state.levelType,
        gridWidth: state.gridWidth,
        gridHeight: state.gridHeight,
        components: state.components,
        winConditions: state.winConditions,
        hintCount: state.hintCount,
        hints: state.hints,
      }),
    }
  )
)
