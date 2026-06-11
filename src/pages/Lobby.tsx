import { useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLevelStore } from '@/store/levelStore'
import { useProgressStore } from '@/store/progressStore'
import type { ComponentType, Level, Rating } from '@/types'

type FilterTab = 'all' | ComponentType

const TABS: { key: FilterTab; label: string; icon: React.ReactNode }[] = [
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

function LevelCard({
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
            {TABS.find((t) => t.key === level.type)?.label ?? level.type}
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

export default function Lobby() {
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)

  const { levels, isUnlocked } = useLevelStore()
  const { getRecord, isFavorite, toggleFavorite } = useProgressStore()

  const filteredLevels = useMemo(() => {
    let result = levels
    if (activeTab !== 'all') {
      result = result.filter((l) => l.type === activeTab)
    }
    if (showFavoritesOnly) {
      result = result.filter((l) => isFavorite(l.id))
    }
    return result
  }, [levels, activeTab, showFavoritesOnly, isFavorite])

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

        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap items-center gap-2">
            {TABS.map((tab) => (
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
          </div>
        </div>

        <main className="px-4 sm:px-6 lg:px-8 pb-12">
          {filteredLevels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-iron/50">
              <Filter className="w-12 h-12 mb-3" />
              <p className="font-body text-lg">没有找到匹配的关卡</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredLevels.map((level, idx) => (
                <LevelCard
                  key={level.id}
                  level={level}
                  isUnlocked={isUnlocked(level.id)}
                  record={getRecord(level.id)}
                  isFavorite={isFavorite(level.id)}
                  onToggleFavorite={() => toggleFavorite(level.id)}
                  index={idx}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
