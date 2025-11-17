// Cloudflare Pages Function to proxy API requests to backend
// This handles all /api/* routes and forwards them to the faucet backend

export async function onRequest(context: any) {
  const { request } = context
  const url = new URL(request.url)

  // Extract the path after /api/
  const apiPath = url.pathname.replace('/api/', '/')

  // Backend server URL (your VM)
  const BACKEND_URL = 'http://104.131.104.100:3001'

  // Build the backend URL
  const backendUrl = `${BACKEND_URL}${apiPath}${url.search}`

  try {
    // Forward the request to the backend
    const backendResponse = await fetch(backendUrl, {
      method: request.method,
      headers: request.headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.text() : undefined
    })

    // Get the response from backend
    const responseBody = await backendResponse.text()

    // Return response with CORS headers
    return new Response(responseBody, {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
      headers: {
        'Content-Type': backendResponse.headers.get('Content-Type') || 'application/json',
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
        message: error.message
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
