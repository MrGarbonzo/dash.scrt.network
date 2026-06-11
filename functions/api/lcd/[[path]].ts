// Cloudflare Pages Function: proxy Secret Network LCD / gRPC-gateway (REST) queries.
//
// The real upstream endpoint is PRIVATE and must never be shipped to the client bundle.
// It lives only in the runtime variable SECRET_LCD (set in the Cloudflare Pages dashboard,
// ideally as an encrypted secret) and is read here server-side via context.env.
//
// Routing: this file handles /api/lcd/*  ->  ${SECRET_LCD}/*
// The browser (secretjs) is configured with VITE_SECRET_LCD=/api/lcd, so it only ever
// talks to our own origin; the private URL stays on the server side.

export async function onRequest(context: any) {
  const { request, env } = context
  const url = new URL(request.url)

  const upstream = (env.SECRET_LCD || '').replace(/\/+$/, '')
  if (!upstream) {
    return new Response(JSON.stringify({ error: 'SECRET_LCD is not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Strip the /api/lcd prefix and forward the remaining path + query string upstream.
  const forwardPath = url.pathname.replace(/^\/api\/lcd/, '')
  const target = `${upstream}${forwardPath}${url.search}`

  // Same-origin preflight (secretjs may send custom headers like x-cosmos-block-height).
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204 })
  }

  // Forward incoming headers (preserves Content-Type, x-cosmos-block-height, etc.),
  // dropping host so fetch sets it for the upstream.
  const headers = new Headers(request.headers)
  headers.delete('host')

  const init: RequestInit = { method: request.method, headers }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.arrayBuffer()
  }

  try {
    const upstreamResponse = await fetch(target, init)
    const body = await upstreamResponse.arrayBuffer()
    return new Response(body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: {
        'Content-Type': upstreamResponse.headers.get('Content-Type') || 'application/json'
      }
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: 'LCD upstream request failed', message: error?.message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
