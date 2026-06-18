'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

export default function Legend({ routeFound }) {
    const [collapsed, setCollapsed] = useState(false)

    const items = [
        { color: '#39ff14', label: 'Visited', type: 'dot' },
        { color: '#f5c842', label: 'Active', type: 'dot' },
        { color: '#ff4d4d', label: 'Current', type: 'dot' },
        { color: '#00cfff', label: 'Route', type: 'line', hidden: !routeFound },
        { color: 'rgba(255,255,255,0.15)', label: 'Unvisited', type: 'dot', noGlow: true },
    ]

    return (
        <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4, duration: 0.4 }} className="absolute top-3 right-2 lg:bottom-24 lg:right-3 z-10 sm:bottom-6 sm:right-4">
            <div className="glass-panel rounded-sm lg:rounded-xl" style={{ background: 'rgba(6,8,6,0.23)', backdropFilter: 'blur(20px)', boxShadow: '0 0 20px rgba(0,0,0,0.6)', padding: "10px" }}>
                <button onClick={() => setCollapsed(!collapsed)} className="flex items-center justify-between w-full px-3 py-2 sm:cursor-default" style={{ color: 'var(--text-tertiary)' }}>
                    <span className="text-[9px] sm:text-[12px] uppercase tracking-[0.15em] font-medium" >
                        Legend
                    </span>
                    <motion.div animate={{ rotate: collapsed ? 180 : 0 }} className="sm:hidden">
                        <ChevronDown size={12} />
                    </motion.div>
                </button>

                <AnimatePresence initial={false}>
                    {!collapsed && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                            <div className="flex flex-col gap-1.5 px-3 pb-2.5">
                                {items?.filter(i => !i.hidden).map((item) => (
                                    <motion.div key={item?.label} initial={item?.label === 'Route' ? { opacity: 0, x: 6 } : false} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2.5">
                                        <div style={{ width: item?.type === 'line' ? 16 : 8, height: item?.type === 'line' ? 3 : 8, borderRadius: item?.type === 'line' ? 2 : '50%', background: item?.color, boxShadow: item?.noGlow ? 'none' : `0 0 8px ${item?.color}88`, flexShrink: 0, }} />
                                        <span className="text-[10px] sm:text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                                            {item?.label}
                                        </span>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    )
}