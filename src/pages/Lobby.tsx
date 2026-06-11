import { useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Lock,
  Star,
  Zap,
  Palette,
  Box,
  Trophy,
  Wrench,
  Heart,
  ChevronRight,
  CheckCircle2,
  RotateCw,
  Filter,
  Pencil,
  Trash2,
  Share2,
  Gamepad2,
  Layers,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLevelStore } from '@/store/levelStore'
import { useProgressStore } from '@/store/progressStore'
import { useEditorStore } from '@/store/editorStore'
import { encodeLevel, getShareUrl } from '@/utils/share'
import type { ComponentType, Level, Rating } from '@/types'

type LevelCollectionTab = 'default' | 'custom'
type FilterTab = 'all' | ComponentType

const COLLECTION_TABS: { key: LevelCollectionTab; label: string; icon: React.ReactNode; hint: string }[] = [
  { key: 'default', label: '默认关卡', icon: <Layers className="w-4 h-4" />, hint: '内置 12 关' },
  { key: 'custom', label: '自定义关卡', icon: <Wrench className="w-4 h-4" />, hint: '我的创作和导入' },
]

const FILTER_TABS: { key: FilterTab; label: string; icon: React.ReactNode }[] = [
  { key: 'all', label: '全部', icon: <Filter className="w-4 h-4" /> },
  { key: 'mirror', label: '镜子', icon: <RotateCw className="w-4 h-4" /> },
  { key: 'block', label: '方块', icon: <Box className="w-4 h-4" /> },
  { key: 'circuit', label: '电路', icon: <Zap className="w-4 h-4" /> },
  { key: 'color_gate', label: '颜色', icon: <Palette className="w-4 h-4" /> },
]

const TYPE_ACCENT: Record<string, { text: string; border: string; bg: string; glow: string }> = {
  mirror: {
    text: 'text-amber',
    border: 'border-amber/40',
    bg: 'bg-amber/10',
    glow: 'glow-amber',
  },
  block: {
    text: 'text-sapphire',
    border: 'border-sapphire/40',
    bg: 'bg-sapphire/10',
    glow: 'glow-sapphire',
  },
  circuit: {
    text: 'text-emerald',
    border: 'border-emerald/40',
    bg: 'bg-emerald/10',
    glow: 'glow-emerald',
  },
  color_gate: {
    text: 'text-ruby',
    border: 'border-ruby/40',
    bg: 'bg-ruby/10',
    glow: '',
  },
}

const RATING_STYLE: Record<Rating, { bg: string; glow: string; text: string }> = {
  S: { bg: 'bg-emerald/20', glow: 'glow-emerald', text: 'text-emerald' },
  A: { bg: 'bg-copper/20', glow: 'glow-copper', text: 'text-copper' },
  B: { bg: 'bg-iron/30', glow: '', text: 'text-iron-light' },
  C: { bg: 'bg-iron/20', glow: '', text: 'text-iron-light' },
}

function TypeIcon({ type, className }: { type: ComponentType; className?: string }) {
  const props = { className: cn('w-5 h-5', className) }
  switch (type) {
    case 'mirror':
      return <RotateCw {...props} />
    case 'block':
      return <Box {...props} />
    case 'circuit':
      return <Zap {...props} />
    case 'color_gate':
      return <Palette {...props} />
    default:
      return <Box {...props} />
  }
}

function DifficultyStars({ difficulty }: { difficulty: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            'w-3 h-3',
            i < difficulty ? 'text-amber fill-amber' : 'text-iron/40'
          )}
        />
      ))}
    </div>
  )
}

function RatingBadge({ rating }: { rating: Rating }) {
  const style = RATING_STYLE[rating]
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-display font-bold',
        style.bg,
        style.text,
        style.glow
      )}
    >
      {rating}
    </span>
  )
}

function DefaultLevelCard({
  level,
  isUnlocked,
  record,
  isFavorite,
  onToggleFavorite,
  index,
}: {
  level: Level
  isUnlocked: boolean
  record: ReturnType<typeof useProgressStore.getState>['records'][string] | undefined
  isFavorite: boolean
  onToggleFavorite: () => void
  index: number
}) {
  const navigate = useNavigate()
  const accent = TYPE_ACCENT[level.type] ?? TYPE_ACCENT.block

  const handleClick = () => {
    if (isUnlocked) {
      navigate(`/play/${level.id}`)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: 'easeOut' }}
      className={cn(
        'card-mech relative flex flex-col overflow-hidden cursor-pointer group',
        !isUnlocked && 'cursor-not-allowed',
        isUnlocked && accent.border
      )}
      onClick={handleClick}
    >
      {!isUnlocked && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-base-dark/70 backdrop-blur-[2px] rounded-xl">
          <Lock className="w-8 h-8 text-iron-light/60" />
        </div>
      )}

      <div className="flex items-center justify-between px-4 pt-3">
        <div className={cn('flex items-center gap-2', accent.text)}>
          <TypeIcon type={level.type} />
          <span className="text-xs font-medium opacity-80">
            {FILTER_TABS.find((t) => t.key === level.type)?.label ?? level.type}
          </span>
        </div>
        <button
          className="p-1 rounded-full transition-colors hover:bg-iron/20"
          onClick={(e) => {
            e.stopPropagation()
            onToggleFavorite()
          }}
        >
          {isFavorite ? (
            <Heart className="w-4 h-4 text-ruby fill-ruby" />
          ) : (
            <Heart className="w-4 h-4 text-iron/40 hover:text-ruby/60" />
          )}
        </button>
      </div>

      <div className="flex-1 px-4 py-3">
        <h3 className="font-body font-medium text-base text-copper-light group-hover:text-copper transition-colors truncate">
          {level.name}
        </h3>
        <div className="mt-2 flex items-center gap-3">
          <DifficultyStars difficulty={level.difficulty} />
          <span
            className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium',
              accent.bg,
              accent.text
            )}
          >
            <Zap className="w-3 h-3" />
            {level.minSteps}步
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between px-4 pb-3">
        {record?.completed ? (
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald" />
            <RatingBadge rating={record.rating} />
          </div>
        ) : (
          <span className="text-xs text-iron/50 font-body">未通关</span>
        )}
        {isUnlocked && (
          <ChevronRight className="w-4 h-4 text-iron/30 group-hover:text-copper transition-colors" />
        )}
      </div>
    </motion.div>
  )
}

function CustomLevelCard({
  level,
  record,
  index,
  onPlay,
  onEdit,
  onShare,
  onDelete,
}: {
  level: Level
  record: ReturnType<typeof useProgressStore.getState>['records'][string] | undefined
  index: number
  onPlay: () => void
  onEdit: () => void
  onShare: () => void
  onDelete: () => void
}) {
  const accent = TYPE_ACCENT[level.type] ?? TYPE_ACCENT.block
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: 'easeOut' }}
      className={cn(
        'card-mech relative flex flex-col overflow-hidden group border-copper/30'
      )}
    >
      <div className="absolute top-2 right-2 z-10">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-copper/15 text-copper border border-copper/30">
          <Wrench className="w-3 h-3" />
          自定义
        </span>
      </div>

      <div className="flex items-center justify-between px-4 pt-3 pr-20">
        <div className={cn('flex items-center gap-2', accent.text)}>
          <TypeIcon type={level.type} />
          <span className="text-xs font-medium opacity-80">
            {FILTER_TABS.find((t) => t.key === level.type)?.label ?? level.type}
          </span>
        </div>
      </div>

      <div className="flex-1 px-4 py-3">
        <h3 className="font-body font-medium text-base text-copper-light group-hover:text-copper transition-colors truncate">
          {level.name || '未命名关卡'}
        </h3>
        <div className="mt-2 flex items-center gap-3">
          <DifficultyStars difficulty={level.difficulty || 1} />
          {level.minSteps ? (
            <span
              className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium',
                accent.bg,
                accent.text
              )}
            >
              <Zap className="w-3 h-3" />
              {level.minSteps}步
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-iron/10 text-iron-light">
              未设定
            </span>
          )}
        </div>
      </div>

      <div className="px-4 pb-3 space-y-2">
        <div className="flex items-center justify-between">
          {record?.completed ? (
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald" />
              <RatingBadge rating={record.rating} />
              <span className="text-[10px] text-iron/60">最佳 {record.bestSteps} 步</span>
            </div>
          ) : (
            <span className="text-xs text-iron/50 font-body">未通关</span>
          )}
        </div>
        <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-iron/20">
          <button
            onClick={onPlay}
            title="试玩"
            className="flex items-center justify-center gap-1 py-1.5 rounded-md text-xs font-medium bg-emerald/15 text-emerald border border-emerald/30 hover:bg-emerald/25 transition-colors"
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">试玩</span>
          </button>
          <button
            onClick={onEdit}
            title="继续编辑"
            className="flex items-center justify-center gap-1 py-1.5 rounded-md text-xs font-medium bg-copper/15 text-copper border border-copper/30 hover:bg-copper/25 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">编辑</span>
          </button>
          <button
            onClick={onShare}
            title="分享"
            className="flex items-center justify-center gap-1 py-1.5 rounded-md text-xs font-medium bg-sapphire/15 text-sapphire border border-sapphire/30 hover:bg-sapphire/25 transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">分享</span>
          </button>
          <button
            onClick={onDelete}
            title="删除"
            className="flex items-center justify-center gap-1 py-1.5 rounded-md text-xs font-medium bg-ruby/10 text-ruby border border-ruby/25 hover:bg-ruby/20 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">删除</span>
          </button>
        </div>
      </div>
    </motion.div>
  )
}

export default function Lobby() {
  const [activeCollection, setActiveCollection] = useState<LevelCollectionTab>('default')
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [shareToast, setShareToast] = useState<string | null>(null)

  const { levels, customLevels, isUnlocked, addCustomLevel, removeCustomLevel } = useLevelStore()
  const { getRecord, isFavorite, toggleFavorite } = useProgressStore()
  const { drafts, loadDraft, activeDraftId, saveDraft } = useEditorStore()
  const navigate = useNavigate()

  const filteredDefaultLevels = useMemo(() => {
    let result = levels
    if (activeTab !== 'all') {
      result = result.filter((l) => l.type === activeTab)
    }
    if (showFavoritesOnly) {
      result = result.filter((l) => isFavorite(l.id))
    }
    return result
  }, [levels, activeTab, showFavoritesOnly, isFavorite])

  const filteredCustomLevels = useMemo(() => {
    return activeTab === 'all'
      ? customLevels
      : customLevels.filter((l) => l.type === activeTab)
  }, [customLevels, activeTab])

  const handleCustomPlay = (level: Level) => {
    addCustomLevel(level)
    navigate(`/play/custom/${encodeLevel(level)}`)
  }

  const handleCustomEdit = (level: Level) => {
    const existing = drafts.find((d) => d.id === level.id)
    if (existing) {
      if (activeDraftId !== existing.id) {
        loadDraft(existing.id)
      }
      navigate('/editor')
      return
    }
    saveDraft(level.name || '未命名关卡')
    navigate('/editor')
  }

  const handleCustomShare = (level: Level) => {
    const code = encodeLevel(level)
    const url = getShareUrl(code)
    navigator.clipboard?.writeText(url).then(() => {
      setShareToast('✅ 分享链接已复制到剪贴板')
      setTimeout(() => setShareToast(null), 2200)
    }).catch(() => {
      setShareToast(`🔗 ${url}`)
      setTimeout(() => setShareToast(null), 4500)
    })
  }

  const handleCustomDelete = (id: string) => {
    removeCustomLevel(id)
    setDeleteConfirmId(null)
  }

  const handleShareFromDrafts = (draftId: string) => {
    const draft = drafts.find((d) => d.id === draftId)
    if (!draft) return
    const level: Level = {
      id: draft.id,
      name: draft.name,
      type: draft.type,
      difficulty: 1,
      minSteps: 1,
      gridWidth: draft.gridWidth,
      gridHeight: draft.gridHeight,
      hintCount: draft.hintCount,
      hints: draft.hints,
      components: draft.components,
      winConditions: draft.winConditions,
      isDefault: false,
    }
    handleCustomShare(level)
  }

  const combinedCustomLevels = useMemo(() => {
    const fromStore = new Map(customLevels.map((l) => [l.id, l]))
    const merged: Level[] = [...customLevels]
    for (const d of drafts) {
      if (fromStore.has(d.id)) continue
      merged.push({
        id: d.id,
        name: d.name,
        type: d.type,
        difficulty: 1,
        minSteps: 1,
        gridWidth: d.gridWidth,
        gridHeight: d.gridHeight,
        hintCount: d.hintCount,
        hints: d.hints,
        components: d.components,
        winConditions: d.winConditions,
        isDefault: false,
      })
    }
    return activeTab === 'all' ? merged : merged.filter((l) => l.type === activeTab)
  }, [customLevels, drafts, activeTab])

  return (
    <div className="relative min-h-screen font-body overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(`
<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'>
  <path d='M40 10 L46 20 L40 30 L34 20 Z' fill='%23c9a96e'/>
  <circle cx='40' cy='20' r='4' fill='none' stroke='%23c9a96e' stroke-width='1'/>
  <path d='M40 50 L46 60 L40 70 L34 60 Z' fill='%23c9a96e'/>
  <circle cx='40' cy='60' r='4' fill='none' stroke='%23c9a96e' stroke-width='1'/>
  <path d='M10 40 L20 34 L30 40 L20 46 Z' fill='%23c9a96e'/>
  <circle cx='20' cy='40' r='4' fill='none' stroke='%23c9a96e' stroke-width='1'/>
  <path d='M50 40 L60 34 L70 40 L60 46 Z' fill='%23c9a96e'/>
  <circle cx='60' cy='40' r='4' fill='none' stroke='%23c9a96e' stroke-width='1'/>
  <circle cx='40' cy='40' r='6' fill='none' stroke='%234a4a5a' stroke-width='0.5'/>
</svg>`)}")`,
          backgroundRepeat: 'repeat',
        }}
      />

      <div className="relative z-10">
        <header className="sticky top-0 z-30 panel-dark border-b border-iron/30 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Wrench className="w-6 h-6 text-copper animate-spin-slow" />
              <h1 className="font-display text-xl sm:text-2xl font-bold text-copper text-glow-copper tracking-wider">
                机关谜题
              </h1>
            </div>
            <nav className="flex items-center gap-2">
              <Link
                to="/editor"
                className="btn-ghost text-sm flex items-center gap-1.5 !py-1.5 !px-3"
              >
                <Wrench className="w-4 h-4" />
                <span className="hidden sm:inline">编辑器</span>
              </Link>
              <Link
                to="/achievements"
                className="btn-ghost text-sm flex items-center gap-1.5 !py-1.5 !px-3"
              >
                <Trophy className="w-4 h-4" />
                <span className="hidden sm:inline">成就</span>
              </Link>
            </nav>
          </div>
        </header>

        <div className="px-4 sm:px-6 lg:px-8 pt-4">
          <div className="flex items-center gap-2 border-b border-iron/20 pb-2">
            {COLLECTION_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveCollection(tab.key)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-all duration-200 border-b-2 -mb-[1px]',
                  activeCollection === tab.key
                    ? 'text-copper border-copper bg-copper/10'
                    : 'text-iron-light border-transparent hover:text-copper-light hover:bg-iron/5'
                )}
              >
                {tab.icon}
                {tab.label}
                <span className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded-full',
                  activeCollection === tab.key ? 'bg-copper/20 text-copper' : 'bg-iron/15 text-iron/70'
                )}>
                  {tab.key === 'default' ? levels.length : combinedCustomLevels.length}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap items-center gap-2">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
                  activeTab === tab.key
                    ? 'bg-copper/20 text-copper border border-copper/40'
                    : 'text-iron-light hover:text-copper-light hover:bg-iron/10 border border-transparent'
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
            {activeCollection === 'default' && (
              <div className="ml-auto">
                <button
                  onClick={() => setShowFavoritesOnly((v) => !v)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border',
                    showFavoritesOnly
                      ? 'bg-ruby/15 text-ruby border-ruby/40'
                      : 'text-iron-light hover:text-ruby/80 hover:bg-iron/10 border-transparent'
                  )}
                >
                  <Star
                    className={cn(
                      'w-4 h-4',
                      showFavoritesOnly && 'fill-ruby'
                    )}
                  />
                  收藏
                </button>
              </div>
            )}
          </div>
        </div>

        <main className="px-4 sm:px-6 lg:px-8 pb-12">
          <AnimatePresence mode="wait">
            {activeCollection === 'default' ? (
              filteredDefaultLevels.length === 0 ? (
                <motion.div
                  key="empty-default"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-20 text-iron/50"
                >
                  <Filter className="w-12 h-12 mb-3" />
                  <p className="font-body text-lg">没有找到匹配的默认关卡</p>
                </motion.div>
              ) : (
                <motion.div
                  key="default-grid"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
                >
                  {filteredDefaultLevels.map((level, idx) => (
                    <DefaultLevelCard
                      key={level.id}
                      level={level}
                      isUnlocked={isUnlocked(level.id)}
                      record={getRecord(level.id)}
                      isFavorite={isFavorite(level.id)}
                      onToggleFavorite={() => toggleFavorite(level.id)}
                      index={idx}
                    />
                  ))}
                </motion.div>
              )
            ) : combinedCustomLevels.length === 0 ? (
              <motion.div
                key="empty-custom"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-20 text-iron/50"
              >
                <Wrench className="w-14 h-14 mb-4 opacity-40" />
                <p className="font-body text-lg mb-2 text-iron-light">还没有自定义关卡</p>
                <p className="font-body text-sm text-iron/60 mb-6">打开编辑器创作你的第一关，或从分享链接导入</p>
                <button
                  onClick={() => navigate('/editor')}
                  className="btn-primary !py-2 !px-6 text-sm flex items-center gap-2"
                >
                  <Wrench className="w-4 h-4" />
                  打开编辑器
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="custom-grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
              >
                {combinedCustomLevels.map((level, idx) => (
                  <div key={level.id} className="relative">
                    <CustomLevelCard
                      level={level}
                      record={getRecord(level.id)}
                      index={idx}
                      onPlay={() => handleCustomPlay(level)}
                      onEdit={() => handleCustomEdit(level)}
                      onShare={() => handleCustomShare(level)}
                      onDelete={() => setDeleteConfirmId(level.id)}
                    />
                    {deleteConfirmId === level.id && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-30 rounded-xl bg-base-dark/85 backdrop-blur-sm flex flex-col items-center justify-center gap-3 p-4"
                      >
                        <p className="text-sm text-copper-light font-medium text-center">确定删除这个自定义关卡？<br/>此操作不可恢复</p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="btn-ghost !py-1.5 !px-4 text-xs"
                          >
                            取消
                          </button>
                          <button
                            onClick={() => handleCustomDelete(level.id)}
                            className="px-4 py-1.5 rounded-md text-xs font-medium bg-ruby/25 text-ruby border border-ruby/40 hover:bg-ruby/35 transition-colors"
                          >
                            确认删除
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {shareToast && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-lg panel-dark border border-copper/30 text-sm text-copper-light max-w-[90vw] break-all shadow-2xl"
        >
          {shareToast}
        </motion.div>
      )}
    </div>
  )
}
