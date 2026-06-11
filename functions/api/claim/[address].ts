// Cloudflare Pages Function to proxy fee grant requests to backend
// This handles /api/claim/:address routes

export async function onRequest(context: any) {
  const { request, params, env } = context
  const address = params.address

  // Backend server URL — env-driven only, no hardcoded fallback (trim to tolerate
  // stray whitespace in the dashboard variable). Fail loudly if it isn't configured.
  const BACKEND_URL = (env.BACKEND_URL || '').trim().replace(/\/+$/, '')
  if (!BACKEND_URL) {
    return new Response(JSON.stringify({ error: 'BACKEND_URL is not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  }

  // Build the backend URL
  const backendUrl = `${BACKEND_URL}/claim/${address}`

  try {
    // Forward the request to the backend
    const backendResponse = await fetch(backendUrl, {
      method: request.method,
      headers: {
        'Content-Type': 'application/json'
      }
    })

    // Get the response from backend
    const responseBody = await backendResponse.text()

    // Return response with CORS headers
    return new Response(responseBody, {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    })
  } catch (error: any) {
    // Return error response
    return new Response(
      JSON.stringify({
        error: 'Backend connection failed',
        message: error.message,
        backend: backendUrl
      }),
      {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )
  }
}
