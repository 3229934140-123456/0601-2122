import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { LevelComponent, ComponentType, WinCondition, Level } from '@/types'

export interface Draft {
  id: string
  name: string
  type: ComponentType
  gridWidth: number
  gridHeight: number
  components: LevelComponent[]
  winConditions: WinCondition[]
  hintCount: number
  hints: string[]
  createdAt: number
  modifiedAt: number
}

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
  activeDraftId: string | null
  drafts: Draft[]
  isMovingSelectedComponent: boolean
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
  updateWinCondition: (index: number, condition: WinCondition) => void
  setHintCount: (count: number) => void
  setHints: (hints: string[]) => void
  setPlaytesting: (value: boolean) => void
  setMovingSelectedComponent: (value: boolean) => void
  clearEditor: () => void
  saveDraft: (name?: string) => Draft
  loadDraft: (id: string) => void
  deleteDraft: (id: string) => void
  newDraft: () => void
  renameDraft: (id: string, name: string) => void
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

const createNewDraftId = () => `draft_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

const collectEditorState = (state: EditorState): Omit<Draft, 'id' | 'createdAt' | 'modifiedAt'> => ({
  name: state.levelName,
  type: state.levelType,
  gridWidth: state.gridWidth,
  gridHeight: state.gridHeight,
  components: JSON.parse(JSON.stringify(state.components)),
  winConditions: JSON.parse(JSON.stringify(state.winConditions)),
  hintCount: state.hintCount,
  hints: [...state.hints],
})

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => ({
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
      activeDraftId: null,
      drafts: [],
      isMovingSelectedComponent: false,

      setLevelName: (name) => set({ levelName: name }),
      setLevelType: (type) => set({ levelType: type }),
      setGridSize: (width, height) => set({ gridWidth: width, gridHeight: height }),
      setSelectedComponentType: (type) => set({ selectedComponentType: type, selectedComponentId: null }),
      setSelectedComponentId: (id) => set({ selectedComponentId: id, isMovingSelectedComponent: false }),

      addComponent: (component) =>
        set((state) => ({ components: [...state.components, component] })),

      removeComponent: (id) =>
        set((state) => ({
          components: state.components.filter((c) => c.id !== id),
          selectedComponentId: state.selectedComponentId === id ? null : state.selectedComponentId,
          isMovingSelectedComponent: false,
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

      updateWinCondition: (index, condition) =>
        set((state) => ({
          winConditions: state.winConditions.map((c, i) => (i === index ? condition : c)),
        })),

      setHintCount: (count) => set({ hintCount: count }),
      setHints: (hints) => set({ hints }),
      setPlaytesting: (value) => set({ isPlaytesting: value }),
      setMovingSelectedComponent: (value) => set({ isMovingSelectedComponent: value }),

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
          activeDraftId: null,
          isMovingSelectedComponent: false,
        }),

      saveDraft: (name) => {
        const state = get()
        const now = Date.now()
        const draftName = name?.trim() || state.levelName || '未命名草稿'
        const data = collectEditorState(state)

        if (state.activeDraftId) {
          const updatedDrafts = state.drafts.map((d) =>
            d.id === state.activeDraftId
              ? { ...d, ...data, name: draftName, modifiedAt: now }
              : d
          )
          set({ drafts: updatedDrafts, levelName: draftName })
          return updatedDrafts.find((d) => d.id === state.activeDraftId)!
        } else {
          const newDraft: Draft = {
            id: createNewDraftId(),
            ...data,
            name: draftName,
            createdAt: now,
            modifiedAt: now,
          }
          set({
            drafts: [...state.drafts, newDraft],
            activeDraftId: newDraft.id,
            levelName: draftName,
          })
          return newDraft
        }
      },

      loadDraft: (id) => {
        const state = get()
        const draft = state.drafts.find((d) => d.id === id)
        if (!draft) return
        set({
          activeDraftId: draft.id,
          levelName: draft.name,
          levelType: draft.type,
          gridWidth: draft.gridWidth,
          gridHeight: draft.gridHeight,
          components: JSON.parse(JSON.stringify(draft.components)),
          winConditions: JSON.parse(JSON.stringify(draft.winConditions)),
          hintCount: draft.hintCount,
          hints: [...draft.hints],
          selectedComponentType: null,
          selectedComponentId: null,
          isMovingSelectedComponent: false,
        })
      },

      deleteDraft: (id) => {
        const state = get()
        const remaining = state.drafts.filter((d) => d.id !== id)
        const patch: Partial<EditorState> = { drafts: remaining }
        if (state.activeDraftId === id) {
          patch.activeDraftId = null
          patch.levelName = ''
          patch.components = []
          patch.winConditions = []
          patch.selectedComponentId = null
          patch.isMovingSelectedComponent = false
        }
        set(patch as EditorState)
      },

      newDraft: () => {
        const state = get()
        const now = Date.now()
        const emptyDraft: Draft = {
          id: createNewDraftId(),
          name: '未命名草稿',
          type: 'mirror',
          gridWidth: 6,
          gridHeight: 6,
          components: [],
          winConditions: [],
          hintCount: 3,
          hints: [''],
          createdAt: now,
          modifiedAt: now,
        }
        set({
          drafts: [...state.drafts, emptyDraft],
          activeDraftId: emptyDraft.id,
          levelName: emptyDraft.name,
          levelType: emptyDraft.type,
          gridWidth: emptyDraft.gridWidth,
          gridHeight: emptyDraft.gridHeight,
          components: [],
          winConditions: [],
          hintCount: 3,
          hints: [''],
          selectedComponentType: null,
          selectedComponentId: null,
          isMovingSelectedComponent: false,
        })
      },

      renameDraft: (id, name) => {
        const trimmed = name.trim() || '未命名草稿'
        set((state) => ({
          drafts: state.drafts.map((d) =>
            d.id === id ? { ...d, name: trimmed, modifiedAt: Date.now() } : d
          ),
          levelName: state.activeDraftId === id ? trimmed : state.levelName,
        }))
      },
    }),
    {
      name: 'mechpuzzle-editor-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        levelName: state.levelName,
        levelType: state.levelType,
        gridWidth: state.gridWidth,
        gridHeight: state.gridHeight,
        components: state.components,
        winConditions: state.winConditions,
        hintCount: state.hintCount,
        hints: state.hints,
        activeDraftId: state.activeDraftId,
        drafts: state.drafts,
      }),
    }
  )
)
