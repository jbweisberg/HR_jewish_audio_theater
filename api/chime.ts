const SOURCE = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'

export default {
  async fetch(request: Request) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'GET, HEAD' } })
    }

    try {
      const upstream = await fetch(SOURCE, {
        headers: {
          Accept: 'audio/mpeg,*/*;q=0.8',
          'User-Agent': 'JewishAudioTheater/1.0 (+https://jewishaudiotheater.com)',
        },
      })

      if (!upstream.ok) {
        return new Response('Chime unavailable', { status: 502 })
      }

      const headers = new Headers()
      headers.set('Content-Type', upstream.headers.get('content-type') || 'audio/mpeg')
      headers.set('Cache-Control', 'public, max-age=86400, s-maxage=604800, immutable')
      headers.set('X-Content-Type-Options', 'nosniff')
      const length = upstream.headers.get('content-length')
      if (length) headers.set('Content-Length', length)

      if (request.method === 'HEAD') {
        return new Response(null, { status: 200, headers })
      }

      return new Response(upstream.body, { status: 200, headers })
    } catch {
      return new Response('Chime unavailable', { status: 502 })
    }
  },
}
