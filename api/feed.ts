const PODBEAN_FEED = 'https://feed.podbean.com/handyhesh/feed.xml'

const responseHeaders = {
  'Content-Type': 'application/rss+xml; charset=utf-8',
  'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600',
  'X-Content-Type-Options': 'nosniff',
}

async function loadFeed() {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  try {
    const upstream = await fetch(PODBEAN_FEED, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'JewishAudioTheater/1.0 (+https://jewishaudiotheater.com)',
        Accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
      },
    })

    if (!upstream.ok) {
      return Response.json(
        { error: 'Repertory unavailable', upstreamStatus: upstream.status },
        { status: 502, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    const xml = await upstream.text()
    if (!xml.includes('<item')) {
      return Response.json(
        { error: 'Unexpected feed response' },
        { status: 502, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    return new Response(xml, { status: 200, headers: responseHeaders })
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'AbortError'
    return Response.json(
      { error: timedOut ? 'Feed request timed out' : 'Repertory unavailable' },
      { status: timedOut ? 504 : 500, headers: { 'Cache-Control': 'no-store' } },
    )
  } finally {
    clearTimeout(timeout)
  }
}

export default {
  async fetch(request: Request) {
    if (request.method === 'HEAD') {
      const response = await loadFeed()
      return new Response(null, { status: response.status, headers: response.headers })
    }

    if (request.method !== 'GET') {
      return new Response('Method Not Allowed', {
        status: 405,
        headers: { Allow: 'GET, HEAD' },
      })
    }

    return loadFeed()
  },
}
