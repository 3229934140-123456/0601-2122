import type { LevelComponent, WinCondition, CircuitProperties, ColorGateProperties, MirrorProperties, LightSourceProperties } from '@/types'

export interface LightSegment {
  from: { row: number; col: number }
  to: { row: number; col: number }
  color: string
}

export function traceLightBeam(
  components: LevelComponent[],
  gridWidth: number,
  gridHeight: number
): LightSegment[] {
  const sources = components.filter((c) => c.type === 'light_source')
  const allSegments: LightSegment[] = []

  for (const source of sources) {
    const props = source.properties as LightSourceProperties
    const color = props.color || '#e67e22'

    let row = source.position.row
    let col = source.position.col
    let dir: number = props.direction

    const segments: LightSegment[] = []
    const visited = new Set<string>()
    let maxReflections = 50

    let segStartRow = row
    let segStartCol = col

    const dr = () => (dir === 90 ? -1 : dir === 270 ? 1 : 0)
    const dc = () => (dir === 0 ? 1 : dir === 180 ? -1 : 0)

    row += dr()
    col += dc()

    while (maxReflections-- > 0 && row >= 0 && row < gridHeight && col >= 0 && col < gridWidth) {
      const key = `${row},${col},${dir}`
      if (visited.has(key)) break
      visited.add(key)

      const cellComponent = components.find(
        (c) => c.position.row === row && c.position.col === col
      )

      if (!cellComponent) {
        row += dr()
        col += dc()
        continue
      }

      if (cellComponent.type === 'wall' || cellComponent.type === 'block') {
        segments.push({ from: { row: segStartRow, col: segStartCol }, to: { row: row - dr(), col: col - dc() }, color })
        break
      }

      if (cellComponent.type === 'mirror') {
        const mirrorProps = cellComponent.properties as MirrorProperties
        segments.push({ from: { row: segStartRow, col: segStartCol }, to: { row, col }, color })

        const newDir = reflectDirection(dir, mirrorProps.direction)
        if (newDir === null) break

        dir = newDir
        segStartRow = row
        segStartCol = col

        row += dr()
        col += dc()
        continue
      }

      if (cellComponent.type === 'exit' || cellComponent.type === 'target') {
        segments.push({ from: { row: segStartRow, col: segStartCol }, to: { row, col }, color })
        break
      }

      row += dr()
      col += dc()
    }

    if (row < 0 || row >= gridHeight || col < 0 || col >= gridWidth) {
      segments.push({ from: { row: segStartRow, col: segStartCol }, to: { row: row - dr(), col: col - dc() }, color })
    }

    if (segments.length === 0) {
      let endRow = source.position.row
      let endCol = source.position.col
      while (endRow + dr() >= 0 && endRow + dr() < gridHeight && endCol + dc() >= 0 && endCol + dc() < gridWidth) {
        endRow += dr()
        endCol += dc()
      }
      segments.push({ from: { row: source.position.row, col: source.position.col }, to: { row: endRow, col: endCol }, color })
    }

    allSegments.push(...segments)
  }

  return allSegments
}

function reflectDirection(lightDir: number, mirrorAngle: number): number | null {
  const normalizedAngle = ((mirrorAngle % 180) + 180) % 180

  if (normalizedAngle === 45) {
    switch (lightDir) {
      case 0: return 270
      case 90: return 180
      case 180: return 90
      case 270: return 0
      default: return null
    }
  } else if (normalizedAngle === 135) {
    switch (lightDir) {
      case 0: return 90
      case 90: return 0
      case 180: return 270
      case 270: return 180
      default: return null
    }
  } else if (normalizedAngle === 0) {
    switch (lightDir) {
      case 0: return 180
      case 90: return 270
      case 180: return 0
      case 270: return 90
      default: return null
    }
  }
  return null
}

export function checkWinConditions(
  components: LevelComponent[],
  conditions: WinCondition[],
  gridWidth: number,
  gridHeight: number
): boolean {
  if (conditions.length === 0) return false
  return conditions.every((condition) => checkCondition(components, condition, gridWidth, gridHeight))
}

function checkCondition(
  components: LevelComponent[],
  condition: WinCondition,
  gridWidth: number,
  gridHeight: number
): boolean {
  switch (condition.type) {
    case 'light_reach': {
      const segments = traceLightBeam(components, gridWidth, gridHeight)
      const exitId = condition.params.exitId as string | undefined
      if (exitId) {
        const exit = components.find((c) => c.id === exitId)
        if (!exit) return false
        return segments.some(
          (seg) => seg.to.row === exit.position.row && seg.to.col === exit.position.col
        )
      }
      const targetRow = condition.params.targetRow as number
      const targetCol = condition.params.targetCol as number
      return segments.some(
        (seg) => seg.to.row === targetRow && seg.to.col === targetCol
      )
    }
    case 'block_on_target': {
      const blockId = condition.params.blockId as string
      const targetId = condition.params.targetId as string
      const block = components.find((c) => c.id === blockId)
      const target = components.find((c) => c.id === targetId)
      if (!block || !target) return false
      return block.position.row === target.position.row && block.position.col === target.position.col
    }
    case 'circuit_complete': {
      const sourceId = condition.params.sourceId as string
      const targetId = condition.params.targetId as string
      return checkCircuitConnection(components, sourceId, targetId)
    }
    case 'color_match': {
      const gateId = condition.params.gateId as string
      const gate = components.find((c) => c.id === gateId)
      if (!gate) return false
      const props = gate.properties as ColorGateProperties
      return props.currentOrder.join(',') === props.targetOrder.join(',')
    }
    default:
      return false
  }
}

function checkCircuitConnection(
  components: LevelComponent[],
  sourceId: string,
  targetId: string
): boolean {
  const circuits = components.filter((c) => c.type === 'circuit')
  const source = circuits.find((c) => c.id === sourceId)
  const target = circuits.find((c) => c.id === targetId)
  if (!source || !target) return false

  const visited = new Set<string>()
  const queue: string[] = [sourceId]
  visited.add(sourceId)

  const directions = [
    { dr: -1, dc: 0, fromIdx: 0, toIdx: 2 },
    { dr: 0, dc: 1, fromIdx: 1, toIdx: 3 },
    { dr: 1, dc: 0, fromIdx: 2, toIdx: 0 },
    { dr: 0, dc: -1, fromIdx: 3, toIdx: 1 },
  ]

  while (queue.length > 0) {
    const currentId = queue.shift()!
    if (currentId === targetId) return true

    const current = circuits.find((c) => c.id === currentId)
    if (!current) continue

    const currentProps = current.properties as CircuitProperties

    for (const dir of directions) {
      if (!currentProps.connections[dir.fromIdx]) continue

      const neighborRow = current.position.row + dir.dr
      const neighborCol = current.position.col + dir.dc

      const neighbor = circuits.find(
        (c) => c.position.row === neighborRow && c.position.col === neighborCol
      )
      if (!neighbor || visited.has(neighbor.id)) continue

      const neighborProps = neighbor.properties as CircuitProperties
      if (!neighborProps.connections[dir.toIdx]) continue

      visited.add(neighbor.id)
      queue.push(neighbor.id)
    }
  }

  return false
}

export function rotateCircuitConnections(connections: CircuitProperties['connections']): CircuitProperties['connections'] {
  return [connections[3], connections[0], connections[1], connections[2]] as CircuitProperties['connections']
}

export function cycleColorOrder(currentOrder: number[], colorCount: number): number[] {
  const newOrder = [...currentOrder]
  const first = newOrder.shift()!
  newOrder.push(first)
  return newOrder
}

export function getLightBeamTarget(
  components: LevelComponent[],
  gridWidth: number,
  gridHeight: number
): { row: number; col: number } | null {
  const segments = traceLightBeam(components, gridWidth, gridHeight)
  if (segments.length === 0) return null
  return segments[segments.length - 1].to
}

export function updateExitsAndCircuits(
  components: LevelComponent[],
  isWin: boolean
): LevelComponent[] {
  return components.map((c) => {
    if (c.type === 'exit') {
      return { ...c, properties: { ...c.properties, isOpen: isWin } }
    }
    return c
  })
}
