'use client'
import { useEffect, useRef, useCallback, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useVisualizerStore } from '@/store/visualizerStore'
import { edgeKey } from '@/lib/graphBuilder'

const COLORS = { edgeDefault: '#1a2a1a', edgeVisited: '#39ff14', edgeActive: '#f5c842', edgePath: '#00cfff', nodeDefault: 'rgba(255,255,255,0.08)', nodeVisited: '#39ff14', nodeActive: '#f5c842', nodeCurrent: '#ff4d4d', }

export default function MapVisualizer({ graph, center, mapboxToken, pathEdges, fromCoord, toCoord }) {
    const mapRef = useRef(null)
    const containerRef = useRef(null)
    const [mapReady, setMapReady] = useState(false)
    const [mapLoading, setMapLoading] = useState(true)

    const edgeFeaturesRef = useRef([])
    const nodeFeaturesRef = useRef([])
    const edgeIndexRef = useRef(new Map())
    const nodeIndexRef = useRef(new Map())

    const store = useVisualizerStore()

    // Init map once
    useEffect(() => {
        if (!containerRef.current || mapRef.current) return
        mapboxgl.accessToken = mapboxToken || process.env.NEXT_PUBLIC_MAPBOX_TOKEN
        const map = new mapboxgl.Map({
            container: containerRef.current, style: 'mapbox://styles/mapbox/dark-v11',
            center: center || [80.25, 13.06], zoom: 14, antialias: false, trackResize: true,
            fadeDuration: 0, preserveDrawingBuffer: false,
        })

        // Disable unnecessary controls for performance
        map.dragRotate.disable()
        map.touchZoomRotate.disableRotation()

        mapRef.current = map
        map.on('load', () => {
            setMapReady(true)
            setMapLoading(false)
        })
        return () => { map.remove(); mapRef.current = null; setMapReady(false) }
    }, [])

    // Fly to new center when location changes
    useEffect(() => {
        if (mapRef.current && mapReady && center) {
            mapRef.current.flyTo({ center, zoom: 14, duration: 1200, essential: true })
        }
    }, [center, mapReady])

    // Draw graph layers when graph loads — paint expressions use 'match' on 'status' property
    useEffect(() => {
        if (!mapReady || !graph || !mapRef.current) return
        const map = mapRef.current
            ;['path-line', 'path-glow', 'edges-glow', 'edges-core', 'nodes', 'markers'].forEach(id => {
                if (map.getLayer(id)) map.removeLayer(id)
            })
            ;['edges', 'nodes-src', 'path-src', 'markers-src'].forEach(id => {
                if (map.getSource(id)) map.removeSource(id)
            })

        const edgeFeatures = []
        const edgeIndex = new Map()
        const seenEdges = new Set()
        let ei = 0

        for (const [fromId, neighbors] of graph.edges) {
            for (const edge of neighbors) {
                const key = edgeKey(fromId, edge.to)
                if (seenEdges.has(key)) continue
                seenEdges.add(key)
                const a = graph.nodes.get(fromId)
                const b = graph.nodes.get(edge.to)
                if (!a || !b) continue
                edgeFeatures.push({ type: 'Feature', properties: { key, status: 'default' }, geometry: { type: 'LineString', coordinates: [[a.lng, a.lat], [b.lng, b.lat]] }, })
                edgeIndex.set(key, ei++)
            }
        }

        const nodeFeatures = []
        const nodeIndex = new Map()
        let ni = 0
        for (const [, node] of graph.nodes) {
            nodeFeatures.push({ type: 'Feature', properties: { id: node.id, status: 'default' }, geometry: { type: 'Point', coordinates: [node.lng, node.lat] }, })
            nodeIndex.set(node.id, ni++)
        }

        edgeFeaturesRef.current = edgeFeatures
        nodeFeaturesRef.current = nodeFeatures
        edgeIndexRef.current = edgeIndex
        nodeIndexRef.current = nodeIndex

        map.addSource('edges', { type: 'geojson', data: { type: 'FeatureCollection', features: edgeFeatures }, })
        map.addSource('nodes-src', { type: 'geojson', data: { type: 'FeatureCollection', features: nodeFeatures }, })
        map.addSource('path-src', { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, })
        map.addSource('markers-src', { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, })

        map.addLayer({
            id: 'edges-glow', type: 'line', source: 'edges',
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: {
                'line-color': ['match', ['get', 'status'], 'visited', COLORS.edgeVisited, 'active', COLORS.edgeActive, COLORS.edgeDefault,],
                'line-width': ['match', ['get', 'status'], 'visited', 5, 'active', 8, 0,],
                'line-blur': 4,
                'line-opacity': 0.5,
            }
        })

        map.addLayer({
            id: 'edges-core', type: 'line', source: 'edges',
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: {
                'line-color': ['match', ['get', 'status'], 'visited', COLORS.edgeVisited, 'active', COLORS.edgeActive, COLORS.edgeDefault,],
                'line-width': ['match', ['get', 'status'], 'visited', 1.5, 'active', 2.5, 0.8,],
            }
        })

        map.addLayer({
            id: 'nodes', type: 'circle', source: 'nodes-src',
            paint: {
                'circle-color': ['match', ['get', 'status'], 'visited', COLORS.nodeVisited, 'active', COLORS.nodeActive, 'current', COLORS.nodeCurrent, COLORS.nodeDefault,],
                'circle-radius': ['match', ['get', 'status'], 'visited', 3, 'active', 5, 'current', 6, 2,],
                'circle-opacity': ['match', ['get', 'status'], 'default', 0.4, 0.9,],
            }
        })

        map.addLayer({
            id: 'path-glow', type: 'line', source: 'path-src',
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: { 'line-color': COLORS.edgePath, 'line-width': 14, 'line-blur': 8, 'line-opacity': 0.35 }
        })
        map.addLayer({
            id: 'path-line', type: 'line', source: 'path-src',
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: { 'line-color': COLORS.edgePath, 'line-width': 3.5 }
        })

        map.addLayer({
            id: 'markers', type: 'circle', source: 'markers-src',
            paint: { 'circle-radius': 10, 'circle-color': ['case', ['==', ['get', 'type'], 'from'], '#39ff14', '#ff7f50'], 'circle-stroke-width': 2.5, 'circle-stroke-color': '#ffffff', 'circle-opacity': 0.95, }
        })
    }, [mapReady, graph])

    useEffect(() => {
        const map = mapRef.current
        if (!map || !map.getSource('path-src') || !graph) return

        if (!pathEdges || pathEdges.length === 0) {
            map.getSource('path-src').setData({ type: 'FeatureCollection', features: [] })
            return
        }

        const coords = []
        for (let i = 0; i < pathEdges.length - 1; i++) {
            const a = graph.nodes.get(pathEdges[i])
            const b = graph.nodes.get(pathEdges[i + 1])
            if (!a || !b) continue
            if (coords.length === 0) coords.push([a.lng, a.lat])
            coords.push([b.lng, b.lat])
        }

        map.getSource('path-src').setData({
            type: 'FeatureCollection',
            features: coords.length > 1 ? [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords }, }] : [],
        })
    }, [pathEdges, graph])

    useEffect(() => {
        const map = mapRef.current
        if (!map || !map.getSource('markers-src')) return
        const features = []
        if (fromCoord) features.push({
            type: 'Feature',
            properties: { type: 'from', label: 'A' },
            geometry: { type: 'Point', coordinates: fromCoord }
        })
        if (toCoord) features.push({
            type: 'Feature',
            properties: { type: 'to', label: 'B' },
            geometry: { type: 'Point', coordinates: toCoord }
        })
        map.getSource('markers-src').setData({ type: 'FeatureCollection', features })
    }, [fromCoord, toCoord])

    const updateVisualization = useCallback(() => {
        const map = mapRef.current;
        if (!map) return;
        const { visitedEdges, activeEdges, visitedNodes, activeNodes } = store;
        const edgeFeatures = edgeFeaturesRef.current;
        const nodeFeatures = nodeFeaturesRef.current;
        const edgeIndex = edgeIndexRef.current;
        const nodeIndex = nodeIndexRef.current;
        if (edgeFeatures.length === 0 && nodeFeatures.length === 0) return;
        let edgesChanged = false;
        let nodesChanged = false;

        for (const key of activeEdges) {
            const idx = edgeIndex.get(key)
            if (idx !== undefined && edgeFeatures[idx].properties.status !== 'active') {
                edgeFeatures[idx].properties.status = 'active'
                edgesChanged = true
            }
        }
        for (const key of visitedEdges) {
            const idx = edgeIndex.get(key)
            if (idx !== undefined && !activeEdges.has(key) && edgeFeatures[idx].properties.status !== 'visited') {
                edgeFeatures[idx].properties.status = 'visited'
                edgesChanged = true
            }
        }

        for (const id of activeNodes) {
            const idx = nodeIndex.get(id)
            if (idx !== undefined && nodeFeatures[idx].properties.status !== 'active') {
                nodeFeatures[idx].properties.status = 'active'
                nodesChanged = true
            }
        }
        for (const id of visitedNodes) {
            const idx = nodeIndex.get(id)
            if (idx !== undefined && !activeNodes.has(id) && nodeFeatures[idx].properties.status !== 'visited') {
                nodeFeatures[idx].properties.status = 'visited'
                nodesChanged = true
            }
        }

        if (edgesChanged && map.getSource('edges')) {
            map.getSource('edges').setData({
                type: 'FeatureCollection',
                features: edgeFeatures,
            })
        }
        if (nodesChanged && map.getSource('nodes-src')) {
            map.getSource('nodes-src').setData({
                type: 'FeatureCollection',
                features: nodeFeatures,
            })
        }
    }, [store])

    useEffect(() => {
        const unsub = useVisualizerStore.subscribe(
            (state) => {
                return {
                    vn: state._visitedNodesVersion,
                    an: state._activeNodesVersion,
                    ve: state._visitedEdgesVersion,
                    ae: state._activeEdgesVersion,
                }
            },
            () => { updateVisualization() }
        )
        return unsub
    }, [updateVisualization])

    const { _visitedNodesVersion, _activeNodesVersion, _visitedEdgesVersion, _activeEdgesVersion } = useVisualizerStore();

    useEffect(() => {
        updateVisualization()
    }, [_visitedNodesVersion, _activeNodesVersion, _visitedEdgesVersion, _activeEdgesVersion, updateVisualization])

    return (
        <div className="relative w-full h-full">
            <div ref={containerRef} className="w-full h-full" />
            {mapLoading && (
                <div className="absolute inset-0 flex items-center justify-center z-10" style={{ background: 'rgba(6,8,6,0.85)' }}>
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#39ff1444', borderTopColor: 'transparent' }} />
                        <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Loading map...</span>
                    </div>
                </div>
            )}
        </div>
    )
}