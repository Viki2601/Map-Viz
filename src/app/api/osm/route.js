// app/api/osm/route.js

const OVERPASS_MIRRORS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
]

export async function POST(request) {
    let body
    try {
        body = await request.json()
    } catch {
        return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { query } = body
    if (!query) return Response.json({ error: 'Missing query' }, { status: 400 })

    const encoded = new URLSearchParams({ data: query }).toString()

    for (const mirror of OVERPASS_MIRRORS) {
        try {
            const res = await fetch(mirror, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: encoded,
                signal: AbortSignal.timeout(25000),
            })

            if (!res.ok) {
                console.warn(`[OSM proxy] ${mirror} responded ${res.status}, trying next...`)
                continue
            }

            const data = await res.json()
            return Response.json(data)
        } catch (e) {
            console.warn(`[OSM proxy] ${mirror} failed: ${e.message}, trying next...`)
            continue
        }
    }

    console.error('[OSM proxy] All Overpass mirrors failed')
    return Response.json({ error: 'All Overpass mirrors failed. Try again in a moment.' }, { status: 500 })
}