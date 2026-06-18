'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useVisualizerStore } from '@/store/visualizerStore'
import { buildGraphFromOSM, findNearestNode } from '@/lib/graphBuilder'
import { createAlgorithmGenerator, reconstructPath } from '@/lib/algorithms'
import { fetchOSMRoads, centerToBbox, mergeBboxes, CITY_PRESETS } from '@/lib/osmFetcher'
import HUD from '@/components/HUD'
import ControlPanel from '@/components/ControlPanel'
import Legend from '@/components/Legend'

const MapVisualizer = dynamic(() => import('@/components/MapVisualizer'), { ssr: false })
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

function getTimingConfig(speed) {
  const t = Math.log10(Math.max(speed, 1)) / Math.log10(1_000_000)

  if (t < 0.15) return { steps: 1, delay: 700, pulseRatio: 0.55 }
  if (t < 0.30) return { steps: 1, delay: 400, pulseRatio: 0.50 }
  if (t < 0.45) return { steps: 1, delay: 200, pulseRatio: 0.45 }
  if (t < 0.55) return { steps: 2, delay: 120, pulseRatio: 0.40 }
  if (t < 0.65) return { steps: 3, delay: 70, pulseRatio: 0.35 }
  if (t < 0.75) return { steps: 5, delay: 40, pulseRatio: 0.30 }
  if (t < 0.85) return { steps: 10, delay: 20, pulseRatio: 0.25 }
  if (t < 0.92) return { steps: 25, delay: 8, pulseRatio: 0.20 }
  if (t < 0.97) return { steps: 80, delay: 0, pulseRatio: 0 }
  return { steps: 300, delay: 0, pulseRatio: 0 }
}

export default function Home() {
  const [graph, setGraph] = useState(null)
  const [center, setCenter] = useState([80.25, 13.06])

  const [fromLocation, setFromLocation] = useState(null)
  const [toLocation, setToLocation] = useState(null)
  const [fromNodeId, setFromNodeId] = useState(null)
  const [toNodeId, setToNodeId] = useState(null)

  const [pathEdges, setPathEdges] = useState([])
  const [routeFound, setRouteFound] = useState(false)
  const [routeDistKm, setRouteDistKm] = useState(0)

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const generatorRef = useRef(null)
  const rafRef = useRef(null)
  const timerRef = useRef(null)
  const isPausedRef = useRef(false)
  const isRunningRef = useRef(false)

  const fromNodeIdRef = useRef(null)
  const toNodeIdRef = useRef(null)
  useEffect(() => { fromNodeIdRef.current = fromNodeId }, [fromNodeId])
  useEffect(() => { toNodeIdRef.current = toNodeId }, [toNodeId])

  const store = useVisualizerStore()
  const speedRef = useRef(store.speed)
  useEffect(() => { speedRef.current = store.speed }, [store.speed])

  const cancelAnimation = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    isRunningRef.current = false
  }, [])

  const loadGraph = useCallback(async (bbox, newCenter) => {
    cancelAnimation()
    setIsLoading(true)
    setError(null)
    store.reset()
    setPathEdges([])
    setRouteFound(false)
    generatorRef.current = null

    try {
      const osmData = await fetchOSMRoads(bbox)
      const g = buildGraphFromOSM(osmData)
      if (g.nodes.size === 0) throw new Error('No roads found in this area.')
      setGraph(g)
      setCenter(newCenter)
      return g
    } catch (e) {
      setError(e.message || 'Failed to load road data.')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [cancelAnimation, store])

  useEffect(() => {
    const preset = CITY_PRESETS.chennai
    loadGraph(preset.bbox, preset.center)
  }, [])

  const handleFromSelect = useCallback(async (result) => {
    if (!result) { setFromLocation(null); setFromNodeId(null); return }
    setFromLocation(result)
    setPathEdges([]); setRouteFound(false)
    store.reset()

    const [lng, lat] = result.center
    const fromBbox = centerToBbox(lng, lat, 1.5)
    const bbox = toLocation ? mergeBboxes(fromBbox, centerToBbox(toLocation.center[0], toLocation.center[1], 1.5)) : fromBbox
    const g = await loadGraph(bbox, result.center)
    if (!g) return
    const nodeId = findNearestNode(g, lat, lng)
    setFromNodeId(nodeId)
    if (toLocation) {
      const tId = findNearestNode(g, toLocation.center[1], toLocation.center[0])
      setToNodeId(tId)
    }
  }, [toLocation, loadGraph, store])

  const handleToSelect = useCallback(async (result) => {
    if (!result) { setToLocation(null); setToNodeId(null); return }
    setToLocation(result)
    setPathEdges([]); setRouteFound(false)
    store.reset()

    const [lng, lat] = result.center
    const toBbox = centerToBbox(lng, lat, 1.5)
    const bbox = fromLocation ? mergeBboxes(centerToBbox(fromLocation.center[0], fromLocation.center[1], 1.5), toBbox) : toBbox
    const newCenter = fromLocation ? [(fromLocation.center[0] + lng) / 2, (fromLocation.center[1] + lat) / 2] : result.center
    const g = await loadGraph(bbox, newCenter)
    if (!g) return
    const nodeId = findNearestNode(g, lat, lng)
    setToNodeId(nodeId)
    if (fromLocation) {
      const fId = findNearestNode(g, fromLocation.center[1], fromLocation.center[0])
      setFromNodeId(fId)
    }
  }, [fromLocation, loadGraph, store])

  const runLoop = useCallback(() => {
    if (!generatorRef.current || isPausedRef.current || !isRunningRef.current) return
    const { steps, delay, pulseRatio } = getTimingConfig(speedRef.current)
    let found = false
    for (let i = 0; i < steps; i++) {
      if (!generatorRef.current) break
      const result = generatorRef.current.next()
      if (result.done || !result.value) {
        store.setRunning(false)
        isRunningRef.current = false
        store.clearActive()
        return
      }
      const s = result.value
      store.addVisitedNode(s.nodeId)
      store.addActiveNode(s.nodeId)
      if (s.edgeKey) { store.addVisitedEdge(s.edgeKey); store.addActiveEdge(s.edgeKey) }
      store.setStats(s.nodesExplored, s.edgesTraversed, s.distanceKm)
      if (s.found) {
        const startId = fromNodeIdRef.current
        const goalId = toNodeIdRef.current
        const path = reconstructPath(s.parent, startId ?? s.nodeId, goalId ?? s.nodeId)
        setPathEdges(path)
        setRouteFound(true)
        setRouteDistKm(s.distanceKm)
        store.setRunning(false)
        isRunningRef.current = false
        store.clearActive()
        found = true
        break
      }
    }

    if (found) return;
    if (delay > 0 && pulseRatio > 0) {
      const pulseMs = Math.round(delay * pulseRatio)
      const remainMs = delay - pulseMs

      timerRef.current = setTimeout(() => {
        store.clearActive()
        timerRef.current = setTimeout(() => { rafRef.current = requestAnimationFrame(runLoop) }, remainMs)
      }, pulseMs)
    } else {
      store.clearActive()
      rafRef.current = requestAnimationFrame(runLoop)
    }
  }, [store])

  const handleRun = useCallback(() => {
    if (!graph) return
    if (store.isPaused) {
      isPausedRef.current = false
      isRunningRef.current = true
      store.setPaused(false)
      store.setRunning(true)
      rafRef.current = requestAnimationFrame(runLoop)
      return
    }

    const startId = fromNodeId || findNearestNode(graph, center[1], center[0])
    const goalId = toNodeId || null
    if (!startId) return

    cancelAnimation()
    store.reset()
    setPathEdges([])
    setRouteFound(false)
    generatorRef.current = createAlgorithmGenerator(store.algorithm, graph, startId, goalId)
    isPausedRef.current = false
    isRunningRef.current = true
    store.setRunning(true)
    rafRef.current = requestAnimationFrame(runLoop)
  }, [graph, store, center, fromNodeId, toNodeId, cancelAnimation, runLoop])

  const handlePause = useCallback(() => {
    cancelAnimation()
    isPausedRef.current = true
    store.setPaused(true)
    store.setRunning(false)
  }, [cancelAnimation, store])

  const handleReset = useCallback(() => {
    cancelAnimation()
    isPausedRef.current = false
    generatorRef.current = null
    setPathEdges([])
    setRouteFound(false)
    store.reset()
  }, [cancelAnimation, store])

  return (
    <main className="relative w-screen h-screen overflow-hidden" style={{ background: '#060806' }}>
      <div className="absolute inset-0">
        <MapVisualizer graph={graph} center={center} mapboxToken={MAPBOX_TOKEN} pathEdges={pathEdges} fromCoord={fromLocation?.center} toCoord={toLocation?.center} />
      </div>

      <HUD />
      <Legend routeFound={routeFound} />
      <ControlPanel onRun={handleRun} onPause={handlePause} onReset={handleReset} onFromSelect={handleFromSelect} onToSelect={handleToSelect} isLoading={isLoading} mapboxToken={MAPBOX_TOKEN} fromLabel={fromLocation?.label} toLabel={toLocation?.label} routeFound={routeFound} routeDistanceKm={routeDistKm} />

      {error && (
        <div className="absolute top-4 right-4 z-20 rounded-lg text-sm max-w-xs" style={{ background: 'rgba(255,60,60,0.12)', border: '0.5px solid rgba(255,60,60,0.3)', padding: "10px", color: '#ff9999' }}>
          ⚠ {error}
        </div>
      )}

      {!MAPBOX_TOKEN && (
        <div className="absolute inset-0 flex items-center justify-center z-30" style={{ background: 'rgba(6,8,6,0.96)', padding: "20px" }}>
          <div className="text-center px-8 py-6 rounded-2xl max-w-sm" style={{ background: 'rgba(255,255,255,0.04)', padding: "20px", border: '0.5px solid rgba(255,255,255,0.12)' }}>
            <div className="text-3xl mb-3" style={{ padding: "10px" }}>🗺️</div>
            <p className="text-white font-semibold mb-2" style={{ padding: "10px" }}>Mapbox token required</p>
            <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.45)', padding: "10px" }}>
              Create <code className="text-amber-400">.env.local</code> in your project root:
            </p>
            <code className="block text-xs px-3 py-2.5 rounded-lg text-left" style={{ background: 'rgba(255,255,255,0.06)', padding: "10px", color: '#39ff14' }}>
              NEXT_PUBLIC_MAPBOX_TOKEN=pk.ey...
            </code>
            <p className="text-xs mt-3" style={{ color: 'rgba(255,255,255,0.3)', padding: "10px" }}>Free token → account.mapbox.com</p>
          </div>
        </div>
      )}
    </main>
  )
}