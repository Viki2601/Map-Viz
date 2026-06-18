'use client'
import { motion } from 'framer-motion'
import { useVisualizerStore } from '@/store/visualizerStore'

const ALGO_META = {
    dfs: { label: 'DFS', desc: 'Depth-First Search', color: '#39ff14' },
    bfs: { label: 'BFS', desc: 'Breadth-First Search', color: '#00cfff' },
    dijkstra: { label: 'Dijkstra', desc: 'Shortest Path', color: '#f5c842' },
    astar: { label: 'A*', desc: 'Heuristic Search', color: '#ff7f50' },
}

export default function HUD() {
    const { algorithm, nodesExplored, edgesTraversed, distanceKm, isRunning } = useVisualizerStore()
    const meta = ALGO_META[algorithm] || ALGO_meta?.dfs

    return (
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }} className="absolute top-3 left-3 z-10 sm:top-4 sm:left-4">
            <div className="glass-panel rounded-2xl px-3 py-2.5 sm:px-5 sm:py-3" style={{ background: 'rgba(6,8,6,0.23)', backdropFilter: 'blur(20px)', boxShadow: `0 0 30px ${meta?.color}10`, padding: "10px" }}>
                <div className="flex items-center gap-6">
                    <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.15em] font-medium" style={{ color: 'var(--text-tertiary)' }}>Algorithm</span>
                        <div className="flex items-center gap-2">
                            <span className="text-base sm:text-lg font-bold tracking-tight" style={{ color: meta?.color }}>{meta?.label}</span>
                            {isRunning && (
                                <motion.div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full" style={{ background: `${meta?.color}15`, border: `1px solid ${meta?.color}30` }} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
                                    <motion.div className="w-1.5 h-1.5 rounded-full" style={{ background: meta?.color }} animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1, repeat: Infinity }} />
                                    <span className="text-[8px] sm:text-[9px] uppercase font-semibold tracking-wider" style={{ color: `${meta?.color}cc` }}>Live</span>
                                </motion.div>
                            )}
                        </div>
                        <span className="text-[9px] sm:text-[10px] hidden sm:block" style={{ color: `${meta?.color}88` }}>{meta?.desc}</span>
                    </div>

                    <div className="w-px h-8 sm:h-10 hidden sm:block" style={{ background: 'var(--border-subtle)' }} />

                    <div className="grid grid-cols-3 gap-3 sm:gap-5">
                        <StatItem label="Nodes" value={nodesExplored} color={meta?.color} />
                        <StatItem label="Edges" value={edgesTraversed} color="#f5c842" />
                        <StatItem label="Distance" value={distanceKm > 0 ? `${distanceKm.toFixed(2)}` : '—'} suffix={distanceKm > 0 ? 'km' : ''} color="var(--text-secondary)" />
                    </div>
                </div>
            </div>
        </motion.div>
    )
}

function StatItem({ label, value, suffix, color }) {
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.15em] font-medium" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
            <div className="flex items-baseline gap-0.5">
                <motion.span key={String(value)} initial={{ scale: 1.15, opacity: 0.7 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.2 }} className="text-base sm:text-xl font-semibold font-mono tabular-nums" style={{ color }}>
                    {typeof value === 'number' ? value.toLocaleString() : value}
                </motion.span>
                {suffix && (
                    <span className="text-[9px] sm:text-[10px] font-medium" style={{ color: 'var(--text-tertiary)' }}>
                        {suffix}
                    </span>
                )}
            </div>
        </div>
    )
}