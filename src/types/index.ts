export type ComponentType = 'mirror' | 'block' | 'circuit' | 'color_gate' | 'light_source' | 'target' | 'wall' | 'exit'

export type MirrorDirection = 0 | 45 | 90 | 135
export type LightDirection = 0 | 90 | 180 | 270
export type CircuitConnections = [boolean, boolean, boolean, boolean]

export interface Position {
  row: number
  col: number
}

export interface MirrorProperties {
  direction: MirrorDirection
  isFixed: boolean
}

export interface BlockProperties {
  isFixed: boolean
}

export interface CircuitProperties {
  connections: CircuitConnections
  isSource: boolean
  isTarget: boolean
  isPowered: boolean
  isFixed: boolean
}

export interface ColorGateProperties {
  currentOrder: number[]
  targetOrder: number[]
  colorCount: number
  isFixed: boolean
}

export interface LightSourceProperties {
  direction: LightDirection
  color: string
}

export interface ExitProperties {
  isOpen: boolean
}

export interface LevelComponent {
  id: string
  type: ComponentType
  position: Position
  properties: MirrorProperties | BlockProperties | CircuitProperties | ColorGateProperties | LightSourceProperties | ExitProperties | Record<string, unknown>
}

export type WinConditionType = 'light_reach' | 'block_on_target' | 'circuit_complete' | 'color_match'

export interface WinCondition {
  type: WinConditionType
  params: Record<string, unknown>
}

export interface Level {
  id: string
  name: string
  type: ComponentType
  difficulty: number
  minSteps: number
  gridWidth: number
  gridHeight: number
  hintCount: number
  hints: string[]
  components: LevelComponent[]
  winConditions: WinCondition[]
  isDefault: boolean
}

export interface LevelRecord {
  levelId: string
  bestSteps: number
  bestTime: number
  rating: 'S' | 'A' | 'B' | 'C'
  completed: boolean
  completedAt: string | null
}

export interface PlayerProgress {
  totalSolved: number
  streakDays: number
  lastPlayDate: string | null
}

export type Rating = 'S' | 'A' | 'B' | 'C'

export interface Command {
  execute: () => void
  undo: () => void
  description: string
}

export interface GameState {
  level: Level | null
  components: LevelComponent[]
  steps: number
  startTime: number
  history: Command[]
  historyIndex: number
  isCompleted: boolean
  isCustom: boolean
}

export interface EditorState {
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
}
