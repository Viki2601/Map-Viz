import { edgeKey } from './graphBuilder'

// ---------- Binary Min-Heap ----------
class MinHeap {
    constructor() { this._heap = [] }
    get size() { return this._heap.length }
    insert(key, value) { this._heap.push({ key, value }); this._bubbleUp(this._heap.length - 1) }
    extractMin() {
        const heap = this._heap
        if (heap.length === 0) return null
        const min = heap[0]
        const last = heap.pop()
        if (heap.length > 0) { heap[0] = last; this._sinkDown(0) }
        return min
    }
    _bubbleUp(i) {
        const heap = this._heap
        while (i > 0) {
            const p = (i - 1) >> 1
            if (heap[i].key >= heap[p].key) break
                ;[heap[i], heap[p]] = [heap[p], heap[i]]
            i = p
        }
    }
    _sinkDown(i) {
        const heap = this._heap
        const len = heap.length
        while (true) {
            let s = i
            const l = 2 * i + 1, r = 2 * i + 2
            if (l < len && heap[l].key < heap[s].key) s = l
            if (r < len && heap[r].key < heap[s].key) s = r
            if (s === i) break
                ;[heap[i], heap[s]] = [heap[s], heap[i]]
            i = s
        }
    }
}

// ---------- Haversine ----------
function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLng = ((lng2 - lng1) * Math.PI) / 180
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ---------- Reconstruct bidirectional path ----------
// Forward parent map: child -> parent (start direction)
// Backward parent map: child -> parent (goal direction, needs flipping)
function stitchPath(startId, goalId, meetingNode, parentF, parentB) {
    // Forward half: startId -> meetingNode
    const forward = []
    let cur = meetingNode
    while (cur && cur !== startId) {
        forward.unshift(cur)
        cur = parentF.get(cur)
    }
    if (cur === startId) forward.unshift(startId)

    // Backward half: meetingNode -> goalId (parentB is goal->meeting direction, flip it)
    const backward = []
    cur = meetingNode
    while (parentB.has(cur)) {
        cur = parentB.get(cur)
        backward.push(cur)
    }

    return [...forward, ...backward]
}

// ---------- Bidirectional DFS ----------
function* dfs(graph, startId, goalId) {
    const visitedF = new Set(), visitedB = new Set()
    const parentF = new Map(), parentB = new Map()
    const stackF = [{ nodeId: startId, fromId: null }]
    const stackB = goalId ? [{ nodeId: goalId, fromId: null }] : []
    let nodesExplored = 0, edgesTraversed = 0

    while (stackF.length > 0 || stackB.length > 0) {
        // --- Forward step ---
        if (stackF.length > 0) {
            const { nodeId, fromId } = stackF.pop()
            if (!visitedF.has(nodeId)) {
                visitedF.add(nodeId)
                nodesExplored++
                if (fromId) parentF.set(nodeId, fromId)

                const eKey = fromId ? edgeKey(fromId, nodeId) : null
                if (eKey) edgesTraversed++

                const distF = computePathDist(graph, parentF, startId, nodeId)
                yield { nodeId, fromNodeId: fromId, edgeKey: eKey, nodesExplored, edgesTraversed, distanceKm: distF, found: false, parent: parentF, side: 'forward' }

                // Meeting point check
                if (visitedB.has(nodeId)) {
                    const path = stitchPath(startId, goalId, nodeId, parentF, parentB)
                    const dist = computeFullDist(graph, path)
                    yield { nodeId: goalId, fromNodeId: nodeId, edgeKey: null, nodesExplored, edgesTraversed, distanceKm: dist, found: true, parent: buildMergedParent(path), side: 'done' }
                    return
                }

                const neighbors = graph.edges.get(nodeId) || []
                for (const edge of [...neighbors].reverse()) {
                    if (!visitedF.has(edge.to)) stackF.push({ nodeId: edge.to, fromId: nodeId })
                }
            }
        }

        // --- Backward step ---
        if (goalId && stackB.length > 0) {
            const { nodeId, fromId } = stackB.pop()
            if (!visitedB.has(nodeId)) {
                visitedB.add(nodeId)
                nodesExplored++
                if (fromId) parentB.set(nodeId, fromId)

                const eKey = fromId ? edgeKey(fromId, nodeId) : null
                if (eKey) edgesTraversed++

                const distB = computePathDist(graph, parentB, goalId, nodeId)
                yield { nodeId, fromNodeId: fromId, edgeKey: eKey, nodesExplored, edgesTraversed, distanceKm: distB, found: false, parent: parentB, side: 'backward' }

                // Meeting point check
                if (visitedF.has(nodeId)) {
                    const path = stitchPath(startId, goalId, nodeId, parentF, parentB)
                    const dist = computeFullDist(graph, path)
                    yield { nodeId: goalId, fromNodeId: nodeId, edgeKey: null, nodesExplored, edgesTraversed, distanceKm: dist, found: true, parent: buildMergedParent(path), side: 'done' }
                    return
                }

                const neighbors = graph.edges.get(nodeId) || []
                for (const edge of [...neighbors].reverse()) {
                    if (!visitedB.has(edge.to)) stackB.push({ nodeId: edge.to, fromId: nodeId })
                }
            }
        }
    }
}

// ---------- Bidirectional BFS ----------
function* bfs(graph, startId, goalId) {
    const visitedF = new Set([startId])
    const visitedB = new Set(goalId ? [goalId] : [])
    const parentF = new Map(), parentB = new Map()
    const queueF = [{ nodeId: startId, fromId: null }]
    const queueB = goalId ? [{ nodeId: goalId, fromId: null }] : []
    let frontF = 0, frontB = 0
    let nodesExplored = 0, edgesTraversed = 0

    while (frontF < queueF.length || frontB < queueB.length) {
        // --- Forward step ---
        if (frontF < queueF.length) {
            const { nodeId, fromId } = queueF[frontF++]
            nodesExplored++
            if (fromId) parentF.set(nodeId, fromId)

            const eKey = fromId ? edgeKey(fromId, nodeId) : null
            if (eKey) edgesTraversed++

            const distF = computePathDist(graph, parentF, startId, nodeId)
            yield { nodeId, fromNodeId: fromId, edgeKey: eKey, nodesExplored, edgesTraversed, distanceKm: distF, found: false, parent: parentF, side: 'forward' }

            if (visitedB.has(nodeId)) {
                const path = stitchPath(startId, goalId, nodeId, parentF, parentB)
                const dist = computeFullDist(graph, path)
                yield { nodeId: goalId, fromNodeId: nodeId, edgeKey: null, nodesExplored, edgesTraversed, distanceKm: dist, found: true, parent: buildMergedParent(path), side: 'done' }
                return
            }

            for (const edge of graph.edges.get(nodeId) || []) {
                if (!visitedF.has(edge.to)) {
                    visitedF.add(edge.to)
                    queueF.push({ nodeId: edge.to, fromId: nodeId })
                }
            }
        }

        // --- Backward step ---
        if (goalId && frontB < queueB.length) {
            const { nodeId, fromId } = queueB[frontB++]
            nodesExplored++
            if (fromId) parentB.set(nodeId, fromId)

            const eKey = fromId ? edgeKey(fromId, nodeId) : null
            if (eKey) edgesTraversed++

            const distB = computePathDist(graph, parentB, goalId, nodeId)
            yield { nodeId, fromNodeId: fromId, edgeKey: eKey, nodesExplored, edgesTraversed, distanceKm: distB, found: false, parent: parentB, side: 'backward' }

            if (visitedF.has(nodeId)) {
                const path = stitchPath(startId, goalId, nodeId, parentF, parentB)
                const dist = computeFullDist(graph, path)
                yield { nodeId: goalId, fromNodeId: nodeId, edgeKey: null, nodesExplored, edgesTraversed, distanceKm: dist, found: true, parent: buildMergedParent(path), side: 'done' }
                return
            }

            for (const edge of graph.edges.get(nodeId) || []) {
                if (!visitedB.has(edge.to)) {
                    visitedB.add(edge.to)
                    queueB.push({ nodeId: edge.to, fromId: nodeId })
                }
            }
        }
    }
}

// ---------- Bidirectional Dijkstra ----------
function* dijkstra(graph, startId, goalId) {
    const distF = new Map(), distB = new Map()
    const parentF = new Map(), parentB = new Map()
    const settledF = new Set(), settledB = new Set()
    const pqF = new MinHeap(), pqB = new MinHeap()
    let nodesExplored = 0, edgesTraversed = 0
    let bestCost = Infinity, meetingNode = null

    for (const id of graph.nodes.keys()) { distF.set(id, Infinity); distB.set(id, Infinity) }
    distF.set(startId, 0); pqF.insert(0, startId)
    if (goalId) { distB.set(goalId, 0); pqB.insert(0, goalId) }

    while (pqF.size > 0 || pqB.size > 0) {
        // Termination: shortest found path can't be improved
        if (meetingNode) {
            const muF = pqF.size > 0 ? pqF._heap[0].key : Infinity
            const muB = pqB.size > 0 ? pqB._heap[0].key : Infinity
            if (muF + muB >= bestCost) {
                const path = stitchPath(startId, goalId, meetingNode, parentF, parentB)
                yield { nodeId: goalId, fromNodeId: meetingNode, edgeKey: null, nodesExplored, edgesTraversed, distanceKm: bestCost, found: true, parent: buildMergedParent(path), side: 'done' }
                return
            }
        }

        // --- Forward step ---
        if (pqF.size > 0) {
            const { value: nodeId } = pqF.extractMin()
            if (!settledF.has(nodeId)) {
                settledF.add(nodeId)
                nodesExplored++
                const fromId = parentF.get(nodeId) || null
                const eKey = fromId ? edgeKey(fromId, nodeId) : null
                if (eKey) edgesTraversed++

                yield { nodeId, fromNodeId: fromId, edgeKey: eKey, nodesExplored, edgesTraversed, distanceKm: distF.get(nodeId), found: false, parent: parentF, side: 'forward' }

                if (settledB.has(nodeId)) {
                    const cost = distF.get(nodeId) + distB.get(nodeId)
                    if (cost < bestCost) { bestCost = cost; meetingNode = nodeId }
                }

                for (const edge of graph.edges.get(nodeId) || []) {
                    if (!settledF.has(edge.to)) {
                        const newDist = distF.get(nodeId) + edge.weight
                        if (newDist < distF.get(edge.to)) {
                            distF.set(edge.to, newDist)
                            parentF.set(edge.to, nodeId)
                            pqF.insert(newDist, edge.to)
                        }
                    }
                }
            }
        }

        // --- Backward step ---
        if (goalId && pqB.size > 0) {
            const { value: nodeId } = pqB.extractMin()
            if (!settledB.has(nodeId)) {
                settledB.add(nodeId)
                nodesExplored++
                const fromId = parentB.get(nodeId) || null
                const eKey = fromId ? edgeKey(fromId, nodeId) : null
                if (eKey) edgesTraversed++

                yield { nodeId, fromNodeId: fromId, edgeKey: eKey, nodesExplored, edgesTraversed, distanceKm: distB.get(nodeId), found: false, parent: parentB, side: 'backward' }

                if (settledF.has(nodeId)) {
                    const cost = distF.get(nodeId) + distB.get(nodeId)
                    if (cost < bestCost) { bestCost = cost; meetingNode = nodeId }
                }

                for (const edge of graph.edges.get(nodeId) || []) {
                    if (!settledB.has(edge.to)) {
                        const newDist = distB.get(nodeId) + edge.weight
                        if (newDist < distB.get(edge.to)) {
                            distB.set(edge.to, newDist)
                            parentB.set(edge.to, nodeId)
                            pqB.insert(newDist, edge.to)
                        }
                    }
                }
            }
        }
    }

    // Exhausted — emit best if found
    if (meetingNode) {
        const path = stitchPath(startId, goalId, meetingNode, parentF, parentB)
        yield { nodeId: goalId, fromNodeId: meetingNode, edgeKey: null, nodesExplored, edgesTraversed, distanceKm: bestCost, found: true, parent: buildMergedParent(path), side: 'done' }
    }
}

// ---------- Bidirectional A* ----------
function* astar(graph, startId, goalId) {
    const goalNode = goalId ? graph.nodes.get(goalId) : null
    const startNode = graph.nodes.get(startId)
    const hF = (id) => { if (!goalNode) return 0; const n = graph.nodes.get(id); return haversineKm(n.lat, n.lng, goalNode.lat, goalNode.lng) }
    const hB = (id) => { const n = graph.nodes.get(id); return haversineKm(n.lat, n.lng, startNode.lat, startNode.lng) }

    const gF = new Map(), gB = new Map()
    const parentF = new Map(), parentB = new Map()
    const settledF = new Set(), settledB = new Set()
    const pqF = new MinHeap(), pqB = new MinHeap()
    let nodesExplored = 0, edgesTraversed = 0
    let bestCost = Infinity, meetingNode = null

    for (const id of graph.nodes.keys()) { gF.set(id, Infinity); gB.set(id, Infinity) }
    gF.set(startId, 0); pqF.insert(hF(startId), startId)
    if (goalId) { gB.set(goalId, 0); pqB.insert(hB(goalId), goalId) }

    while (pqF.size > 0 || pqB.size > 0) {
        // Termination check
        if (meetingNode) {
            const muF = pqF.size > 0 ? pqF._heap[0].key : Infinity
            const muB = pqB.size > 0 ? pqB._heap[0].key : Infinity
            if (muF + muB >= bestCost) {
                const path = stitchPath(startId, goalId, meetingNode, parentF, parentB)
                yield { nodeId: goalId, fromNodeId: meetingNode, edgeKey: null, nodesExplored, edgesTraversed, distanceKm: bestCost, found: true, parent: buildMergedParent(path), side: 'done' }
                return
            }
        }

        // --- Forward step ---
        if (pqF.size > 0) {
            const { value: nodeId } = pqF.extractMin()
            if (!settledF.has(nodeId)) {
                settledF.add(nodeId)
                nodesExplored++
                const fromId = parentF.get(nodeId) || null
                const eKey = fromId ? edgeKey(fromId, nodeId) : null
                if (eKey) edgesTraversed++

                yield { nodeId, fromNodeId: fromId, edgeKey: eKey, nodesExplored, edgesTraversed, distanceKm: gF.get(nodeId), found: false, parent: parentF, side: 'forward' }

                if (settledB.has(nodeId)) {
                    const cost = gF.get(nodeId) + gB.get(nodeId)
                    if (cost < bestCost) { bestCost = cost; meetingNode = nodeId }
                }

                for (const edge of graph.edges.get(nodeId) || []) {
                    if (!settledF.has(edge.to)) {
                        const newG = gF.get(nodeId) + edge.weight
                        if (newG < gF.get(edge.to)) {
                            gF.set(edge.to, newG); parentF.set(edge.to, nodeId)
                            pqF.insert(newG + hF(edge.to), edge.to)
                        }
                    }
                }
            }
        }

        // --- Backward step ---
        if (goalId && pqB.size > 0) {
            const { value: nodeId } = pqB.extractMin()
            if (!settledB.has(nodeId)) {
                settledB.add(nodeId)
                nodesExplored++
                const fromId = parentB.get(nodeId) || null
                const eKey = fromId ? edgeKey(fromId, nodeId) : null
                if (eKey) edgesTraversed++

                yield { nodeId, fromNodeId: fromId, edgeKey: eKey, nodesExplored, edgesTraversed, distanceKm: gB.get(nodeId), found: false, parent: parentB, side: 'backward' }

                if (settledF.has(nodeId)) {
                    const cost = gF.get(nodeId) + gB.get(nodeId)
                    if (cost < bestCost) { bestCost = cost; meetingNode = nodeId }
                }

                for (const edge of graph.edges.get(nodeId) || []) {
                    if (!settledB.has(edge.to)) {
                        const newG = gB.get(nodeId) + edge.weight
                        if (newG < gB.get(edge.to)) {
                            gB.set(edge.to, newG); parentB.set(edge.to, nodeId)
                            pqB.insert(newG + hB(edge.to), edge.to)
                        }
                    }
                }
            }
        }
    }

    if (meetingNode) {
        const path = stitchPath(startId, goalId, meetingNode, parentF, parentB)
        yield { nodeId: goalId, fromNodeId: meetingNode, edgeKey: null, nodesExplored, edgesTraversed, distanceKm: bestCost, found: true, parent: buildMergedParent(path), side: 'done' }
    }
}

// ---------- Helpers ----------

// Walk parent map to compute real distance of a path
function computePathDist(graph, parent, startId, nodeId) {
    let dist = 0, cur = nodeId
    while (parent.has(cur)) {
        const prev = parent.get(cur)
        const a = graph.nodes.get(prev), b = graph.nodes.get(cur)
        if (a && b) dist += haversineKm(a.lat, a.lng, b.lat, b.lng)
        cur = prev
    }
    return dist
}

function computeFullDist(graph, path) {
    let dist = 0
    for (let i = 0; i < path.length - 1; i++) {
        const a = graph.nodes.get(path[i]), b = graph.nodes.get(path[i + 1])
        if (a && b) dist += haversineKm(a.lat, a.lng, b.lat, b.lng)
    }
    return dist
}

// Build a linear parent map from an ordered path array (for reconstructPath compat)
function buildMergedParent(path) {
    const map = new Map()
    for (let i = 1; i < path.length; i++) map.set(path[i], path[i - 1])
    return map
}

// Reconstruct path from parent map (unchanged — used by page.jsx)
export function reconstructPath(parent, startId, goalId) {
    const path = []
    let current = goalId
    while (current && current !== startId) {
        path.unshift(current)
        current = parent.get(current)
    }
    if (current === startId) path.unshift(startId)
    return path.length > 1 ? path : []
}

export function createAlgorithmGenerator(algorithm, graph, startId, goalId) {
    switch (algorithm) {
        case 'dfs': return dfs(graph, startId, goalId)
        case 'bfs': return bfs(graph, startId, goalId)
        case 'dijkstra': return dijkstra(graph, startId, goalId)
        case 'astar': return astar(graph, startId, goalId)
        default: return dfs(graph, startId, goalId)
    }
}