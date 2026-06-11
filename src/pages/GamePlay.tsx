import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Undo2, Redo2, RotateCcw, Lightbulb, X,
  Trophy, Clock, Footprints, Star, Home, ChevronRight, Flame, Wrench
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLevelStore } from '@/store/levelStore'
import { useProgressStore } from '@/store/progressStore'
import { useHintStore } from '@/store/hintStore'
import { decodeLevel } from '@/utils/share'
import {
  traceLightBeam, checkWinConditions,
  rotateCircuitConnections, cycleColorOrder
} from '@/utils/gameEngine'
import type {
  Level, LevelComponent, MirrorProperties, CircuitProperties,
  ColorGateProperties, BlockProperties, LightSourceProperties,
  ExitProperties, LightDirection
} from '@/types'

function deepCloneComponents(comps: LevelComponent[]): LevelComponent[] {
  return comps.map((c) => ({
    ...c,
    position: { ...c.position },
    properties: { ...c.properties },
  }))
}

interface HistoryEntry {
  components: LevelComponent[]
  steps: number
}

const COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22']

function getRatingColor(rating: string) {
  switch (rating) {
    case 'S': return 'text-emerald'
    case 'A': return 'text-copper'
    case 'B': return 'text-iron-light'
    case 'C': return 'text-iron'
    default: return 'text-iron'
  }
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export default function GamePlay() {
  const { id, code } = useParams<{ id?: string; code?: string }>()
  const navigate = useNavigate()

  const { getLevelById, isUnlocked, unlockLevel, addCustomLevel, levels } = useLevelStore()
  const { completeLevel, getRecord, progress } = useProgressStore()
  const { getUsedCount, useHint: useHintFn, resetLevelHints, getRevealedCount } = useHintStore()

  const [level, setLevel] = useState<Level | null>(null)
  const [components, setComponents] = useState<LevelComponent[]>([])
  const [steps, setSteps] = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isCompleted, setIsCompleted] = useState(false)
  const [showHints, setShowHints] = useState(false)
  const [revealedHints, setRevealedHints] = useState(0)
  const [showWinModal, setShowWinModal] = useState(false)
  const [winRating, setWinRating] = useState<'S' | 'A' | 'B' | 'C' | null>(null)
  const [isPlaytestMode, setIsPlaytestMode] = useState(false)

  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  useEffect(() => {
    let loadedLevel: Level | null = null
    let playtest = false

    if (code) {
      loadedLevel = decodeLevel(code)
      if (loadedLevel) {
        loadedLevel.id = `custom-${code}`
        loadedLevel.isDefault = false
      }
    } else if (id) {
      if (id.startsWith('custom_playtest_')) {
        playtest = true
        const customLevels = useLevelStore.getState().customLevels
        loadedLevel = customLevels.find((l) => l.id === id) ?? null
        if (loadedLevel) {
          loadedLevel.isDefault = false
        }
      } else if (id.startsWith('custom_')) {
        const customLevels = useLevelStore.getState().customLevels
        loadedLevel = customLevels.find((l) => l.id === id) ?? null
        if (loadedLevel) {
          loadedLevel.isDefault = false
        }
      } else {
        loadedLevel = getLevelById(id) ?? null
      }
    }

    if (!loadedLevel) {
      navigate('/')
      return
    }

    setIsPlaytestMode(playtest)
    setLevel(loadedLevel)
    setComponents(deepCloneComponents(loadedLevel.components))
    setSteps(0)
    setElapsedSeconds(0)
    setIsCompleted(false)
    setShowWinModal(false)
    setWinRating(null)
    setHistory([])
    setHistoryIndex(-1)
    setRevealedHints(getRevealedCount(loadedLevel.id))
  }, [id, code, getLevelById, navigate, getRevealedCount])

  useEffect(() => {
    if (!level || isCompleted) return
    const timer = setInterval(() => {
      setElapsedSeconds((s) => s + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [level, isCompleted])

  const pushToHistory = useCallback((newComponents: LevelComponent[], newSteps: number) => {
    const newEntry: HistoryEntry = {
      components: deepCloneComponents(newComponents),
      steps: newSteps,
    }
    setHistory((prev) => {
      const trimmed = prev.slice(0, historyIndex + 1)
      return [...trimmed, newEntry]
    })
    setHistoryIndex((prev) => prev + 1)
  }, [historyIndex])

  const applyMove = useCallback((updatedComponents: LevelComponent[]) => {
    if (!level || isCompleted) return
    const newSteps = steps + 1
    setComponents(updatedComponents)
    setSteps(newSteps)
    pushToHistory(updatedComponents, newSteps)

    const won = checkWinConditions(updatedComponents, level.winConditions, level.gridWidth, level.gridHeight)
    if (won) {
      setIsCompleted(true)
      setShowWinModal(true)
      const isDefault = !!level.isDefault
      const rating = completeLevel(level.id, newSteps, elapsedSeconds * 1000, level.minSteps || 1, isDefault)
      setWinRating(rating)

      if (isDefault) {
        const levelIndex = useLevelStore.getState().levels.findIndex((l) => l.id === level.id)
        if (levelIndex >= 0 && levelIndex + 1 < useLevelStore.getState().levels.length) {
          const nextLevel = useLevelStore.getState().levels[levelIndex + 1]
          unlockLevel(nextLevel.id)
        }
      }
    }
  }, [level, steps, isCompleted, pushToHistory, completeLevel, unlockLevel, elapsedSeconds])

  const handleUndo = useCallback(() => {
    if (historyIndex < 0 || isCompleted) return
    const entry = history[historyIndex]
    if (!entry) return

    if (historyIndex === 0) {
      setComponents(deepCloneComponents(level!.components))
      setSteps(0)
    } else {
      const prevEntry = history[historyIndex - 1]
      setComponents(deepCloneComponents(prevEntry.components))
      setSteps(prevEntry.steps)
    }

    setHistoryIndex((prev) => prev - 1)
  }, [historyIndex, history, isCompleted, level])

  const handleRedo = useCallback(() => {
    if (historyIndex >= history.length - 1 || isCompleted) return
    const nextIndex = historyIndex + 1
    const entry = history[nextIndex]
    if (!entry) return

    setComponents(deepCloneComponents(entry.components))
    setSteps(entry.steps)
    setHistoryIndex(nextIndex)
  }, [historyIndex, history, isCompleted])

  const handleReset = useCallback(() => {
    if (!level) return
    setComponents(deepCloneComponents(level.components))
    setSteps(0)
    setElapsedSeconds(0)
    setHistory([])
    setHistoryIndex(-1)
    setIsCompleted(false)
    setShowWinModal(false)
    setWinRating(null)
    if (level.isDefault) {
      resetLevelHints(level.id)
      setRevealedHints(0)
    }
  }, [level, resetLevelHints])

  const handleUseHint = useCallback(() => {
    if (!level) return
    if (revealedHints >= level.hints.length) return

    const newCount = useHintFn(level.id)
    setRevealedHints(newCount)
  }, [level, revealedHints, useHintFn])

  const rotateMirror = useCallback((componentId: string) => {
    if (isCompleted) return
    const comp = components.find((c) => c.id === componentId)
    if (!comp || comp.type !== 'mirror') return
    const props = comp.properties as MirrorProperties
    if (props.isFixed) return

    const newComponents = deepCloneComponents(components)
    const target = newComponents.find((c) => c.id === componentId)!
    const targetProps = target.properties as MirrorProperties
    targetProps.direction = ((targetProps.direction + 45) % 180) as MirrorProperties['direction']

    applyMove(newComponents)
  }, [components, applyMove, isCompleted])

  const rotateCircuit = useCallback((componentId: string) => {
    if (isCompleted) return
    const comp = components.find((c) => c.id === componentId)
    if (!comp || comp.type !== 'circuit') return
    const props = comp.properties as CircuitProperties
    if (props.isFixed) return

    const newComponents = deepCloneComponents(components)
    const target = newComponents.find((c) => c.id === componentId)!
    const targetProps = target.properties as CircuitProperties
    targetProps.connections = rotateCircuitConnections(targetProps.connections)

    applyMove(newComponents)
  }, [components, applyMove, isCompleted])

  const cycleColorGate = useCallback((componentId: string) => {
    if (isCompleted) return
    const comp = components.find((c) => c.id === componentId)
    if (!comp || comp.type !== 'color_gate') return
    const props = comp.properties as ColorGateProperties
    if (props.isFixed) return

    const newComponents = deepCloneComponents(components)
    const target = newComponents.find((c) => c.id === componentId)!
    const targetProps = target.properties as ColorGateProperties
    targetProps.currentOrder = cycleColorOrder(targetProps.currentOrder, targetProps.colorCount)

    applyMove(newComponents)
  }, [components, applyMove, isCompleted])

  const pushBlock = useCallback((fromRow: number, fromCol: number, direction: 'up' | 'down' | 'left' | 'right') => {
    if (isCompleted || !level) return
    const block = components.find(
      (c) => c.type === 'block' && c.position.row === fromRow && c.position.col === fromCol
    )
    if (!block) return
    const blockProps = block.properties as BlockProperties
    if (blockProps.isFixed) return

    const dr = direction === 'up' ? -1 : direction === 'down' ? 1 : 0
    const dc = direction === 'left' ? -1 : direction === 'right' ? 1 : 0
    const newRow = fromRow + dr
    const newCol = fromCol + dc

    if (newRow < 0 || newRow >= level.gridHeight || newCol < 0 || newCol >= level.gridWidth) return

    const occupied = components.find(
      (c) => c.position.row === newRow && c.position.col === newCol && c.type !== 'target'
    )
    if (occupied) return

    const newComponents = deepCloneComponents(components)
    const target = newComponents.find((c) => c.id === block.id)!
    target.position = { row: newRow, col: newCol }

    applyMove(newComponents)
  }, [components, applyMove, isCompleted, level])

  const handleCellClick = useCallback((row: number, col: number) => {
    if (!level || isCompleted) return
    const comp = components.find((c) => c.position.row === row && c.position.col === col)

    if (comp && comp.type !== 'target' && comp.type !== 'light_source' && comp.type !== 'exit') {
      if (comp.type === 'mirror') {
        rotateMirror(comp.id)
      } else if (comp.type === 'circuit') {
        rotateCircuit(comp.id)
      } else if (comp.type === 'color_gate') {
        cycleColorGate(comp.id)
      }
    } else {
      const adjacentBlocks: { id: string; dir: 'up' | 'down' | 'left' | 'right' }[] = []

      const upBlock = components.find(
        (c) => c.type === 'block' && c.position.row === row - 1 && c.position.col === col
      )
      if (upBlock) adjacentBlocks.push({ id: upBlock.id, dir: 'down' })

      const downBlock = components.find(
        (c) => c.type === 'block' && c.position.row === row + 1 && c.position.col === col
      )
      if (downBlock) adjacentBlocks.push({ id: downBlock.id, dir: 'up' })

      const leftBlock = components.find(
        (c) => c.type === 'block' && c.position.row === row && c.position.col === col - 1
      )
      if (leftBlock) adjacentBlocks.push({ id: leftBlock.id, dir: 'right' })

      const rightBlock = components.find(
        (c) => c.type === 'block' && c.position.row === row && c.position.col === col + 1
      )
      if (rightBlock) adjacentBlocks.push({ id: rightBlock.id, dir: 'left' })

      if (adjacentBlocks.length >= 1) {
        const block = components.find((c) => c.id === adjacentBlocks[0].id)!
        pushBlock(block.position.row, block.position.col, adjacentBlocks[0].dir)
      }
    }
  }, [components, level, rotateMirror, rotateCircuit, cycleColorGate, pushBlock, isCompleted])

  const lightSegments = useMemo(() => {
    if (!level) return []
    return traceLightBeam(components, level.gridWidth, level.gridHeight)
  }, [components, level])

  const cellSize = level ? Math.min(64, 480 / Math.max(level.gridWidth, level.gridHeight)) : 60

  if (!level) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center text-iron-light">
        加载中...
      </div>
    )
  }

  const remainingHints = level.hintCount - getUsedCount(level.id)

  return (
    <div className="min-h-screen bg-base font-body text-[#e0dcd0] flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-iron/20 bg-base-dark/60 backdrop-blur-sm">
        <button
          onClick={() => {
            if (isPlaytestMode) {
              navigate('/editor')
            } else {
              navigate('/')
            }
          }}
          className="btn-ghost flex items-center gap-1.5 text-sm py-1.5 px-3"
        >
          <ArrowLeft className="w-4 h-4" />
          {isPlaytestMode ? '返回编辑器' : '返回'}
        </button>
        <div className="flex flex-col items-center">
          <h1 className="font-display text-lg text-copper text-glow-copper">{level.name}</h1>
          <div className="flex items-center gap-3 text-xs text-iron-light">
            <span className="flex items-center gap-1">
              <Footprints className="w-3 h-3" />
              {steps} 步
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTime(elapsedSeconds)}
            </span>
            {isPlaytestMode && (
              <span className="px-2 py-0.5 rounded bg-copper/20 text-copper text-[10px] border border-copper/30">
                测试游玩
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowHints(true)}
          className="btn-ghost flex items-center gap-1.5 text-sm py-1.5 px-3"
        >
          <Lightbulb className="w-4 h-4 text-amber" />
          <span className="hidden sm:inline">提示</span>
          <span className="text-xs text-amber">({Math.max(0, remainingHints)})</span>
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 overflow-auto">
        <div className="relative">
          <div
            className="grid gap-0.5 bg-base-dark/30 p-2 rounded-xl border border-iron/30"
            style={{
              gridTemplateColumns: `repeat(${level.gridWidth}, ${cellSize}px)`,
              gridTemplateRows: `repeat(${level.gridHeight}, ${cellSize}px)`,
            }}
          >
            {Array.from({ length: level.gridHeight * level.gridWidth }).map((_, i) => {
              const row = Math.floor(i / level.gridWidth)
              const col = i % level.gridWidth
              const comp = components.find(
                (c) => c.position.row === row && c.position.col === col
              )
              return (
                <div
                  key={i}
                  className={cn(
                    'relative flex items-center justify-center rounded-sm cursor-pointer transition-colors z-10',
                    'border border-iron/20 bg-base-dark/30 hover:bg-base-light/30'
                  )}
                  style={{ width: cellSize, height: cellSize }}
                  onClick={() => handleCellClick(row, col)}
                >
                  {comp && (
                    <div className="absolute inset-0 pointer-events-none">
                      <GameComponent
                        component={comp}
                        cellSize={cellSize}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <svg
            className="absolute top-2 left-2 pointer-events-none"
            width={level.gridWidth * cellSize + (level.gridWidth - 1) * 2}
            height={level.gridHeight * cellSize + (level.gridHeight - 1) * 2}
            style={{ overflow: 'visible' }}
          >
            {lightSegments.map((seg, idx) => {
              const x1 = seg.from.col * (cellSize + 2) + cellSize / 2
              const y1 = seg.from.row * (cellSize + 2) + cellSize / 2
              const x2 = seg.to.col * (cellSize + 2) + cellSize / 2
              const y2 = seg.to.row * (cellSize + 2) + cellSize / 2
              return (
                <line
                  key={idx}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={seg.color}
                  strokeWidth="3"
                  opacity="0.8"
                  strokeLinecap="round"
                >
                  <animate
                    attributeName="opacity"
                    values="0.6;1;0.6"
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                </line>
              )
            })}
          </svg>
        </div>

        <p className="text-xs text-iron-light/40 mt-4">
          点击镜子/电路/颜色门进行操作 · 点击方块旁空格推动方块
        </p>
      </main>

      <footer className="border-t border-iron/20 bg-base-dark/60 backdrop-blur-sm px-4 py-3">
        <div className="flex items-center justify-center gap-4">
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={handleUndo}
            disabled={historyIndex < 0}
            className="w-12 h-12 rounded-full bg-base-light border border-iron/40 flex items-center justify-center
              text-iron-light hover:border-copper hover:text-copper transition-colors
              disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-iron/40 disabled:hover:text-iron-light"
          >
            <Undo2 className="w-5 h-5" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="w-12 h-12 rounded-full bg-base-light border border-iron/40 flex items-center justify-center
              text-iron-light hover:border-copper hover:text-copper transition-colors
              disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-iron/40 disabled:hover:text-iron-light"
          >
            <Redo2 className="w-5 h-5" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={handleReset}
            className="w-12 h-12 rounded-full bg-base-light border border-iron/40 flex items-center justify-center
              text-iron-light hover:border-ruby hover:text-ruby transition-colors"
          >
            <RotateCcw className="w-5 h-5" />
          </motion.button>
        </div>
      </footer>

      <AnimatePresence>
        {showHints && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 h-full w-80 max-w-[90vw] bg-base-dark border-l border-iron/30
              shadow-2xl z-50 flex flex-col"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-iron/30">
              <h2 className="font-display text-copper text-glow-copper flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber" />
                提示
              </h2>
              <button
                onClick={() => setShowHints(false)}
                className="text-iron-light/50 hover:text-iron-light"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {level.hints.length === 0 && (
                <p className="text-iron-light/50 text-sm text-center py-8">本关没有提示</p>
              )}

              {level.hints.map((hint, i) => (
                <motion.div
                  key={i}
                  initial={i < revealedHints ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                  animate={i < revealedHints ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                  transition={{ delay: i * 0.1 }}
                  className={cn(
                    'p-3 rounded-lg border text-sm',
                    i < revealedHints
                      ? 'bg-amber/10 border-amber/30 text-amber-light'
                      : 'bg-iron/10 border-iron/20 text-iron/50'
                  )}
                >
                  <div className="font-medium mb-1 text-xs text-iron-light/60">
                    提示 {i + 1}
                  </div>
                  {i < revealedHints ? (
                    <p className="text-[#e0dcd0]">{hint}</p>
                  ) : (
                    <p className="italic">未解锁</p>
                  )}
                </motion.div>
              ))}
            </div>

            <div className="p-4 border-t border-iron/30">
              <button
                onClick={handleUseHint}
                disabled={revealedHints >= level.hints.length || remainingHints <= 0}
                className="w-full btn-copper flex items-center justify-center gap-2"
              >
                <Lightbulb className="w-4 h-4" />
                {revealedHints >= level.hints.length
                  ? '所有提示已解锁'
                  : remainingHints <= 0
                    ? '提示次数已用完'
                    : `使用提示 (剩 ${Math.max(0, remainingHints)} 次)`}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showWinModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', damping: 25 }}
              className="panel-dark p-8 w-[420px] max-w-[90vw] text-center"
            >
              <div className="mb-4">
                <Trophy className={cn('w-16 h-16 mx-auto mb-2', getRatingColor(winRating ?? 'C'))} />
                <h2 className="font-display text-2xl font-bold text-copper text-glow-copper">
                  通关成功！
                </h2>
              </div>

              {winRating && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                  className="mb-6"
                >
                  <span
                    className={cn(
                      'inline-flex items-center justify-center w-20 h-20 rounded-full text-4xl font-display font-bold',
                      winRating === 'S' && 'bg-emerald/20 text-emerald glow-emerald',
                      winRating === 'A' && 'bg-copper/20 text-copper glow-copper',
                      winRating === 'B' && 'bg-iron/30 text-iron-light',
                      winRating === 'C' && 'bg-iron/20 text-iron',
                    )}
                  >
                    {winRating}
                  </span>
                </motion.div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-base-dark/60 rounded-lg p-3">
                  <Footprints className="w-5 h-5 text-sapphire mx-auto mb-1" />
                  <div className="text-2xl font-display font-bold text-copper-light">{steps}</div>
                  <div className="text-xs text-iron-light/60">步数</div>
                </div>
                <div className="bg-base-dark/60 rounded-lg p-3">
                  <Clock className="w-5 h-5 text-emerald mx-auto mb-1" />
                  <div className="text-2xl font-display font-bold text-copper-light">
                    {formatTime(elapsedSeconds)}
                  </div>
                  <div className="text-xs text-iron-light/60">用时</div>
                </div>
              </div>

              {level.isDefault && progress.streakDays > 0 && (
                <div className="mb-4 p-2.5 rounded-lg bg-amber/10 border border-amber/25 text-amber text-xs font-medium flex items-center justify-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 fill-amber" />
                  已连续解谜 <span className="font-bold">{progress.streakDays}</span> 天
                </div>
              )}

              {!level.isDefault && (
                <div className="mb-4 p-2.5 rounded-lg bg-copper/10 border border-copper/25 text-copper text-xs font-medium flex items-center justify-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5" />
                  自定义关卡 · 记录最佳成绩，不影响默认进度
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleReset}
                  className="flex-1 btn-ghost flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  再玩一次
                </button>
                <button
                  onClick={() => {
                    if (isPlaytestMode) {
                      navigate('/editor')
                    } else {
                      navigate('/')
                    }
                  }}
                  className="flex-1 btn-copper flex items-center justify-center gap-2"
                >
                  {isPlaytestMode ? <ArrowLeft className="w-4 h-4" /> : <Home className="w-4 h-4" />}
                  {isPlaytestMode ? '返回编辑器' : '返回大厅'}
                </button>
              </div>

              {level.isDefault && !isPlaytestMode && (() => {
                const levelIndex = levels.findIndex((l) => l.id === level.id)
                const hasNext = levelIndex >= 0 && levelIndex + 1 < levels.length
                if (!hasNext) return null
                const next = levels[levelIndex + 1]
                return (
                  <button
                    onClick={() => navigate(`/play/${next.id}`)}
                    className="w-full mt-3 btn-primary flex items-center justify-center gap-2 text-sm"
                  >
                    <ChevronRight className="w-4 h-4" />
                    下一关 · {next.name}
                  </button>
                )
              })()}

              {!level.isDefault && !isPlaytestMode && (
                <button
                  onClick={() => navigate('/editor')}
                  className="w-full mt-3 btn-ghost flex items-center justify-center gap-2 text-sm"
                >
                  <Wrench className="w-4 h-4" />
                  打开编辑器
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function GameComponent({
  component,
  cellSize,
}: {
  component: LevelComponent
  cellSize: number
}) {
  const { type, properties } = component
  const size = cellSize * 0.7

  if (type === 'mirror') {
    const p = properties as MirrorProperties
    const angle = p.direction
    return (
      <div
        className="absolute inset-0 flex items-center justify-center"
      >
        <div
          className="bg-amber rounded-sm"
          style={{
            width: size * 0.9,
            height: 4,
            transform: `rotate(${angle}deg)`,
            boxShadow: '0 0 8px rgba(230, 126, 34, 0.6)',
            transition: 'transform 0.2s ease-out',
          }}
        />
      </div>
    )
  }

  if (type === 'block') {
    const p = properties as BlockProperties
    return (
      <div
        className={cn(
          'absolute rounded-md flex items-center justify-center',
          p.isFixed ? 'bg-iron' : 'bg-sapphire'
        )}
        style={{
          width: size,
          height: size,
          boxShadow: p.isFixed ? 'none' : '0 2px 8px rgba(52, 152, 219, 0.3)',
          transition: 'background-color 0.15s',
        }}
      >
        {!p.isFixed && (
          <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
        )}
      </div>
    )
  }

  if (type === 'circuit') {
    const p = properties as CircuitProperties
    const color = p.isPowered || p.isSource ? '#2ecc71' : '#4a4a5a'
    const glow = p.isPowered || p.isSource ? '0 0 10px rgba(46, 204, 113, 0.6)' : 'none'
    return (
      <div
        className="absolute inset-0 flex items-center justify-center"
      >
        <svg width={size} height={size} viewBox="0 0 100 100">
          {p.connections[0] && (
            <line x1="50" y1="0" x2="50" y2="35" stroke={color} strokeWidth="6" strokeLinecap="round" />
          )}
          {p.connections[1] && (
            <line x1="65" y1="50" x2="100" y2="50" stroke={color} strokeWidth="6" strokeLinecap="round" />
          )}
          {p.connections[2] && (
            <line x1="50" y1="65" x2="50" y2="100" stroke={color} strokeWidth="6" strokeLinecap="round" />
          )}
          {p.connections[3] && (
            <line x1="0" y1="50" x2="35" y2="50" stroke={color} strokeWidth="6" strokeLinecap="round" />
          )}
          <circle
            cx="50"
            cy="50"
            r="20"
            fill={color}
            style={{ filter: `drop-shadow(${glow})` }}
          />
          {p.isSource && (
            <circle cx="50" cy="50" r="10" fill="#fff" opacity="0.4" />
          )}
          {p.isTarget && (
            <circle cx="50" cy="50" r="10" fill="none" stroke="#fff" strokeWidth="3" opacity="0.5" />
          )}
        </svg>
      </div>
    )
  }

  if (type === 'color_gate') {
    const p = properties as ColorGateProperties
    const dotSize = size / (p.colorCount + 1)
    return (
      <div
        className="absolute inset-0 flex items-center justify-center gap-1 flex-wrap"
        style={{ padding: '4px' }}
      >
        {p.currentOrder.map((colorIdx, i) => (
          <div
            key={i}
            className="rounded-full"
            style={{
              width: dotSize,
              height: dotSize,
              backgroundColor: COLORS[(colorIdx - 1) % COLORS.length],
              boxShadow: `0 0 4px ${COLORS[(colorIdx - 1) % COLORS.length]}`,
            }}
          />
        ))}
        <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 text-[8px] text-iron-light/60 whitespace-nowrap">
          目标: {p.targetOrder.join('')}
        </div>
      </div>
    )
  }

  if (type === 'light_source') {
    const p = properties as LightSourceProperties
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="rounded-full"
          style={{
            width: size * 0.6,
            height: size * 0.6,
            backgroundColor: p.color,
            boxShadow: `0 0 12px ${p.color}, 0 0 20px ${p.color}50`,
          }}
        />
        <div
          className="absolute"
          style={{
            width: 0,
            height: 0,
            borderTop: `${size * 0.2}px solid transparent`,
            borderBottom: `${size * 0.2}px solid transparent`,
            borderLeft: `${size * 0.35}px solid ${p.color}`,
            transform: `rotate(${p.direction}deg)`,
            transformOrigin: 'center',
            right: '25%',
          }}
        />
      </div>
    )
  }

  if (type === 'target') {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="border-2 border-dashed border-emerald/60 rounded-full animate-pulse"
          style={{ width: size * 0.7, height: size * 0.7 }}
        />
        <div
          className="absolute w-2 h-2 rounded-full bg-emerald"
          style={{ boxShadow: '0 0 8px rgba(46, 204, 113, 0.8)' }}
        />
      </div>
    )
  }

  if (type === 'wall') {
    return (
      <div className="absolute inset-0.5 rounded-sm bg-iron-dark border border-iron" />
    )
  }

  if (type === 'exit') {
    const p = properties as ExitProperties
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className={cn(
            'rounded-md flex items-center justify-center border-2 transition-all duration-500',
            p.isOpen
              ? 'bg-emerald/30 border-emerald glow-emerald'
              : 'bg-copper/20 border-copper/50'
          )}
          style={{ width: size * 0.8, height: size * 0.9 }}
        >
          {p.isOpen ? (
            <Star className="w-5 h-5 text-emerald fill-emerald" />
          ) : (
            <div className="w-1.5 h-4 bg-copper/80 rounded-full" />
          )}
        </div>
      </div>
    )
  }

  return null
}
