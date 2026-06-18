import { create } from 'zustand'

const initialState = {
    algorithm: 'dfs',
    isRunning: false,
    isPaused: false,
    speed: 1000000,
    nodesExplored: 0,
    edgesTraversed: 0,
    distanceKm: 0,
    visitedNodes: new Set(),
    activeNodes: new Set(),
    visitedEdges: new Set(),
    activeEdges: new Set(),
    _visitedNodesVersion: 0,
    _activeNodesVersion: 0,
    _visitedEdgesVersion: 0,
    _activeEdgesVersion: 0,
}

export const useVisualizerStore = create((set, get) => ({
    ...initialState,

    setAlgorithm: (algorithm) => set({ algorithm }),
    setRunning: (isRunning) => set({ isRunning }),
    setPaused: (isPaused) => set({ isPaused }),
    setSpeed: (speed) => set({ speed }),

    setStats: (nodesExplored, edgesTraversed, distanceKm) =>
        set({ nodesExplored, edgesTraversed, distanceKm }),

    addVisitedNode: (id) => {
        const s = get()
        s.visitedNodes.add(id)
        set({ _visitedNodesVersion: (s._visitedNodesVersion || 0) + 1 })
    },

    addActiveNode: (id) => {
        const s = get()
        s.activeNodes.add(id)
        set({ _activeNodesVersion: (s._activeNodesVersion || 0) + 1 })
    },

    addVisitedEdge: (key) => {
        const s = get()
        s.visitedEdges.add(key)
        set({ _visitedEdgesVersion: (s._visitedEdgesVersion || 0) + 1 })
    },

    addActiveEdge: (key) => {
        const s = get()
        s.activeEdges.add(key)
        set({ _activeEdgesVersion: (s._activeEdgesVersion || 0) + 1 })
    },

    clearActive: () =>
        set({
            activeNodes: new Set(),
            activeEdges: new Set(),
            _activeNodesVersion: (get()._activeNodesVersion || 0) + 1,
            _activeEdgesVersion: (get()._activeEdgesVersion || 0) + 1,
        }),

    reset: () =>
        set({
            ...initialState,
            algorithm: get().algorithm,
            speed: get().speed,
            visitedNodes: new Set(),
            activeNodes: new Set(),
            visitedEdges: new Set(),
            activeEdges: new Set(),
            _visitedNodesVersion: 0,
            _activeNodesVersion: 0,
            _visitedEdgesVersion: 0,
            _activeEdgesVersion: 0,
        }),
}))