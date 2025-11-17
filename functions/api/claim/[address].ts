// Cloudflare Pages Function to proxy fee grant requests to backend
// This handles /api/claim/:address routes

export async function onRequest(context: any) {
  const { request, params, env } = context
  const address = params.address

  // Backend server URL (from environment variable or default to test VM)
  const BACKEND_URL = env.BACKEND_URL || 'http://104.131.104.100:3001'

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
