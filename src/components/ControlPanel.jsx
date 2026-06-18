'use client'
import { motion } from 'framer-motion'
import { Play, Pause, RotateCcw, Zap, ArrowRight } from 'lucide-react'
import { useVisualizerStore } from '@/store/visualizerStore'
import LocationSearch from './Locationsearch'

const ALGORITHMS = [
    { value: 'dfs', label: 'DFS', color: '#39ff14', desc: 'Depth-first' },
    { value: 'bfs', label: 'BFS', color: '#00cfff', desc: 'Breadth-first' },
    { value: 'dijkstra', label: 'Dijkstra', color: '#f5c842', desc: 'Shortest path' },
    { value: 'astar', label: 'A*', color: '#ff7f50', desc: 'Heuristic' },
]

export default function ControlPanel({ onRun, onPause, onReset, onFromSelect, onToSelect, isLoading, mapboxToken, routeFound, routeDistanceKm, }) {
    const { algorithm, setAlgorithm, speed, setSpeed, isRunning, isPaused } = useVisualizerStore()
    const activeAlgo = ALGORITHMS.find(a => a.value === algorithm)
    const algoColor = activeAlgo?.color || '#39ff14'

    return (
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="absolute bottom-10 left-0 lg:left-3 z-10 w-full max-w-xl lg:px-4">
            <div className="rounded-2xl" style={{ background: 'rgba(6,8,6,0.23)', backdropFilter: 'blur(20px)', boxShadow: `0 0 20px ${algoColor}10`, padding: '16px' }}>
                <div className="flex gap-1.5" style={{ marginBottom: '16px' }}>
                    {ALGORITHMS?.map((algo) => {
                        const active = algorithm === algo?.value
                        return (
                            <button key={algo?.value} onClick={() => setAlgorithm(algo?.value)} className="flex-1 py-1.5 px-2 rounded-lg transition-all duration-200" style={{ background: active ? `${algo?.color}18` : 'transparent', border: `0.5px solid ${active ? algo?.color + '60' : 'rgba(255,255,255,0.07)'}`, color: active ? algo?.color : 'rgba(255,255,255,0.35)', cursor: 'pointer', }}>
                                <div className="font-semibold text-sm">{algo?.label}</div>
                                <div className="text-[10px] opacity-60">{algo?.desc}</div>
                            </button>
                        )
                    })}
                </div>

                <div className="flex flex-col gap-1.5 mb-3">
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold" style={{ background: '#39ff1422', border: '1px solid #39ff1466', color: '#39ff14' }}>A</div>
                        <LocationSearch placeholder="From — origin location" onSelect={onFromSelect} mapboxToken={mapboxToken} color="#39ff14" />
                    </div>
                    <div className="flex items-center gap-2" style={{ marginLeft: '8px' }}>
                        <div className="w-3 border-l-2 border-dashed h-4" style={{ borderColor: 'rgba(255,255,255,0.12)' }} />
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold" style={{ background: '#ff7f5022', border: '1px solid #ff7f5066', color: '#ff7f50' }}>B</div>
                        <LocationSearch placeholder="To — destination location" onSelect={onToSelect} mapboxToken={mapboxToken} color="#ff7f50" />
                    </div>
                </div>

                {routeFound && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mb-3 px-3 py-2 rounded-lg flex items-center gap-2" style={{ background: 'rgba(0,207,255,0.1)', border: '0.5px solid rgba(0,207,255,0.3)', padding: "10px", marginTop: '16px' }}>
                        <span style={{ color: '#00cfff', fontSize: 13 }}>✓</span>
                        <span className="text-xs" style={{ color: '#00cfff' }}>
                            Route found! <strong>{routeDistanceKm?.toFixed(2)} km</strong>
                        </span>
                        <div className="ml-auto flex items-center gap-1">
                            <div className="w-8 h-1 rounded-full" style={{ background: '#00cfff' }} />
                            <ArrowRight size={10} style={{ color: '#00cfff' }} />
                        </div>
                    </motion.div>
                )}

                <div className="grid grid-cols-2 gap-2" style={{ marginTop: '16px' }}>
                    <div className="w-full flex items-center gap-2 shrink-0">
                        <Zap size={12} style={{ color: 'rgba(255,255,255,0.25)' }} />
                        <input type="range" min={1} max={1000000} step={1} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} style={{ accentColor: algoColor }} />
                        <span className="text-[11px] w-3" style={{ color: 'rgba(255,255,255,0.3)' }}>{speed}</span>
                    </div>
                    <div className="wfull flex items-center gap-2">
                        <button onClick={isRunning && !isPaused ? onPause : onRun} disabled={isLoading} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all" style={{ background: isLoading ? 'rgba(255,255,255,0.04)' : `${algoColor}18`, border: `0.5px solid ${isLoading ? 'rgba(255,255,255,0.08)' : algoColor + '44'}`, color: isLoading ? 'rgba(255,255,255,0.2)' : algoColor, cursor: isLoading ? 'not-allowed' : 'pointer', padding: " 6px", }}>
                            {isLoading ? (
                                <>
                                    <motion.div className="w-3 h-3 rounded-full border border-current border-t-transparent" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
                                    Loading…
                                </>
                            ) : isRunning && !isPaused ? (
                                <><Pause size={14} /> Pause</>
                            ) : (
                                <><Play size={14} /> {isPaused ? 'Resume' : 'Find Route'}</>
                            )}
                        </button>
                        <button onClick={onReset} className="px-3 py-2 rounded-xl transition-all" style={{ background: 'transparent', border: '0.5px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.35)', cursor: 'pointer' }}>
                            <RotateCcw size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    )
}