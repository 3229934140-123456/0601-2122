import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Play, Share2, Import, Trash2, Plus, Minus,
  ToggleLeft, ToggleRight, Grip, Box, CircuitBoard, Palette,
  Sun, Target, Square, DoorOpen, Copy, Check, X,
  Save, FileText, Move, Edit3, Files, Clock
} from 'lucide-react'
import { useEditorStore, getDefaultProperties, Draft } from '@/store/editorStore'
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

const TYPE_LABEL: Record<ComponentType, string> = {
  mirror: '镜子',
  block: '推箱',
  circuit: '电路',
  color_gate: '颜色门',
  light_source: '镜子',
  target: '推箱',
  wall: '镜子',
  exit: '镜子',
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60000)
  if (m < 1) return '刚刚'
  if (m < 60) return `${m}分钟前`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}小时前`
  const d = Math.floor(h / 24)
  return `${d}天前`
}

function ComponentIcon({ type, className, style }: { type: ComponentType; className?: string; style?: React.CSSProperties }) {
  const item = COMPONENT_TYPES.find((c) => c.type === type)
  if (!item) return null
  const Icon = item.icon
  return <Icon className={className} style={style} />
}

export default function Editor() {
  const navigate = useNavigate()
  const { code } = useParams<{ code?: string }>()
  const addCustomLevel = useLevelStore((s) => s.addCustomLevel)
  const importedRef = useRef(false)
  const autoSaveTimerRef = useRef<number | null>(null)

  const {
    levelName, levelType, gridWidth, gridHeight,
    components, selectedComponentType, selectedComponentId,
    winConditions, hintCount, hints,
    activeDraftId, drafts, isMovingSelectedComponent,
    setLevelName, setLevelType, setGridSize,
    setSelectedComponentType, setSelectedComponentId,
    addComponent, removeComponent, updateComponent,
    addWinCondition, removeWinCondition, updateWinCondition,
    setHintCount, setHints, clearEditor, setMovingSelectedComponent,
    saveDraft, loadDraft, deleteDraft, newDraft,
  } = useEditorStore()

  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [shareCode, setShareCode] = useState('')
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importCode, setImportCode] = useState('')
  const [importError, setImportError] = useState('')
  const [copied, setCopied] = useState(false)
  const [showDraftPanel, setShowDraftPanel] = useState(true)
  const [draftSavedHint, setDraftSavedHint] = useState('')

  const selectedComponent = components.find((c) => c.id === selectedComponentId) ?? null

  const sortedDrafts = useMemo(() => {
    return [...drafts].sort((a, b) => b.modifiedAt - a.modifiedAt)
  }, [drafts])

  const showDraftSaved = (msg: string) => {
    setDraftSavedHint(msg)
    setTimeout(() => setDraftSavedHint(''), 1500)
  }

  const scheduleAutoSave = useCallback(() => {
    if (autoSaveTimerRef.current) {
      window.clearTimeout(autoSaveTimerRef.current)
    }
    autoSaveTimerRef.current = window.setTimeout(() => {
      const st = useEditorStore.getState()
      if (st.components.length > 0 || st.levelName.trim() || st.winConditions.length > 0) {
        st.saveDraft()
      }
    }, 800)
  }, [])

  useEffect(() => {
    if (code && !importedRef.current) {
      importedRef.current = true
      const level = decodeLevel(code)
      if (level) {
        clearEditor()
        setTimeout(() => {
          setLevelName(level.name)
          setLevelType(level.type)
          setGridSize(level.gridWidth, level.gridHeight)
          setHintCount(level.hintCount)
          setHints(level.hints.length > 0 ? level.hints : [''])
          for (const comp of level.components) {
            addComponent({ ...comp, id: comp.id || `${Date.now()}_${Math.random().toString(36).slice(2, 9)}` })
          }
          for (const cond of level.winConditions) {
            addWinCondition(cond)
          }
          scheduleAutoSave()
          navigate('/editor', { replace: true })
        }, 0)
      }
    }
  }, [code, clearEditor, setLevelName, setLevelType, setGridSize, setHintCount, setHints, addComponent, addWinCondition, navigate, scheduleAutoSave])

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) window.clearTimeout(autoSaveTimerRef.current)
    }
  }, [])

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      const existing = components.find((c) => c.position.row === row && c.position.col === col)

      if (isMovingSelectedComponent && selectedComponentId) {
        if (existing) return
        updateComponent(selectedComponentId, { position: { row, col } })
        setMovingSelectedComponent(false)
        scheduleAutoSave()
        return
      }

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
      scheduleAutoSave()
    },
    [components, selectedComponentType, isMovingSelectedComponent, selectedComponentId, addComponent, updateComponent, setSelectedComponentId, setMovingSelectedComponent, scheduleAutoSave]
  )

  const handleCellRightClick = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.preventDefault()
      removeComponent(id)
      scheduleAutoSave()
    },
    [removeComponent, scheduleAutoSave]
  )

  const handleDeleteKey = useCallback(() => {
    if (selectedComponentId) {
      removeComponent(selectedComponentId)
      scheduleAutoSave()
    }
  }, [selectedComponentId, removeComponent, scheduleAutoSave])

  const handleDuplicateSelected = useCallback(() => {
    if (!selectedComponent) return
    const newId = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    const clone: LevelComponent = JSON.parse(JSON.stringify(selectedComponent))
    clone.id = newId
    clone.position = { ...clone.position }
    let { row, col } = clone.position
    let placed = false
    for (let dr = 0; dr < gridHeight && !placed; dr++) {
      for (let dc = 0; dc < gridWidth && !placed; dc++) {
        const nr = (row + dr) % gridHeight
        const nc = (col + dc + 1) % gridWidth
        const occupied = components.some((c) => c.position.row === nr && c.position.col === nc)
        if (!occupied) {
          clone.position = { row: nr, col: nc }
          placed = true
        }
      }
    }
    addComponent(clone)
    setSelectedComponentId(newId)
    scheduleAutoSave()
  }, [selectedComponent, components, gridHeight, gridWidth, addComponent, setSelectedComponentId, scheduleAutoSave])

  const handleTestPlay = useCallback(() => {
    const st = useEditorStore.getState()
    if (st.components.length > 0 || st.levelName.trim()) {
      st.saveDraft()
    }
    const timestamp = Date.now()
    const tempLevel = {
      id: `custom_playtest_${timestamp}`,
      name: st.levelName || '未命名关卡',
      type: st.levelType,
      difficulty: 1,
      minSteps: 0,
      gridWidth: st.gridWidth,
      gridHeight: st.gridHeight,
      hintCount: st.hintCount,
      hints: st.hints,
      components: JSON.parse(JSON.stringify(st.components)),
      winConditions: JSON.parse(JSON.stringify(st.winConditions)),
      isDefault: false,
      isPlaytest: true,
      _playtestTimestamp: timestamp,
    }
    addCustomLevel(tempLevel)
    st.setPlaytesting(true)
    sessionStorage.setItem('mechpuzzle-playtest-id', tempLevel.id)
    navigate(`/play/${tempLevel.id}`)
  }, [addCustomLevel, navigate])

  const handleGenerateShareCode = useCallback(() => {
    const st = useEditorStore.getState()
    const level = {
      id: `custom_${Date.now()}`,
      name: st.levelName || '未命名关卡',
      type: st.levelType,
      difficulty: 1,
      minSteps: 0,
      gridWidth: st.gridWidth,
      gridHeight: st.gridHeight,
      hintCount: st.hintCount,
      hints: st.hints,
      components: [...st.components],
      winConditions: [...st.winConditions],
      isDefault: false,
    }
    const c = encodeLevel(level)
    setShareCode(c)
    setShareModalOpen(true)
    setCopied(false)
  }, [])

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
    clearEditor()
    setTimeout(() => {
      setLevelName(level.name)
      setLevelType(level.type)
      setGridSize(level.gridWidth, level.gridHeight)
      setHintCount(level.hintCount)
      setHints(level.hints.length > 0 ? level.hints : [''])
      for (const comp of level.components) {
        addComponent({ ...comp, id: comp.id || `${Date.now()}_${Math.random().toString(36).slice(2, 9)}` })
      }
      for (const cond of level.winConditions) {
        addWinCondition(cond)
      }
      setImportModalOpen(false)
      scheduleAutoSave()
    }, 0)
  }, [importCode, clearEditor, setLevelName, setLevelType, setGridSize, setHintCount, setHints, addComponent, addWinCondition, scheduleAutoSave])

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
      scheduleAutoSave()
    },
    [components, updateComponent, scheduleAutoSave]
  )

  const handleSaveDraft = useCallback(() => {
    saveDraft()
    showDraftSaved('✓ 草稿已保存')
  }, [saveDraft])

  const handleNewDraft = useCallback(() => {
    const st = useEditorStore.getState()
    if (st.components.length > 0 || st.levelName.trim() || st.winConditions.length > 0) {
      st.saveDraft()
    }
    newDraft()
  }, [newDraft])

  const handleDeleteDraft = useCallback((id: string) => {
    if (!confirm('确定要删除这个草稿吗？此操作不可撤销。')) return
    deleteDraft(id)
  }, [deleteDraft])

  const renderPropertyEditor = () => {
    if (!selectedComponent) {
      return (
        <div className="text-iron-light/60 text-sm text-center py-8 space-y-2">
          <p>点击画布上的组件以编辑属性</p>
          <p className="text-xs text-iron-light/40">或在左侧选择类型后放置新组件</p>
        </div>
      )
    }

    const { id, type, properties } = selectedComponent

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 bg-base-dark/60 rounded p-2">
          <div className={cn('w-8 h-8 rounded flex items-center justify-center', COMPONENT_BG[type])}>
            <ComponentIcon type={type} className={cn('w-4 h-4', COMPONENT_COLORS[type])} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-copper font-medium truncate">
              {COMPONENT_TYPES.find((c) => c.type === type)?.label}
            </div>
            <div className="text-[10px] text-iron-light/50">
              ({selectedComponent.position.row},{selectedComponent.position.col})
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setMovingSelectedComponent(!isMovingSelectedComponent)}
            className={cn(
              'btn-ghost text-xs py-2 justify-center gap-1',
              isMovingSelectedComponent && 'ring-2 ring-copper bg-copper/10'
            )}
          >
            <Move className="w-3.5 h-3.5" />
            {isMovingSelectedComponent ? '取消移动' : '移动位置'}
          </button>
          <button
            onClick={handleDuplicateSelected}
            className="btn-ghost text-xs py-2 justify-center gap-1"
          >
            <Files className="w-3.5 h-3.5" />
            复制组件
          </button>
        </div>

        {isMovingSelectedComponent && (
          <p className="text-[11px] text-copper/80 bg-copper/10 border border-copper/30 rounded px-2 py-1.5 text-center">
            点击画布上的空白格子将组件移动到该处
          </p>
        )}

        {type === 'mirror' && (
          <div>
            <label className="text-xs text-iron-light/60 block mb-1">方向</label>
            <div className="grid grid-cols-4 gap-1">
              {MIRROR_DIRECTIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => updateComponentProp(id, { direction: d })}
                  className={cn(
                    'py-1.5 text-xs rounded border',
                    (properties as MirrorProperties).direction === d
                      ? 'border-copper bg-copper/20 text-copper'
                      : 'border-iron/30 text-iron-light/70 hover:border-iron/50'
                  )}
                >
                  {d}°
                </button>
              ))}
            </div>
            <label className="text-xs text-iron-light/60 block mb-1 mt-3">是否固定</label>
            <button
              onClick={() => updateComponentProp(id, { isFixed: !(properties as MirrorProperties).isFixed })}
              className="flex items-center gap-2 text-xs text-iron-light"
            >
              {(properties as MirrorProperties).isFixed ? <ToggleRight className="w-6 h-6 text-copper" /> : <ToggleLeft className="w-6 h-6 text-iron-light/50" />}
              {(properties as MirrorProperties).isFixed ? '已固定' : '可旋转'}
            </button>
          </div>
        )}

        {type === 'block' && (
          <div>
            <label className="text-xs text-iron-light/60 block mb-1">是否固定</label>
            <button
              onClick={() => updateComponentProp(id, { isFixed: !(properties as BlockProperties).isFixed })}
              className="flex items-center gap-2 text-xs text-iron-light"
            >
              {(properties as BlockProperties).isFixed ? <ToggleRight className="w-6 h-6 text-copper" /> : <ToggleLeft className="w-6 h-6 text-iron-light/50" />}
              {(properties as BlockProperties).isFixed ? '已固定（不可推）' : '可推动'}
            </button>
          </div>
        )}

        {type === 'circuit' && (
          <div className="space-y-2">
            <div>
              <label className="text-xs text-iron-light/60 block mb-1">连接方向（顺时针：上右下左）</label>
              <div className="grid grid-cols-4 gap-1">
                {(['上', '右', '下', '左'] as const).map((label, idx) => (
                  <button
                    key={label}
                    onClick={() => {
                      const arr = [...(properties as CircuitProperties).connections] as [boolean, boolean, boolean, boolean]
                      arr[idx] = !arr[idx]
                      updateComponentProp(id, { connections: arr })
                    }}
                    className={cn(
                      'py-1.5 text-xs rounded border',
                      (properties as CircuitProperties).connections[idx]
                        ? 'border-emerald bg-emerald/20 text-emerald'
                        : 'border-iron/30 text-iron-light/50 hover:border-iron/50'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => updateComponentProp(id, { isSource: !(properties as CircuitProperties).isSource })}
                className="flex items-center gap-2 text-xs text-iron-light"
              >
                {(properties as CircuitProperties).isSource ? <ToggleRight className="w-6 h-6 text-emerald" /> : <ToggleLeft className="w-6 h-6 text-iron-light/50" />}
                电源
              </button>
              <button
                onClick={() => updateComponentProp(id, { isTarget: !(properties as CircuitProperties).isTarget })}
                className="flex items-center gap-2 text-xs text-iron-light"
              >
                {(properties as CircuitProperties).isTarget ? <ToggleRight className="w-6 h-6 text-copper" /> : <ToggleLeft className="w-6 h-6 text-iron-light/50" />}
                目标
              </button>
            </div>
            <button
              onClick={() => updateComponentProp(id, { isFixed: !(properties as CircuitProperties).isFixed })}
              className="flex items-center gap-2 text-xs text-iron-light w-full"
            >
              {(properties as CircuitProperties).isFixed ? <ToggleRight className="w-6 h-6 text-copper" /> : <ToggleLeft className="w-6 h-6 text-iron-light/50" />}
              {(properties as CircuitProperties).isFixed ? '已固定（不可旋转）' : '可旋转'}
            </button>
          </div>
        )}

        {type === 'color_gate' && (
          <div className="space-y-2">
            <div>
              <label className="text-xs text-iron-light/60 block mb-1">颜色数量</label>
              <div className="grid grid-cols-3 gap-1">
                {[3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => updateComponentProp(id, {
                      colorCount: n,
                      currentOrder: Array.from({ length: n }, (_, i) => i + 1),
                      targetOrder: Array.from({ length: n }, (_, i) => i + 1),
                    })}
                    className={cn(
                      'py-1.5 text-xs rounded border',
                      (properties as ColorGateProperties).colorCount === n
                        ? 'border-copper bg-copper/20 text-copper'
                        : 'border-iron/30 text-iron-light/70 hover:border-iron/50'
                    )}
                  >
                    {n}色
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => updateComponentProp(id, { isFixed: !(properties as ColorGateProperties).isFixed })}
              className="flex items-center gap-2 text-xs text-iron-light w-full"
            >
              {(properties as ColorGateProperties).isFixed ? <ToggleRight className="w-6 h-6 text-copper" /> : <ToggleLeft className="w-6 h-6 text-iron-light/50" />}
              {(properties as ColorGateProperties).isFixed ? '已固定' : '可切换颜色'}
            </button>
          </div>
        )}

        {type === 'light_source' && (
          <div className="space-y-2">
            <div>
              <label className="text-xs text-iron-light/60 block mb-1">发射方向</label>
              <div className="grid grid-cols-4 gap-1">
                {LIGHT_DIRECTIONS.map((d) => {
                  const labelMap: Record<number, string> = { 0: '右', 90: '下', 180: '左', 270: '上' }
                  return (
                    <button
                      key={d}
                      onClick={() => updateComponentProp(id, { direction: d })}
                      className={cn(
                        'py-1.5 text-xs rounded border',
                        (properties as LightSourceProperties).direction === d
                          ? 'border-amber bg-amber/20 text-amber'
                          : 'border-iron/30 text-iron-light/70 hover:border-iron/50'
                      )}
                    >
                      {labelMap[d]}
                    </button>
                  )
                })}
              </div>
            </div>
            <div>
              <label className="text-xs text-iron-light/60 block mb-1">光束颜色</label>
              <input
                type="color"
                value={(properties as LightSourceProperties).color}
                onChange={(e) => updateComponentProp(id, { color: e.target.value })}
                className="w-full h-8 bg-base-dark border border-iron/30 rounded cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>
    )
  }

  const cellSize = Math.min(48, 480 / Math.max(gridWidth, gridHeight))

  return (
    <div className="min-h-screen bg-base font-body text-[#e0dcd0] flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-iron/20 bg-base-dark/60 backdrop-blur-sm relative">
        <button
          onClick={() => navigate('/')}
          className="btn-ghost flex items-center gap-1.5 text-sm py-1.5 px-3"
        >
          <ArrowLeft className="w-4 h-4" />
          返回大厅
        </button>
        <div className="flex flex-col items-center">
          <h1 className="font-display text-lg text-copper text-glow-copper flex items-center gap-2">
            <Edit3 className="w-5 h-5" />
            关卡编辑器
          </h1>
          <div className="flex items-center gap-3 text-xs text-iron-light">
            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              {components.length} 个组件
            </span>
            <span>{gridWidth}×{gridHeight}</span>
            {activeDraftId && (
              <span className="text-copper/80">已关联草稿</span>
            )}
            {draftSavedHint && (
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                className="text-emerald font-medium"
              >
                {draftSavedHint}
              </motion.span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveDraft}
            className="btn-ghost text-sm py-1.5 px-3 flex items-center gap-1"
            title="保存草稿"
          >
            <Save className="w-4 h-4" />
            保存
          </button>
          <button
            onClick={handleTestPlay}
            className="btn-copper text-sm py-1.5 px-3 flex items-center gap-1"
            disabled={components.length === 0 || winConditions.length === 0}
          >
            <Play className="w-4 h-4" />
            测试游玩
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* 左侧面板：草稿列表 + 组件类型 */}
        <aside className="w-60 shrink-0 border-r border-iron/20 bg-base-dark/40 flex flex-col overflow-hidden">
          <button
            onClick={() => setShowDraftPanel(!showDraftPanel)}
            className="flex items-center justify-between px-3 py-2 border-b border-iron/20 hover:bg-base-light/10 transition-colors"
          >
            <span className="font-display text-xs text-copper/80 tracking-wider uppercase flex items-center gap-1.5">
              <Files className="w-3.5 h-3.5" />
              草稿箱 ({sortedDrafts.length})
            </span>
            <Plus className={cn('w-3.5 h-3.5 transition-transform', !showDraftPanel && '-rotate-45')} />
          </button>

          <AnimatePresence>
            {showDraftPanel && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="flex-shrink overflow-hidden border-b border-iron/20"
              >
                <div className="p-2 space-y-1.5 max-h-[42%] overflow-y-auto">
                  <button
                    onClick={handleNewDraft}
                    className="w-full btn-ghost text-xs py-2 justify-center gap-1 border border-dashed border-iron/30 hover:border-copper/50 mb-2"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    新建草稿
                  </button>
                  {sortedDrafts.length === 0 ? (
                    <p className="text-[11px] text-iron-light/40 text-center py-4">
                      暂无草稿，保存后会出现在这里
                    </p>
                  ) : (
                    sortedDrafts.map((draft: Draft) => (
                      <div
                        key={draft.id}
                        className={cn(
                          'rounded p-2 cursor-pointer transition-colors group',
                          activeDraftId === draft.id
                            ? 'bg-copper/15 border border-copper/40'
                            : 'bg-base-dark/60 border border-iron/20 hover:border-copper/30'
                        )}
                      >
                        <div
                          className="flex items-start justify-between gap-1"
                          onClick={() => loadDraft(draft.id)}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-xs text-copper font-medium truncate flex items-center gap-1">
                              <span className={cn('w-1.5 h-1.5 rounded-full',
                                draft.type === 'mirror' && 'bg-sapphire',
                                draft.type === 'block' && 'bg-amber',
                                draft.type === 'circuit' && 'bg-emerald',
                                draft.type === 'color_gate' && 'bg-copper',
                              )} />
                              {draft.name || '未命名'}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-[10px] text-iron-light/50">
                              <span>{TYPE_LABEL[draft.type]}</span>
                              <span>·</span>
                              <span>{draft.components.length}组件</span>
                            </div>
                            <div className="flex items-center gap-1 mt-0.5 text-[10px] text-iron-light/40">
                              <Clock className="w-2.5 h-2.5" />
                              {formatRelativeTime(draft.modifiedAt)}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteDraft(draft.id)
                          }}
                          className="mt-1 w-full text-[10px] text-ruby/50 hover:text-ruby flex items-center justify-center gap-1 py-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3 h-3" />
                          删除
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="p-3 flex-1 overflow-y-auto">
            <h3 className="font-display text-xs text-copper/80 tracking-wider uppercase mb-2 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              组件库
            </h3>
            <div className="grid grid-cols-2 gap-1.5">
              {COMPONENT_TYPES.map((item) => {
                const Icon = item.icon
                const active = selectedComponentType === item.type
                return (
                  <button
                    key={item.type}
                    onClick={() => setSelectedComponentType(active ? null : item.type)}
                    className={cn(
                      'flex flex-col items-center gap-1 py-2.5 rounded border transition-all',
                      active
                        ? 'border-copper bg-copper/15 ring-1 ring-copper/30'
                        : 'border-iron/20 bg-base-dark/40 hover:border-iron/40'
                    )}
                  >
                    <Icon className={cn('w-4.5 h-4.5', COMPONENT_COLORS[item.type])} />
                    <span className={cn('text-[10px]', active ? 'text-copper' : 'text-iron-light/70')}>
                      {item.label}
                    </span>
                  </button>
                )
              })}
            </div>
            <div className="mt-4 p-2 rounded bg-base-dark/60 border border-iron/20">
              <p className="text-[10px] text-iron-light/60 leading-relaxed">
                {isMovingSelectedComponent
                  ? '📌 移动模式：点击空白格子放置选中组件'
                  : selectedComponentType
                    ? `点击画布空白格子放置${COMPONENT_TYPES.find((c) => c.type === selectedComponentType)?.label}`
                    : '选择左侧组件后点击画布放置，或直接点击已有组件编辑'}
              </p>
            </div>
          </div>
        </aside>

        {/* 中间画布 */}
        <main className="flex-1 flex flex-col items-center justify-center p-4 overflow-auto relative">
          {isMovingSelectedComponent && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-full bg-copper/90 text-base-dark text-xs font-medium shadow-lg flex items-center gap-2">
              <Move className="w-3.5 h-3.5" />
              移动模式：点击空白格子移动组件
            </div>
          )}
          <div
            className="grid gap-0.5 bg-base-dark/30 p-2 rounded-xl border border-iron/30 shadow-lg"
            style={{
              gridTemplateColumns: `repeat(${gridWidth}, ${cellSize}px)`,
              gridTemplateRows: `repeat(${gridHeight}, ${cellSize}px)`,
            }}
            onKeyDown={(e) => {
              if (e.key === 'Delete' || e.key === 'Backspace') {
                handleDeleteKey()
              }
            }}
            tabIndex={0}
          >
            {Array.from({ length: gridHeight * gridWidth }).map((_, i) => {
              const row = Math.floor(i / gridWidth)
              const col = i % gridWidth
              const comp = components.find(
                (c) => c.position.row === row && c.position.col === col
              )
              const isSelected = comp && comp.id === selectedComponentId
              const isValidMoveTarget = isMovingSelectedComponent && !comp
              return (
                <div
                  key={i}
                  className={cn(
                    'relative flex items-center justify-center rounded-sm cursor-pointer transition-all border',
                    isSelected
                      ? 'border-copper ring-2 ring-copper/60 bg-copper/10 z-20'
                      : isValidMoveTarget
                        ? 'border-emerald/60 bg-emerald/10 animate-pulse'
                        : 'border-iron/20 bg-base-dark/30 hover:bg-base-light/20'
                  )}
                  style={{ width: cellSize, height: cellSize }}
                  onClick={() => handleCellClick(row, col)}
                  onContextMenu={(e) => comp && handleCellRightClick(e, comp.id)}
                >
                  {comp && (
                    <div className="absolute inset-0 pointer-events-none">
                      <div
                        className={cn(
                          'w-full h-full flex items-center justify-center',
                          COMPONENT_BG[comp.type]
                        )}
                      >
                        <ComponentIcon
                          type={comp.type}
                          className={cn(
                            'w-2/3 h-2/3',
                            COMPONENT_COLORS[comp.type],
                            comp.type === 'mirror' && `origin-center`,
                          )}
                          style={comp.type === 'mirror' ? {
                            transform: `rotate(${(comp.properties as MirrorProperties).direction}deg)`,
                          } : undefined}
                        />
                      </div>
                      {(comp.properties as CircuitProperties)?.isSource && (
                        <div className="absolute top-0.5 left-0.5 w-2 h-2 rounded-full bg-emerald animate-pulse" />
                      )}
                      {(comp.properties as CircuitProperties)?.isTarget && (
                        <div className="absolute top-0.5 left-0.5 w-2 h-2 rounded-full bg-copper ring-1 ring-copper/40" />
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <p className="text-xs text-iron-light/40 mt-4">
            左键放置/选中 · 右键或Delete删除 · 选中后可移动或复制
          </p>
        </main>

        {/* 右侧属性面板 */}
        <aside className="w-72 shrink-0 border-l border-iron/20 bg-base-dark/40 p-3 flex flex-col gap-3 overflow-y-auto">
          <h2 className="font-display text-xs text-copper/80 tracking-wider uppercase flex items-center gap-1.5">
            <Edit3 className="w-3.5 h-3.5" />
            关卡设置
          </h2>

          <div className="space-y-2">
            <div>
              <label className="text-xs text-iron-light/60 block mb-1">关卡名称</label>
              <input
                type="text"
                value={levelName}
                placeholder="给你的关卡起个名字"
                onChange={(e) => { setLevelName(e.target.value); scheduleAutoSave() }}
                className="w-full bg-base-dark border border-iron/30 rounded px-2 py-1.5 text-sm text-copper focus:outline-none focus:border-copper"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-iron-light/60 block mb-1">宽度</label>
                <input
                  type="number"
                  min={3}
                  max={12}
                  value={gridWidth}
                  onChange={(e) => { setGridSize(Math.max(3, Math.min(12, Number(e.target.value))), gridHeight); scheduleAutoSave() }}
                  className="w-full bg-base-dark border border-iron/30 rounded px-2 py-1 text-sm text-copper text-center focus:outline-none focus:border-copper"
                />
              </div>
              <div>
                <label className="text-xs text-iron-light/60 block mb-1">高度</label>
                <input
                  type="number"
                  min={3}
                  max={12}
                  value={gridHeight}
                  onChange={(e) => { setGridSize(gridWidth, Math.max(3, Math.min(12, Number(e.target.value)))); scheduleAutoSave() }}
                  className="w-full bg-base-dark border border-iron/30 rounded px-2 py-1 text-sm text-copper text-center focus:outline-none focus:border-copper"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-iron-light/60 block mb-1">关卡类型</label>
              <select
                value={levelType}
                onChange={(e) => { setLevelType(e.target.value as ComponentType); scheduleAutoSave() }}
                className="w-full bg-base-dark border border-iron/30 rounded px-2 py-1 text-sm text-copper focus:outline-none focus:border-copper"
              >
                {COMPONENT_TYPES.slice(0, 4).map((c) => (
                  <option key={c.type} value={c.type}>{c.label}类</option>
                ))}
              </select>
            </div>
          </div>

          <div className="border-t border-iron/20 pt-3">
            <h3 className="font-display text-xs text-copper/80 tracking-wider uppercase mb-2 flex items-center gap-1.5">
              <Grip className="w-3.5 h-3.5" />
              组件属性
            </h3>
            {renderPropertyEditor()}
          </div>

          {/* Win Conditions */}
          <div className="border-t border-iron/20 pt-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-display text-xs text-copper/80 tracking-wider uppercase">胜利条件</h3>
              <button
                onClick={() => { addWinCondition({ type: 'light_reach', params: {} }); scheduleAutoSave() }}
                className="text-emerald hover:text-emerald/80 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              {winConditions.map((cond, i) => (
                <div key={i} className="bg-base-dark/60 rounded p-2 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <select
                      value={cond.type}
                      onChange={(e) => {
                        updateWinCondition(i, { type: e.target.value as WinConditionType, params: {} })
                        scheduleAutoSave()
                      }}
                      className="flex-1 bg-base-dark border border-iron/30 rounded px-1.5 py-0.5 text-xs text-copper focus:outline-none focus:border-copper"
                    >
                      {WIN_CONDITION_TYPES.map((wct) => (
                        <option key={wct.type} value={wct.type}>{wct.label}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => { removeWinCondition(i); scheduleAutoSave() }}
                      className="text-ruby/60 hover:text-ruby transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {cond.type === 'light_reach' && (
                    <div className="space-y-1.5">
                      <label className="text-xs text-iron-light/60">选择出口组件</label>
                      <select
                        value={(cond.params.exitId as string) ?? ''}
                        onChange={(e) => {
                          updateWinCondition(i, { ...cond, params: { ...cond.params, exitId: e.target.value } })
                          scheduleAutoSave()
                        }}
                        className="w-full bg-base-dark border border-iron/30 rounded px-1.5 py-0.5 text-xs text-copper focus:outline-none focus:border-copper"
                      >
                        <option value="">-- 选择出口 --</option>
                        {components.filter((c) => c.type === 'exit').map((c) => (
                          <option key={c.id} value={c.id}>出口 ({c.position.row},{c.position.col})</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {cond.type === 'block_on_target' && (
                    <div className="space-y-1.5">
                      <div>
                        <label className="text-xs text-iron-light/60">选择方块</label>
                        <select
                          value={(cond.params.blockId as string) ?? ''}
                          onChange={(e) => {
                            updateWinCondition(i, { ...cond, params: { ...cond.params, blockId: e.target.value } })
                            scheduleAutoSave()
                          }}
                          className="w-full bg-base-dark border border-iron/30 rounded px-1.5 py-0.5 text-xs text-copper focus:outline-none focus:border-copper"
                        >
                          <option value="">-- 选择方块 --</option>
                          {components.filter((c) => c.type === 'block').map((c) => (
                            <option key={c.id} value={c.id}>方块 ({c.position.row},{c.position.col})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-iron-light/60">选择目标</label>
                        <select
                          value={(cond.params.targetId as string) ?? ''}
                          onChange={(e) => {
                            updateWinCondition(i, { ...cond, params: { ...cond.params, targetId: e.target.value } })
                            scheduleAutoSave()
                          }}
                          className="w-full bg-base-dark border border-iron/30 rounded px-1.5 py-0.5 text-xs text-copper focus:outline-none focus:border-copper"
                        >
                          <option value="">-- 选择目标 --</option>
                          {components.filter((c) => c.type === 'target').map((c) => (
                            <option key={c.id} value={c.id}>目标 ({c.position.row},{c.position.col})</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                  {cond.type === 'circuit_complete' && (
                    <div className="space-y-1.5">
                      <div>
                        <label className="text-xs text-iron-light/60">选择电源节点</label>
                        <select
                          value={(cond.params.sourceId as string) ?? ''}
                          onChange={(e) => {
                            updateWinCondition(i, { ...cond, params: { ...cond.params, sourceId: e.target.value } })
                            scheduleAutoSave()
                          }}
                          className="w-full bg-base-dark border border-iron/30 rounded px-1.5 py-0.5 text-xs text-copper focus:outline-none focus:border-copper"
                        >
                          <option value="">-- 选择电源 --</option>
                          {components.filter((c) => c.type === 'circuit').map((c) => (
                            <option key={c.id} value={c.id}>电路 ({c.position.row},{c.position.col})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-iron-light/60">选择目标节点</label>
                        <select
                          value={(cond.params.targetId as string) ?? ''}
                          onChange={(e) => {
                            updateWinCondition(i, { ...cond, params: { ...cond.params, targetId: e.target.value } })
                            scheduleAutoSave()
                          }}
                          className="w-full bg-base-dark border border-iron/30 rounded px-1.5 py-0.5 text-xs text-copper focus:outline-none focus:border-copper"
                        >
                          <option value="">-- 选择目标 --</option>
                          {components.filter((c) => c.type === 'circuit').map((c) => (
                            <option key={c.id} value={c.id}>电路 ({c.position.row},{c.position.col})</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                  {cond.type === 'color_match' && (
                    <div className="space-y-1.5">
                      <label className="text-xs text-iron-light/60">选择颜色门</label>
                      <select
                        value={(cond.params.gateId as string) ?? ''}
                        onChange={(e) => {
                          updateWinCondition(i, { ...cond, params: { ...cond.params, gateId: e.target.value } })
                          scheduleAutoSave()
                        }}
                        className="w-full bg-base-dark border border-iron/30 rounded px-1.5 py-0.5 text-xs text-copper focus:outline-none focus:border-copper"
                      >
                        <option value="">-- 选择颜色门 --</option>
                        {components.filter((c) => c.type === 'color_gate').map((c) => (
                          <option key={c.id} value={c.id}>颜色门 ({c.position.row},{c.position.col})</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              ))}
              {winConditions.length === 0 && (
                <p className="text-xs text-iron-light/40 text-center py-4">
                  点击 + 添加胜利条件
                </p>
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
                onChange={(e) => { setHintCount(Math.max(0, Math.min(10, Number(e.target.value)))); scheduleAutoSave() }}
                className="w-14 bg-base-dark border border-iron/30 rounded px-2 py-1 text-sm text-copper text-center focus:outline-none focus:border-copper"
              />
            </label>
            <div className="space-y-1.5">
              {Array.from({ length: Math.max(hintCount, hints.length) }).map((_, i) => (
                <div key={i} className="flex items-center gap-1">
                  <span className="text-[10px] text-iron-light/50 w-4">{i + 1}</span>
                  <input
                    type="text"
                    placeholder={`提示 ${i + 1}`}
                    value={hints[i] ?? ''}
                    onChange={(e) => {
                      const newHints = [...hints]
                      newHints[i] = e.target.value
                      setHints(newHints)
                      scheduleAutoSave()
                    }}
                    className="flex-1 bg-base-dark border border-iron/30 rounded px-2 py-1 text-xs text-copper focus:outline-none focus:border-copper"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-auto pt-3 border-t border-iron/20 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleGenerateShareCode}
                className="btn-ghost text-xs py-2 justify-center gap-1"
              >
                <Share2 className="w-3.5 h-3.5" />
                分享
              </button>
              <button
                onClick={handleImportShareCode}
                className="btn-ghost text-xs py-2 justify-center gap-1"
              >
                <Import className="w-3.5 h-3.5" />
                导入
              </button>
            </div>
            <button
              onClick={() => {
                if (confirm('确定要清空当前画布吗？内容会丢失哦')) clearEditor()
              }}
              className="btn-ghost text-xs py-2 justify-center gap-1 text-ruby/80 hover:text-ruby w-full"
            >
              <Trash2 className="w-3.5 h-3.5" />
              清空画布
            </button>
          </div>
        </aside>
      </div>

      {/* Share Modal */}
      <AnimatePresence>
        {shareModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShareModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', damping: 25 }}
              className="panel-dark p-6 w-[520px] max-w-[92vw]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg text-copper flex items-center gap-2">
                  <Share2 className="w-5 h-5" />
                  分享关卡
                </h2>
                <button onClick={() => setShareModalOpen(false)} className="text-iron-light/60 hover:text-copper">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-iron-light/70 mb-3">
                将下方分享码发送给朋友，TA 可通过「编辑器-导入」打开此关卡
              </p>
              <div className="bg-base-dark/60 rounded p-3 border border-iron/30 max-h-32 overflow-y-auto mb-4">
                <code className="text-[11px] text-copper/90 break-all select-all">{shareCode}</code>
              </div>
              <div className="flex gap-2">
                <button onClick={handleCopyCode} className="btn-copper flex-1 justify-center gap-1.5">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? '已复制到剪贴板' : '复制分享码'}
                </button>
                <button onClick={() => setShareModalOpen(false)} className="btn-ghost justify-center">
                  关闭
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
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setImportModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', damping: 25 }}
              className="panel-dark p-6 w-[520px] max-w-[92vw]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg text-copper flex items-center gap-2">
                  <Import className="w-5 h-5" />
                  导入分享码
                </h2>
                <button onClick={() => setImportModalOpen(false)} className="text-iron-light/60 hover:text-copper">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <textarea
                value={importCode}
                onChange={(e) => setImportCode(e.target.value)}
                rows={5}
                placeholder="粘贴分享码到此处..."
                className="w-full bg-base-dark/60 rounded p-3 border border-iron/30 text-[11px] text-copper/90 focus:outline-none focus:border-copper resize-none font-mono"
              />
              {importError && (
                <p className="mt-2 text-xs text-ruby bg-ruby/10 border border-ruby/30 rounded px-2 py-1.5">{importError}</p>
              )}
              <div className="flex gap-2 mt-4">
                <button onClick={handleImportConfirm} className="btn-copper flex-1 justify-center">
                  确认导入
                </button>
                <button onClick={() => setImportModalOpen(false)} className="btn-ghost justify-center">
                  取消
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function cn(...args: unknown[]): string {
  return args.filter(Boolean).join(' ')
}
