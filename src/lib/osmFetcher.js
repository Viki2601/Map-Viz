const osmCache = new Map()

export const CITY_PRESETS = {
    chennai: {
        label: 'Chennai, India',
        bbox: { south: 13.04, west: 80.23, north: 13.08, east: 80.27 },
        center: [80.25, 13.06],
    },
    mumbai: {
        label: 'Mumbai, India',
        bbox: { south: 19.06, west: 72.82, north: 19.10, east: 72.86 },
        center: [72.84, 19.08],
    },
    dubai: {
        label: 'Dubai, UAE',
        bbox: { south: 25.18, west: 55.26, north: 25.23, east: 55.32 },
        center: [55.29, 25.20],
    },
    london: {
        label: 'London, UK',
        bbox: { south: 51.50, west: -0.12, north: 51.52, east: -0.08 },
        center: [-0.10, 51.51],
    },
    newyork: {
        label: 'New York, USA',
        bbox: { south: 40.748, west: -73.99, north: 40.762, east: -73.97 },
        center: [-73.98, 40.755],
    },
    tokyo: {
        label: 'Tokyo, Japan',
        bbox: { south: 35.67, west: 139.69, north: 35.69, east: 139.72 },
        center: [139.705, 35.68],
    },
}

export function centerToBbox(lng, lat, radiusKm = 1.5) {
    const latDelta = radiusKm / 111
    const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180))
    return {
        south: lat - latDelta,
        west: lng - lngDelta,
        north: lat + latDelta,
        east: lng + lngDelta,
    }
}

export function mergeBboxes(bbox1, bbox2) {
    return {
        south: Math.min(bbox1.south, bbox2.south),
        west: Math.min(bbox1.west, bbox2.west),
        north: Math.max(bbox1.north, bbox2.north),
        east: Math.max(bbox1.east, bbox2.east),
    }
}

export async function fetchOSMRoads(bbox) {
    const key = `${bbox.south.toFixed(4)},${bbox.west.toFixed(4)},${bbox.north.toFixed(4)},${bbox.east.toFixed(4)}`
    if (osmCache.has(key)) return osmCache.get(key)

    const { south, west, north, east } = bbox
    const query = `
    [out:json][timeout:30];
    (
      way["highway"~"^(primary|secondary|tertiary|residential|trunk|motorway|unclassified)$"]
        (${south},${west},${north},${east});
    );
    (._;>;);
    out body;
  `

    // Use our server-side proxy to avoid CORS issues in production
    const res = await fetch('/api/osm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
    })

    if (!res.ok) throw new Error(`OSM fetch failed: ${res.status}`)
    const data = await res.json()
    if (data.error) throw new Error(data.error)

    osmCache.set(key, data)
    return data
}

export async function geocodeLocation(query, mapboxToken) {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&types=place,locality,neighborhood,district,address&limit=5`
    const res = await fetch(url)
    if (!res.ok) throw new Error('Geocoding failed')
    const data = await res.json()
    return data.features.map((f) => ({
        label: f.place_name,
        center: f.center,
    }))
}