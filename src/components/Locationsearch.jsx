'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, X, Loader } from 'lucide-react'
import { geocodeLocation } from '@/lib/osmFetcher'
import { motion, AnimatePresence } from 'framer-motion'

export default function LocationSearch({ placeholder, onSelect, mapboxToken, color = '#39ff14' }) {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState([])
    const [loading, setLoading] = useState(false)
    const [open, setOpen] = useState(false)
    const debounceRef = useRef(null)
    const inputRef = useRef(null)
    const containerRef = useRef(null)
    const isPickingRef = useRef(false)

    useEffect(() => {
        const handler = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur() } }
        document.addEventListener('keydown', handler)
        return () => document.removeEventListener('keydown', handler)
    }, [])

    useEffect(() => {
        if (isPickingRef.current) { isPickingRef.current = false; return }
        if (query.length < 2) { setResults([]); setOpen(false); return }
        clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(async () => {
            setLoading(true)
            try {
                const hits = await geocodeLocation(query, mapboxToken)
                setResults(hits)
                setOpen(hits.length > 0)
            } catch {
                setResults([])
            } finally {
                setLoading(false)
            }
        }, 350)
        return () => clearTimeout(debounceRef.current)
    }, [query, mapboxToken])

    const handleSelect = useCallback((r) => {
        isPickingRef.current = true
        setQuery(r.label)
        setOpen(false)
        setResults([])
        onSelect(r)
    }, [onSelect])

    const handleClear = useCallback(() => {
        isPickingRef.current = true
        setQuery('')
        setResults([])
        setOpen(false)
        onSelect(null)
        inputRef.current?.focus()
    }, [onSelect])

    return (
        <div ref={containerRef} className="relative w-full">
            <div className="flex items-center gap-2 rounded-xl transition-all duration-200" style={{ background: 'rgba(255,255,255,0.04)', padding: '10px', border: `1px solid ${open ? color + '44' : query ? color + '22' : 'rgba(255,255,255,0.1)'}`, boxShadow: open ? `0 0 16px ${color}10` : 'none', }}>
                {loading
                    ? <Loader size={14} className="animate-spin shrink-0" style={{ color: 'rgba(255,255,255,0.35)' }} />
                    : <Search size={14} className="shrink-0" style={{ color: query ? color : 'rgba(255,255,255,0.35)' }} />
                }
                <input ref={inputRef} type="text" value={query} onChange={(e) => setQuery(e.target.value)} onFocus={() => { if (results.length > 0) setOpen(true) }} placeholder={placeholder} className="flex-1 bg-transparent text-sm outline-none" style={{ color: 'rgba(255,255,255,0.85)', caretColor: color }} />
                {query && (
                    <button onClick={handleClear} className="p-0.5 rounded-md hover:bg-white/10 transition-colors">
                        <X size={13} style={{ color: 'rgba(255,255,255,0.35)' }} />
                    </button>
                )}
            </div>

            <AnimatePresence>
                {open && results.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }} transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }} className="absolute bottom-full mb-2 w-full rounded-xl overflow-hidden z-50" style={{ background: 'rgba(8,12,8,0.98)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 12px 40px rgba(0,0,0,0.8)', }}>
                        <div className="max-h-60 overflow-y-auto">
                            {results?.map((r, i) => (
                                <button
                                    key={i} onClick={() => handleSelect(r)} className="w-full text-left text-sm flex items-center gap-2.5 transition-all duration-150"
                                    style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.65)', borderBottom: i < results.length - 1 ? '0.5px solid rgba(255,255,255,0.05)' : 'none', background: 'transparent', }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = `${color}0d`; e.currentTarget.style.color = '#fff' }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.65)' }}
                                >
                                    <span style={{ color, fontSize: 8, flexShrink: 0, filter: `drop-shadow(0 0 3px ${color})` }}>●</span>
                                    <span className="truncate">{r.label}</span>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}