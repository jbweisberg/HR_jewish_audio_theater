const PODBEAN_FEED = 'https://feed.podbean.com/handyhesh/feed.xml'

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'GET, HEAD' } })
  }

  try {
    const upstream = await fetch(PODBEAN_FEED, {
      headers: {
        'User-Agent': 'JewishAudioTheater/1.0 (+https://jewishaudiotheater.com)',
        Accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
      },
    })

    if (!upstream.ok) return Response.json({ error: 'Repertory unavailable' }, { status: 502 })

    const xml = await upstream.text()
    if (!xml.includes('<item')) return Response.json({ error: 'Unexpected feed response' }, { status: 502 })

    return new Response(request.method === 'HEAD' ? null : xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return Response.json({ error: 'Repertory unavailable' }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}
