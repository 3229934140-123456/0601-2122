import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Trophy, Star, Flame, Compass, Box, Cpu, Palette } from 'lucide-react'
import { useProgressStore } from '@/store/progressStore'
import { useLevelStore } from '@/store/levelStore'
import type { ComponentType, Rating } from '@/types'

const TYPE_CONFIG: Record<string, { label: string; icon: typeof Compass; color: string; glow: string }> = {
  mirror: { label: '镜射', icon: Compass, color: 'text-amber', glow: 'glow-amber' },
  block: { label: '推箱', icon: Box, color: 'text-sapphire', glow: 'glow-sapphire' },
  circuit: { label: '电路', icon: Cpu, color: 'text-emerald', glow: 'glow-emerald' },
  color_gate: { label: '色门', icon: Palette, color: 'text-ruby', glow: '' },
}

const RATING_CONFIG: Record<Rating, { color: string; glow: string }> = {
  S: { color: 'text-emerald border-emerald', glow: 'glow-emerald' },
  A: { color: 'text-copper border-copper', glow: 'glow-copper' },
  B: { color: 'text-iron-light border-iron-light', glow: '' },
  C: { color: 'text-iron border-iron', glow: '' },
}

const TYPE_LEVELS = ['mirror', 'block', 'circuit', 'color_gate'] as const

function getMostCommonRating(records: Record<string, { rating: Rating; completed: boolean }>): Rating | null {
  const counts: Record<Rating, number> = { S: 0, A: 0, B: 0, C: 0 }
  for (const r of Object.values(records)) {
    if (r.completed) counts[r.rating]++
  }
  let maxCount = 0
  let result: Rating | null = null
  for (const [rating, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count
      result = rating as Rating
    }
  }
  return maxCount > 0 ? result : null
}

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return minutes > 0 ? `${minutes}分${secs}秒` : `${secs}秒`
}

function formatDate(iso: string | null): string {
  if (!iso) return '-'
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.45, ease: 'easeOut' },
  }),
}

export default function Achievements() {
  const navigate = useNavigate()
  const { records, progress } = useProgressStore()
  const { levels } = useLevelStore()

  const hasRecords = Object.keys(records).length > 0

  const mostCommonRating = useMemo(() => getMostCommonRating(records), [records])

  const typeStats = useMemo(() => {
    const stats: Record<string, { total: number; completed: number }> = {}
    for (const t of TYPE_LEVELS) {
      stats[t] = { total: 0, completed: 0 }
    }
    for (const level of levels) {
      const t = level.type as string
      if (stats[t]) {
        stats[t].total++
        const rec = records[level.id]
        if (rec?.completed) stats[t].completed++
      }
    }
    return stats
  }, [levels, records])

  const maxCompleted = useMemo(
    () => Math.max(...Object.values(typeStats).map((s) => s.completed), 1),
    [typeStats],
  )

  const tableRows = useMemo(() => {
    return levels.map((level) => {
      const record = records[level.id]
      const typeCfg = TYPE_CONFIG[level.type] ?? TYPE_CONFIG.mirror
      return { level, record, typeCfg }
    })
  }, [levels, records])

  return (
    <div className="min-h-screen bg-base font-body text-[#e0dcd0]">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-8 flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="btn-ghost flex items-center gap-1.5 text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            返回大厅
          </button>
          <h1 className="font-display text-2xl font-bold text-copper text-glow-copper sm:text-3xl">
            成绩档案
          </h1>
        </header>

        {!hasRecords ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center justify-center gap-4 py-24"
          >
            <Trophy className="h-16 w-16 text-iron" />
            <p className="text-lg text-iron-light">尚无通关记录</p>
            <p className="text-sm text-iron">开始挑战关卡，你的成绩将记录在此</p>
            <button onClick={() => navigate('/')} className="btn-copper mt-2">
              前往关卡
            </button>
          </motion.div>
        ) : (
          <>
            <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                {
                  label: '总通关数',
                  value: progress.totalSolved,
                  icon: Trophy,
                  glow: 'glow-emerald',
                  borderColor: 'border-emerald/50',
                },
                {
                  label: '常见评级',
                  value: mostCommonRating ?? '-',
                  icon: Star,
                  glow: 'glow-copper',
                  borderColor: 'border-copper/50',
                },
                {
                  label: '连续天数',
                  value: progress.streakDays,
                  icon: Flame,
                  glow: 'glow-amber',
                  borderColor: 'border-amber/50',
                },
              ].map((card, i) => (
                <motion.div
                  key={card.label}
                  custom={i}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  className={`card-mech flex items-center gap-4 border ${card.borderColor} ${card.glow} p-5`}
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-base-dark/60">
                    <card.icon className="h-6 w-6 text-copper-light" />
                  </div>
                  <div>
                    <p className="text-xs text-iron-light">{card.label}</p>
                    <p className="font-display text-2xl font-bold text-[#e0dcd0]">{card.value}</p>
                  </div>
                </motion.div>
              ))}
            </section>

            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.45 }}
              className="mb-8"
            >
              <h2 className="mb-4 font-display text-lg font-semibold text-copper">关卡记录</h2>
              <div className="overflow-x-auto rounded-xl border border-iron/30 bg-base-light">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-iron/30 text-left text-xs text-iron-light">
                      <th className="px-4 py-3 font-medium">关卡名</th>
                      <th className="px-4 py-3 font-medium">类型</th>
                      <th className="px-4 py-3 font-medium">最少步数</th>
                      <th className="px-4 py-3 font-medium">最佳步数</th>
                      <th className="px-4 py-3 font-medium">最佳时间</th>
                      <th className="px-4 py-3 font-medium">评级</th>
                      <th className="px-4 py-3 font-medium">完成日期</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map(({ level, record, typeCfg }) => {
                      const TypeIcon = typeCfg.icon
                      return (
                        <tr
                          key={level.id}
                          className="border-b border-iron/10 transition-colors hover:bg-base-dark/40"
                        >
                          <td className="px-4 py-3 font-medium">{level.name}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 ${typeCfg.color}`}>
                              <TypeIcon className="h-4 w-4" />
                              {typeCfg.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-iron-light">{level.minSteps}</td>
                          <td className="px-4 py-3">
                            {record?.completed ? (
                              <span className="text-copper-light">{record.bestSteps}</span>
                            ) : (
                              <span className="text-iron">未完成</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {record?.completed ? (
                              <span className="text-copper-light">{formatTime(record.bestTime)}</span>
                            ) : (
                              <span className="text-iron">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {record?.completed ? (
                              <span
                                className={`inline-block rounded-md border px-2 py-0.5 text-xs font-bold ${RATING_CONFIG[record.rating].color} ${RATING_CONFIG[record.rating].glow}`}
                              >
                                {record.rating}
                              </span>
                            ) : (
                              <span className="text-iron">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-iron-light">
                            {record?.completed ? formatDate(record.completedAt) : '-'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.45 }}
            >
              <h2 className="mb-4 font-display text-lg font-semibold text-copper">完成统计</h2>
              <div className="card-mech p-6">
                <div className="flex items-end justify-around gap-6" style={{ height: 200 }}>
                  {TYPE_LEVELS.map((t) => {
                    const cfg = TYPE_CONFIG[t]
                    const stat = typeStats[t]
                    const barHeight = stat.total > 0 ? (stat.completed / maxCompleted) * 160 : 0
                    const barColorMap: Record<string, string> = {
                      mirror: 'bg-amber',
                      block: 'bg-sapphire',
                      circuit: 'bg-emerald',
                      color_gate: 'bg-ruby',
                    }
                    return (
                      <div key={t} className="flex flex-1 flex-col items-center gap-2">
                        <span className="text-sm font-bold text-[#e0dcd0]">{stat.completed}</span>
                        <div
                          className="w-full max-w-[56px] rounded-t-md transition-all duration-500"
                          style={{
                            height: barHeight,
                            backgroundColor: undefined,
                          }}
                        >
                          <div className={`h-full w-full rounded-t-md ${barColorMap[t]}`} />
                        </div>
                        <span className={`flex items-center gap-1 text-xs ${cfg.color}`}>
                          <cfg.icon className="h-3.5 w-3.5" />
                          {cfg.label}
                        </span>
                        <span className="text-[10px] text-iron">
                          {stat.completed}/{stat.total}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </motion.section>
          </>
        )}
      </div>
    </div>
  )
}
