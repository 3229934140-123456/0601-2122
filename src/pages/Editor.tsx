import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Play, Share2, Import, Trash2, Plus, Minus,
  ToggleLeft, ToggleRight, Grip, Box, CircuitBoard, Palette,
  Sun, Target, Square, DoorOpen, Copy, Check, X
} from 'lucide-react'
import { useEditorStore, getDefaultProperties } from '@/store/editorStore'
import { useLevelStore } from '@/store/levelStore'
import { encodeLevel, decodeLevel } from '@/utils/share'
import type {
  ComponentType, LevelComponent, WinCondition, WinConditionType,
  MirrorProperties, BlockProperties, CircuitProperties, ColorGateProperties,
  LightSourceProperties, ExitProperties
} from '@/types'

const COMPONENT_TYPES: { type: ComponentType; icon: typeof Grip; label: string }[] = [
  { type: 'mirror', icon: Grip, label: '反射镜' },
  { type: 'block', icon: Box, label: '方块' },
  { type: 'circuit', icon: CircuitBoard, label: '电路' },
  { type: 'color_gate', icon: Palette, label: '颜色门' },
  { type: 'light_source', icon: Sun, label: '光源' },
  { type: 'target', icon: Target, label: '目标' },
  { type: 'wall', icon: Square, label: '墙壁' },
  { type: 'exit', icon: DoorOpen, label: '出口' },
]

const MIRROR_DIRECTIONS: MirrorProperties['direction'][] = [0, 45, 90, 135]
const LIGHT_DIRECTIONS: LightSourceProperties['direction'][] = [0, 90, 180, 270]
const WIN_CONDITION_TYPES: { type: WinConditionType; label: string }[] = [
  { type: 'light_reach', label: '光线到达' },
  { type: 'block_on_target', label: '方块归位' },
  { type: 'circuit_complete', label: '电路连通' },
  { type: 'color_match', label: '颜色匹配' },
]

const COMPONENT_COLORS: Record<ComponentType, string> = {
  mirror: 'text-sapphire',
  block: 'text-amber',
  circuit: 'text-emerald',
  color_gate: 'text-copper',
  light_source: 'text-amber',
  target: 'text-emerald',
  wall: 'text-iron-light',
  exit: 'text-copper',
}

const COMPONENT_BG: Record<ComponentType, string> = {
  mirror: 'bg-sapphire/20',
  block: 'bg-amber/20',
  circuit: 'bg-emerald/20',
  color_gate: 'bg-copper/20',
  light_source: 'bg-amber/20',
  target: 'bg-emerald/20',
  wall: 'bg-iron-light/20',
  exit: 'bg-copper/20',
}

function ComponentIcon({ type, className }: { type: ComponentType; className?: string }) {
  const item = COMPONENT_TYPES.find((c) => c.type === type)
  if (!item) return null
  const Icon = item.icon
  return <Icon className={className} />
}

export default function Editor() {
  const navigate = useNavigate()
  const addCustomLevel = useLevelStore((s) => s.addCustomLevel)

  const {
    levelName, levelType, gridWidth, gridHeight,
    components, selectedComponentType, selectedComponentId,
    winConditions, hintCount, hints,
    setLevelName, setLevelType, setGridSize,
    setSelectedComponentType, setSelectedComponentId,
    addComponent, removeComponent, updateComponent,
    addWinCondition, removeWinCondition,
    setHintCount, setHints, clearEditor,
  } = useEditorStore()

  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [shareCode, setShareCode] = useState('')
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importCode, setImportCode] = useState('')
  const [importError, setImportError] = useState('')
  const [copied, setCopied] = useState(false)

  const selectedComponent = components.find((c) => c.id === selectedComponentId) ?? null

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      const existing = components.find((c) => c.position.row === row && c.position.col === col)
      if (existing) {
        setSelectedComponentId(existing.id)
        return
      }
      if (!selectedComponentType) return
      const newComponent: LevelComponent = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        type: selectedComponentType,
        position: { row, col },
        properties: getDefaultProperties(selectedComponentType),
      }
      addComponent(newComponent)
      setSelectedComponentId(newComponent.id)
    },
    [components, selectedComponentType, addComponent, setSelectedComponentId]
  )

  const handleCellRightClick = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.preventDefault()
      removeComponent(id)
    },
    [removeComponent]
  )

  const handleDeleteKey = useCallback(() => {
    if (selectedComponentId) {
      removeComponent(selectedComponentId)
    }
  }, [selectedComponentId, removeComponent])

  const handleTestPlay = useCallback(() => {
    const tempLevel = {
      id: `custom_${Date.now()}`,
      name: levelName || '未命名关卡',
      type: levelType,
      difficulty: 1,
      minSteps: 0,
      gridWidth,
      gridHeight,
      hintCount,
      hints,
      components: [...components],
      winConditions: [...winConditions],
      isDefault: false,
    }
    addCustomLevel(tempLevel)
    navigate(`/play/${tempLevel.id}`)
  }, [levelName, levelType, gridWidth, gridHeight, hintCount, hints, components, winConditions, addCustomLevel, navigate])

  const handleGenerateShareCode = useCallback(() => {
    const level = {
      id: `custom_${Date.now()}`,
      name: levelName || '未命名关卡',
      type: levelType,
      difficulty: 1,
      minSteps: 0,
      gridWidth,
      gridHeight,
      hintCount,
      hints,
      components: [...components],
      winConditions: [...winConditions],
      isDefault: false,
    }
    const code = encodeLevel(level)
    setShareCode(code)
    setShareModalOpen(true)
    setCopied(false)
  }, [levelName, levelType, gridWidth, gridHeight, hintCount, hints, components, winConditions])

  const handleImportShareCode = useCallback(() => {
    setImportCode('')
    setImportError('')
    setImportModalOpen(true)
  }, [])

  const handleImportConfirm = useCallback(() => {
    const level = decodeLevel(importCode)
    if (!level) {
      setImportError('无效的分享码，请检查后重试')
      return
    }
    setLevelName(level.name)
    setLevelType(level.type)
    setGridSize(level.gridWidth, level.gridHeight)
    setHintCount(level.hintCount)
    setHints(level.hints)
    for (const comp of level.components) {
      addComponent(comp)
    }
    for (const cond of level.winConditions) {
      addWinCondition(cond)
    }
    setImportModalOpen(false)
  }, [importCode, setLevelName, setLevelType, setGridSize, setHintCount, setHints, addComponent, addWinCondition])

  const handleCopyCode = useCallback(() => {
    navigator.clipboard.writeText(shareCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [shareCode])

  const updateComponentProp = useCallback(
    (id: string, propUpdates: Record<string, unknown>) => {
      const comp = components.find((c) => c.id === id)
      if (!comp) return
      updateComponent(id, { properties: { ...comp.properties, ...propUpdates } })
    },
    [components, updateComponent]
  )

  const renderPropertyEditor = () => {
    if (!selectedComponent) {
      return <p className="text-iron-light/60 text-sm text-center py-8">点击画布上的组件以编辑属性</p>
    }

    const { id, type, properties } = selectedComponent

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-iron/20">
          <ComponentIcon type={type} className={`w-5 h-5 ${COMPONENT_COLORS[type]}`} />
          <span className="font-display text-sm text-copper">
            {COMPONENT_TYPES.find((c) => c.type === type)?.label}
          </span>
          <span className="text-iron-light/40 text-xs ml-auto">
            ({selectedComponent.position.row}, {selectedComponent.position.col})
          </span>
        </div>

        {type === 'mirror' && (() => {
          const p = properties as MirrorProperties
          return (
            <>
              <label className="block">
                <span className="text-xs text-iron-light/70 mb-1 block">方向</span>
                <select
                  value={p.direction}
                  onChange={(e) => updateComponentProp(id, { direction: Number(e.target.value) as MirrorProperties['direction'] })}
                  className="w-full bg-base-dark border border-iron/30 rounded px-2 py-1.5 text-sm text-copper focus:outline-none focus:border-copper"
                >
                  {MIRROR_DIRECTIONS.map((d) => (
                    <option key={d} value={d}>{d}°</option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                {p.isFixed
                  ? <ToggleRight className="w-5 h-5 text-copper" onClick={() => updateComponentProp(id, { isFixed: false })} />
                  : <ToggleLeft className="w-5 h-5 text-iron-light/50" onClick={() => updateComponentProp(id, { isFixed: true })} />
                }
                <span className="text-sm text-iron-light/80">固定</span>
              </label>
            </>
          )
        })()}

        {type === 'block' && (() => {
          const p = properties as BlockProperties
          return (
            <label className="flex items-center gap-2 cursor-pointer">
              {p.isFixed
                ? <ToggleRight className="w-5 h-5 text-copper" onClick={() => updateComponentProp(id, { isFixed: false })} />
                : <ToggleLeft className="w-5 h-5 text-iron-light/50" onClick={() => updateComponentProp(id, { isFixed: true })} />
              }
              <span className="text-sm text-iron-light/80">固定</span>
            </label>
          )
        })()}

        {type === 'circuit' && (() => {
          const p = properties as CircuitProperties
          const dirLabels = ['上', '右', '下', '左']
          return (
            <>
              <div>
                <span className="text-xs text-iron-light/70 mb-2 block">连接方向</span>
                <div className="grid grid-cols-2 gap-1">
                  {dirLabels.map((label, i) => (
                    <label key={label} className="flex items-center gap-1.5 cursor-pointer text-sm">
                      {p.connections[i]
                        ? <ToggleRight className="w-4 h-4 text-emerald" onClick={() => {
                            const newConn = [...p.connections] as CircuitProperties['connections']
                            newConn[i] = !newConn[i]
                            updateComponentProp(id, { connections: newConn })
                          }} />
                        : <ToggleLeft className="w-4 h-4 text-iron-light/40" onClick={() => {
                            const newConn = [...p.connections] as CircuitProperties['connections']
                            newConn[i] = !newConn[i]
                            updateComponentProp(id, { connections: newConn })
                          }} />
                      }
                      <span className="text-iron-light/70">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                {p.isSource
                  ? <ToggleRight className="w-5 h-5 text-emerald" onClick={() => updateComponentProp(id, { isSource: false })} />
                  : <ToggleLeft className="w-5 h-5 text-iron-light/50" onClick={() => updateComponentProp(id, { isSource: true })} />
                }
                <span className="text-sm text-iron-light/80">电源</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                {p.isTarget
                  ? <ToggleRight className="w-5 h-5 text-amber" onClick={() => updateComponentProp(id, { isTarget: false })} />
                  : <ToggleLeft className="w-5 h-5 text-iron-light/50" onClick={() => updateComponentProp(id, { isTarget: true })} />
                }
                <span className="text-sm text-iron-light/80">目标</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                {p.isFixed
                  ? <ToggleRight className="w-5 h-5 text-copper" onClick={() => updateComponentProp(id, { isFixed: false })} />
                  : <ToggleLeft className="w-5 h-5 text-iron-light/50" onClick={() => updateComponentProp(id, { isFixed: true })} />
                }
                <span className="text-sm text-iron-light/80">固定</span>
              </label>
            </>
          )
        })()}

        {type === 'color_gate' && (() => {
          const p = properties as ColorGateProperties
          return (
            <>
              <label className="block">
                <span className="text-xs text-iron-light/70 mb-1 block">颜色数量</span>
                <input
                  type="number"
                  min={2}
                  max={6}
                  value={p.colorCount}
                  onChange={(e) => updateComponentProp(id, { colorCount: Math.max(2, Math.min(6, Number(e.target.value))) })}
                  className="w-full bg-base-dark border border-iron/30 rounded px-2 py-1.5 text-sm text-copper focus:outline-none focus:border-copper"
                />
              </label>
              <label className="block">
                <span className="text-xs text-iron-light/70 mb-1 block">当前顺序 (逗号分隔)</span>
                <input
                  type="text"
                  value={p.currentOrder.join(',')}
                  onChange={(e) => {
                    const order = e.target.value.split(',').map(Number).filter((n) => !isNaN(n))
                    if (order.length > 0) updateComponentProp(id, { currentOrder: order })
                  }}
                  className="w-full bg-base-dark border border-iron/30 rounded px-2 py-1.5 text-sm text-copper focus:outline-none focus:border-copper"
                />
              </label>
              <label className="block">
                <span className="text-xs text-iron-light/70 mb-1 block">目标顺序 (逗号分隔)</span>
                <input
                  type="text"
                  value={p.targetOrder.join(',')}
                  onChange={(e) => {
                    const order = e.target.value.split(',').map(Number).filter((n) => !isNaN(n))
                    if (order.length > 0) updateComponentProp(id, { targetOrder: order })
                  }}
                  className="w-full bg-base-dark border border-iron/30 rounded px-2 py-1.5 text-sm text-copper focus:outline-none focus:border-copper"
                />
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                {p.isFixed
                  ? <ToggleRight className="w-5 h-5 text-copper" onClick={() => updateComponentProp(id, { isFixed: false })} />
                  : <ToggleLeft className="w-5 h-5 text-iron-light/50" onClick={() => updateComponentProp(id, { isFixed: true })} />
                }
                <span className="text-sm text-iron-light/80">固定</span>
              </label>
            </>
          )
        })()}

        {type === 'light_source' && (() => {
          const p = properties as LightSourceProperties
          return (
            <>
              <label className="block">
                <span className="text-xs text-iron-light/70 mb-1 block">方向</span>
                <select
                  value={p.direction}
                  onChange={(e) => updateComponentProp(id, { direction: Number(e.target.value) as LightSourceProperties['direction'] })}
                  className="w-full bg-base-dark border border-iron/30 rounded px-2 py-1.5 text-sm text-copper focus:outline-none focus:border-copper"
                >
                  {LIGHT_DIRECTIONS.map((d) => (
                    <option key={d} value={d}>{d}°</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs text-iron-light/70 mb-1 block">颜色</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={p.color}
                    onChange={(e) => updateComponentProp(id, { color: e.target.value })}
                    className="w-8 h-8 rounded border border-iron/30 bg-transparent cursor-pointer"
                  />
                  <span className="text-sm text-iron-light/70 font-mono">{p.color}</span>
                </div>
              </label>
            </>
          )
        })()}

        {type === 'exit' && (() => {
          const p = properties as ExitProperties
          return (
            <label className="flex items-center gap-2 cursor-pointer">
              {p.isOpen
                ? <ToggleRight className="w-5 h-5 text-emerald" onClick={() => updateComponentProp(id, { isOpen: false })} />
                : <ToggleLeft className="w-5 h-5 text-iron-light/50" onClick={() => updateComponentProp(id, { isOpen: true })} />
              }
              <span className="text-sm text-iron-light/80">已开启</span>
            </label>
          )
        })()}

        {(type === 'target' || type === 'wall') && (
          <p className="text-xs text-iron-light/40 text-center py-2">此组件无可编辑属性</p>
        )}
      </div>
    )
  }

  return (
    <div
      className="h-screen flex flex-col bg-base font-body text-[#e0dcd0] overflow-hidden"
      onKeyDown={(e) => {
        if (e.key === 'Delete' || e.key === 'Backspace') {
          const tag = (e.target as HTMLElement).tagName
          if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
          handleDeleteKey()
        }
      }}
      tabIndex={0}
    >
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-iron/20 bg-base-dark/60 backdrop-blur-sm shrink-0">
        <button
          onClick={() => navigate('/')}
          className="btn-ghost flex items-center gap-1.5 text-sm py-1.5 px-3"
        >
          <ArrowLeft className="w-4 h-4" />
          返回大厅
        </button>
        <h1 className="font-display text-lg text-copper text-glow-copper tracking-wider">
          关卡编辑器
        </h1>
        <div className="w-24" />
      </header>

      {/* Main 3-column layout */}
      <div className="flex-1 flex min-h-0">

        {/* Left Panel - Component Palette */}
        <aside className="w-48 shrink-0 border-r border-iron/20 bg-base-dark/40 p-3 flex flex-col gap-3 overflow-y-auto">
          <h2 className="font-display text-xs text-copper/80 tracking-wider uppercase">组件面板</h2>
          {selectedComponentType && (
            <div className="text-xs text-iron-light/60">
              当前选择：<span className="text-copper">{COMPONENT_TYPES.find((c) => c.type === selectedComponentType)?.label}</span>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            {COMPONENT_TYPES.map(({ type, icon: Icon, label }) => (
              <motion.button
                key={type}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setSelectedComponentType(type)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors duration-150
                  ${selectedComponentType === type
                    ? 'bg-copper/15 border border-copper/60 text-copper glow-copper'
                    : 'bg-base-dark/60 border border-iron/20 text-iron-light/70 hover:border-iron/40 hover:text-iron-light'
                  }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </motion.button>
            ))}
          </div>
        </aside>

        {/* Center - Editor Canvas */}
        <main className="flex-1 flex flex-col items-center justify-center p-4 overflow-auto">
          {/* Grid size controls */}
          <div className="flex items-center gap-4 mb-4">
            <label className="flex items-center gap-1.5 text-sm text-iron-light/70">
              宽度
              <input
                type="number"
                min={4}
                max={10}
                value={gridWidth}
                onChange={(e) => {
                  const v = Math.max(4, Math.min(10, Number(e.target.value)))
                  setGridSize(v, gridHeight)
                }}
                className="w-14 bg-base-dark border border-iron/30 rounded px-2 py-1 text-sm text-copper text-center focus:outline-none focus:border-copper"
              />
            </label>
            <span className="text-iron-light/30">×</span>
            <label className="flex items-center gap-1.5 text-sm text-iron-light/70">
              高度
              <input
                type="number"
                min={4}
                max={10}
                value={gridHeight}
                onChange={(e) => {
                  const v = Math.max(4, Math.min(10, Number(e.target.value)))
                  setGridSize(gridWidth, v)
                }}
                className="w-14 bg-base-dark border border-iron/30 rounded px-2 py-1 text-sm text-copper text-center focus:outline-none focus:border-copper"
              />
            </label>
          </div>

          {/* Grid */}
          <div
            className="grid gap-0.5"
            style={{
              gridTemplateColumns: `repeat(${gridWidth}, minmax(0, 1fr))`,
              width: `min(calc(${gridWidth} * 4.5rem + ${gridWidth - 1} * 0.125rem), 100%)`,
              maxWidth: `${gridWidth * 4.5 + (gridWidth - 1) * 0.125}rem`,
            }}
          >
            {Array.from({ length: gridHeight }).map((_, row) =>
              Array.from({ length: gridWidth }).map((_, col) => {
                const comp = components.find((c) => c.position.row === row && c.position.col === col)
                const isSelected = comp?.id === selectedComponentId
                return (
                  <motion.div
                    key={`${row}-${col}`}
                    whileHover={{ scale: 1.05 }}
                    className={`aspect-square rounded-sm cursor-pointer flex items-center justify-center text-lg relative
                      ${isSelected
                        ? 'border-2 border-copper bg-copper/10 glow-copper'
                        : comp
                          ? 'border border-iron/30 bg-base-light/30'
                          : 'grid-cell'
                      }`}
                    onClick={() => handleCellClick(row, col)}
                    onContextMenu={(e) => {
                      if (comp) handleCellRightClick(e, comp.id)
                    }}
                  >
                    {comp && (
                      <div className={`${COMPONENT_BG[comp.type]} rounded p-1`}>
                        <ComponentIcon type={comp.type} className={`w-5 h-5 ${COMPONENT_COLORS[comp.type]}`} />
                      </div>
                    )}
                    {comp && comp.type === 'light_source' && (() => {
                      const p = comp.properties as LightSourceProperties
                      const rotationMap: Record<number, string> = { 0: 'rotate-0', 90: 'rotate-90', 180: 'rotate-180', 270: '-rotate-90' }
                      return (
                        <div
                          className={`absolute w-0.5 h-2 ${rotationMap[p.direction] ?? ''}`}
                          style={{ backgroundColor: p.color, bottom: '2px', left: '50%', transformOrigin: 'bottom center', marginLeft: '-1px' }}
                        />
                      )
                    })()}
                  </motion.div>
                )
              })
            )}
          </div>
          <p className="text-xs text-iron-light/40 mt-3">
            左键放置/选择 · 右键或 Delete 删除
          </p>
        </main>

        {/* Right Panel - Properties */}
        <aside className="w-64 shrink-0 border-l border-iron/20 bg-base-dark/40 p-3 flex flex-col gap-4 overflow-y-auto">
          <h2 className="font-display text-xs text-copper/80 tracking-wider uppercase">属性面板</h2>
          {renderPropertyEditor()}

          {/* Win Conditions */}
          <div className="border-t border-iron/20 pt-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-display text-xs text-copper/80 tracking-wider uppercase">胜利条件</h3>
              <button
                onClick={() => addWinCondition({ type: 'light_reach', params: {} })}
                className="text-emerald hover:text-emerald/80 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              {winConditions.map((cond, i) => (
                <div key={i} className="flex items-center gap-1.5 bg-base-dark/60 rounded px-2 py-1.5">
                  <select
                    value={cond.type}
                    onChange={(e) => {
                      const newConditions = [...winConditions]
                      newConditions[i] = { ...newConditions[i], type: e.target.value as WinConditionType }
                      useEditorStore.setState({ winConditions: newConditions })
                    }}
                    className="flex-1 bg-base-dark border border-iron/30 rounded px-1.5 py-0.5 text-xs text-copper focus:outline-none focus:border-copper"
                  >
                    {WIN_CONDITION_TYPES.map((wct) => (
                      <option key={wct.type} value={wct.type}>{wct.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => removeWinCondition(i)}
                    className="text-ruby/60 hover:text-ruby transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {winConditions.length === 0 && (
                <p className="text-xs text-iron-light/40 text-center">尚未添加胜利条件</p>
              )}
            </div>
          </div>

          {/* Hints */}
          <div className="border-t border-iron/20 pt-3">
            <h3 className="font-display text-xs text-copper/80 tracking-wider uppercase mb-2">提示</h3>
            <label className="flex items-center gap-2 mb-2">
              <span className="text-xs text-iron-light/70">提示数量</span>
              <input
                type="number"
                min={0}
                max={10}
                value={hintCount}
                onChange={(e) => setHintCount(Math.max(0, Math.min(10, Number(e.target.value))))}
                className="w-14 bg-base-dark border border-iron/30 rounded px-2 py-1 text-sm text-copper text-center focus:outline-none focus:border-copper"
              />
            </label>
            <div className="space-y-1.5">
              {hints.map((hint, i) => (
                <input
                  key={i}
                  type="text"
                  value={hint}
                  placeholder={`提示 ${i + 1}`}
                  onChange={(e) => {
                    const newHints = [...hints]
                    newHints[i] = e.target.value
                    setHints(newHints)
                  }}
                  className="w-full bg-base-dark border border-iron/30 rounded px-2 py-1.5 text-xs text-iron-light/80 placeholder-iron-light/30 focus:outline-none focus:border-copper"
                />
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* Bottom Bar */}
      <footer className="shrink-0 border-t border-iron/20 bg-base-dark/60 backdrop-blur-sm px-4 py-2.5 flex items-center gap-3 flex-wrap">
        <input
          type="text"
          value={levelName}
          onChange={(e) => setLevelName(e.target.value)}
          placeholder="关卡名称"
          className="bg-base-dark border border-iron/30 rounded px-3 py-1.5 text-sm text-copper placeholder-iron-light/30 focus:outline-none focus:border-copper w-40"
        />
        <select
          value={levelType}
          onChange={(e) => setLevelType(e.target.value as ComponentType)}
          className="bg-base-dark border border-iron/30 rounded px-2 py-1.5 text-sm text-copper focus:outline-none focus:border-copper"
        >
          <option value="mirror">反射镜</option>
          <option value="block">方块</option>
          <option value="circuit">电路</option>
          <option value="color_gate">颜色门</option>
        </select>
        <div className="flex-1" />
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={handleTestPlay}
          className="btn-copper flex items-center gap-1.5 text-sm py-1.5"
        >
          <Play className="w-4 h-4" />
          测试游玩
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={handleGenerateShareCode}
          className="btn-ghost flex items-center gap-1.5 text-sm py-1.5"
        >
          <Share2 className="w-4 h-4" />
          生成分享码
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={handleImportShareCode}
          className="btn-ghost flex items-center gap-1.5 text-sm py-1.5"
        >
          <Import className="w-4 h-4" />
          导入分享码
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={clearEditor}
          className="btn-ghost flex items-center gap-1.5 text-sm py-1.5 text-ruby/70 border-ruby/30 hover:border-ruby/60 hover:text-ruby"
        >
          <Trash2 className="w-4 h-4" />
          清空
        </motion.button>
      </footer>

      {/* Share Code Modal */}
      <AnimatePresence>
        {shareModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShareModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="panel-dark p-6 w-[480px] max-w-[90vw]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-copper text-glow-copper">分享码</h3>
                <button onClick={() => setShareModalOpen(false)} className="text-iron-light/50 hover:text-iron-light">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <textarea
                readOnly
                value={shareCode}
                className="w-full h-28 bg-base-dark border border-iron/30 rounded p-3 text-xs text-copper font-mono resize-none focus:outline-none"
              />
              <div className="flex justify-end mt-3">
                <button
                  onClick={handleCopyCode}
                  className="btn-copper flex items-center gap-1.5 text-sm py-1.5"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? '已复制' : '复制'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Import Modal */}
      <AnimatePresence>
        {importModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setImportModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="panel-dark p-6 w-[480px] max-w-[90vw]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-copper text-glow-copper">导入分享码</h3>
                <button onClick={() => setImportModalOpen(false)} className="text-iron-light/50 hover:text-iron-light">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <textarea
                value={importCode}
                onChange={(e) => { setImportCode(e.target.value); setImportError('') }}
                placeholder="在此粘贴分享码..."
                className="w-full h-28 bg-base-dark border border-iron/30 rounded p-3 text-xs text-copper font-mono resize-none focus:outline-none focus:border-copper placeholder-iron-light/30"
              />
              {importError && (
                <p className="text-ruby text-xs mt-2">{importError}</p>
              )}
              <div className="flex justify-end mt-3 gap-2">
                <button
                  onClick={() => setImportModalOpen(false)}
                  className="btn-ghost text-sm py-1.5"
                >
                  取消
                </button>
                <button
                  onClick={handleImportConfirm}
                  className="btn-copper text-sm py-1.5"
                >
                  导入
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
