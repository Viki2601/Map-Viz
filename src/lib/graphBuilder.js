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

export function edgeKey(a, b) {
    return [a, b].sort().join('--')
}

export function buildGraphFromOSM(osmData) {
    const nodes = new Map()
    const edges = new Map()

    // Index all raw nodes
    const nodeIndex = new Map()
    for (const el of osmData.elements) {
        if (el.type === 'node') nodeIndex.set(el.id, el)
    }

    // Build adjacency from ways
    for (const el of osmData.elements) {
        if (el.type !== 'way') continue
        const refs = el.nodes
        if (!refs || refs.length < 2) continue

        for (const ref of refs) {
            const n = nodeIndex.get(ref)
            if (!n) continue
            const id = String(n.id)
            if (!nodes.has(id)) {
                nodes.set(id, { id, lat: n.lat, lng: n.lon })
                edges.set(id, [])
            }
        }

        for (let i = 0; i < refs.length - 1; i++) {
            const aId = String(refs[i])
            const bId = String(refs[i + 1])
            const aNode = nodes.get(aId)
            const bNode = nodes.get(bId)
            if (!aNode || !bNode) continue

            const weight = haversineKm(aNode.lat, aNode.lng, bNode.lat, bNode.lng)
            edges.get(aId).push({ from: aId, to: bId, weight })
            edges.get(bId).push({ from: bId, to: aId, weight })
        }
    }

    return { nodes, edges }
}

// ---------- Spatial index for fast nearest-node lookup ----------
const CELL_SIZE = 0.001 // ~100m per cell

function cellKey(lat, lng) {
    const row = Math.floor(lat / CELL_SIZE)
    const col = Math.floor(lng / CELL_SIZE)
    return `${row},${col}`
}

function buildSpatialIndex(graph) {
    const grid = new Map()
    for (const [id, node] of graph.nodes) {
        const key = cellKey(node.lat, node.lng)
        if (!grid.has(key)) grid.set(key, [])
        grid.get(key).push(id)
    }
    return grid
}

export function findNearestNode(graph, lat, lng) {
    // Build and cache the spatial index on the graph object
    if (!graph._spatialIndex) {
        graph._spatialIndex = buildSpatialIndex(graph)
    }
    const grid = graph._spatialIndex

    const centerRow = Math.floor(lat / CELL_SIZE)
    const centerCol = Math.floor(lng / CELL_SIZE)

    let nearest = null
    let minDist = Infinity

    // Search the target cell and its 8 neighbors
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            const key = `${centerRow + dr},${centerCol + dc}`
            const bucket = grid.get(key)
            if (!bucket) continue
            for (const id of bucket) {
                const node = graph.nodes.get(id)
                const d = haversineKm(lat, lng, node.lat, node.lng)
                if (d < minDist) {
                    minDist = d
                    nearest = id
                }
            }
        }
    }

    // Fall back to full scan only if no nodes found in nearby cells
    if (nearest !== null) return nearest

    for (const [id, node] of graph.nodes) {
        const d = haversineKm(lat, lng, node.lat, node.lng)
        if (d < minDist) {
            minDist = d
            nearest = id
        }
    }
    return nearest
}