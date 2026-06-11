import type { LevelComponent, WinCondition, CircuitProperties, ColorGateProperties, MirrorProperties, LightSourceProperties } from '@/types'

interface LightSegment {
  from: { row: number; col: number }
  to: { row: number; col: number }
}

export function traceLightBeam(
  components: LevelComponent[],
  gridWidth: number,
  gridHeight: number
): LightSegment[] {
  const sources = components.filter((c) => c.type === 'light_source')
  const segments: LightSegment[] = []

  for (const source of sources) {
    const props = source.properties as LightSourceProperties
    let row = source.position.row
    let col = source.position.col
    let dir = props.direction

    const dr = dir === 90 ? -1 : dir === 270 ? 1 : 0
    const dc = dir === 0 ? 1 : dir === 180 ? -1 : 0

    row += dr
    col += dc

    const startRow = source.position.row
    const startCol = source.position.col

    let lastRow = startRow
    let lastCol = startCol

    const visited = new Set<string>()

    while (row >= 0 && row < gridHeight && col >= 0 && col < gridWidth) {
      const key = `${row},${col}`
      if (visited.has(key)) break
      visited.add(key)

      const cellComponent = components.find(
        (c) => c.position.row === row && c.position.col === col
      )

      if (!cellComponent) {
        lastRow = row
        lastCol = col
        row += dr
        col += dc
        continue
      }

      if (cellComponent.type === 'wall') {
        segments.push({ from: { row: startRow, col: startCol }, to: { row: lastRow, col: lastCol } })
        break
      }

      if (cellComponent.type === 'mirror') {
        const mirrorProps = cellComponent.properties as MirrorProperties
        segments.push({ from: { row: startRow, col: startCol }, to: { row, col } })

        const newDir = reflectDirection(dir, mirrorProps.direction)
        if (newDir === null) {
          break
        }

        const newDr = newDir === 90 ? -1 : newDir === 270 ? 1 : 0
        const newDc = newDir === 0 ? 1 : newDir === 180 ? -1 : 0

        lastRow = row
        lastCol = col
        row = row + newDr
        col = col + newDc
        dir = newDir
        break
      }

      if (cellComponent.type === 'exit') {
        segments.push({ from: { row: startRow, col: startCol }, to: { row, col } })
        break
      }

      lastRow = row
      lastCol = col
      row += dr
      col += dc
    }

    if (row < 0 || row >= gridHeight || col < 0 || col >= gridWidth) {
      segments.push({ from: { row: startRow, col: startCol }, to: { row: lastRow, col: lastCol } })
    }
  }

  return segments
}

function reflectDirection(lightDir: number, mirrorAngle: number): number | null {
  const mirrorType = mirrorAngle % 180
  if (mirrorType === 45) {
    switch (lightDir) {
      case 0: return 270
      case 90: return 180
      case 180: return 90
      case 270: return 0
      default: return null
    }
  } else if (mirrorType === 135) {
    switch (lightDir) {
      case 0: return 90
      case 90: return 0
      case 180: return 270
      case 270: return 180
      default: return null
    }
  } else if (mirrorType === 0) {
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
      const targetRow = condition.params.targetRow as number
      const targetCol = condition.params.targetCol as number
      const segments = traceLightBeam(components, gridWidth, gridHeight)
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

  return visited.has(targetId)
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
