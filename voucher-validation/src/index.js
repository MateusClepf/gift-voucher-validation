/**
 * Voucher Validation Worker
 * 
 * This worker validates Turnstile tokens before forwarding requests to the backend API.
 * It ensures that requests are legitimate and not from bots before processing voucher codes.
 */

// The Turnstile verification endpoint
const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * Handle an incoming request
 * @param {Request} request - The incoming request
 * @param {Object} env - Environment variables
 * @param {Object} ctx - Execution context
 * @returns {Promise<Response>} - The response
 */
export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight requests (OPTIONS)
    if (request.method === 'OPTIONS') {
      return handleCorsPreflightRequest(request, env);
    }
    
    // Only allow POST requests
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405,
        headers: getCorsHeaders(request, env)
      });
    }

    // Get the client IP
    const clientIP = request.headers.get('CF-Connecting-IP');
    
    // Parse the request body
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (error) {
      return new Response('Invalid JSON body', { 
        status: 400,
        headers: getCorsHeaders(request, env)
      });
    }

    // Extract the Turnstile token
    const turnstileToken = requestBody['cf-turnstile-response'];
    if (!turnstileToken) {
      return new Response(JSON.stringify({
        valid: false,
        message: 'Security validation token is required'
      }), {
        status: 400,
        headers: getCorsHeaders(request, env)
      });
    }

    // Validate the Turnstile token
    const turnstileResult = await validateTurnstileToken(turnstileToken, clientIP, env);
    
    // If validation fails, return an error
    if (!turnstileResult.success) {
      return new Response(JSON.stringify({
        valid: false,
        message: 'Security validation failed',
        turnstileError: turnstileResult['error-codes']
      }), {
        status: 403,
        headers: getCorsHeaders(request, env)
      });
    }

    // This is an optional security check, is is needed if any domain option is enable in the Turnstile widget.
    // If you are using a single frontend domain, you can remove this check as the Turnstile widget will only generate tokens for the expected hostname.
    if (turnstileResult.hostname && env.FRONTEND_URL) {
      const expectedHostname = new URL(env.FRONTEND_URL).hostname;
      if (turnstileResult.hostname !== expectedHostname) {
        return new Response(JSON.stringify({
          valid: false,
          message: 'Security validation failed: invalid hostname',
        }), {
          status: 403,
          headers: getCorsHeaders(request, env)
        });
      }
    }

    // Token is valid, forward the request to the backend
    return await forwardRequestToBackend(requestBody, request, env);
  }
}

/**
 * Handles CORS preflight requests
 * @param {Request} request - The original request
 * @param {Object} env - Environment variables
 * @returns {Response} - Response for preflight request
 */
function handleCorsPreflightRequest(request, env) {
  return new Response(null, {
    status: 204,
    headers: {
      ...getCorsHeaders(request, env),
      'Access-Control-Max-Age': '86400', // Cache preflight response for 24 hours
    }
  });
}

/**
 * Returns CORS headers for responses
 * @param {Request} request - The original request
 * @param {Object} env - Environment variables
 * @returns {Object} - CORS headers
 */
function getCorsHeaders(request, env) {
  // Get the origin from the request
  const origin = request.headers.get('Origin') || env.FRONTEND_URL || '*';
  
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, cf-turnstile-response, Origin, X-Requested-With',
    'Content-Type': 'application/json',
    'Vary': 'Origin' // Important for caching responses with different origins
  };
}

/**
 * Validates a Turnstile token
 * @param {string} token - The Turnstile token to validate
 * @param {string} remoteip - The client IP address
 * @param {Object} env - Environment variables containing the secret key
 * @returns {Promise<Object>} - The validation result
 */
async function validateTurnstileToken(token, remoteip, env) {
  try {
    // Create form data for the Turnstile verification request
    const formData = new FormData();
    formData.append('secret', env.TURNSTILE_SECRET_KEY);
    formData.append('response', token);
    
    if (remoteip) {
      formData.append('remoteip', remoteip);
    }

    // Make the verification request
    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      body: formData
    });

    // Parse and return the response
    return await response.json();
  } catch (error) {
    console.error('Turnstile verification error:', error);
    return { success: false, 'error-codes': ['verification-failed'] };
  }
}

/**
 * Forwards the request to the backend after validation
 * @param {Object} requestBody - The validated request body
 * @param {Request} request - The original request
 * @param {Object} env - Environment variables containing the backend URL
 * @returns {Promise<Response>} - The backend response
 */
async function forwardRequestToBackend(requestBody, request, env) {
  try {
    // Create a clean copy of the request body without the Turnstile token
    const cleanRequestBody = { ...requestBody };
    
    // Remove the Turnstile token before forwarding to the backend
    delete cleanRequestBody['cf-turnstile-response'];
    
    // Forward the request to the backend
    const backendResponse = await fetch(env.BACKEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(cleanRequestBody)
    });

    // Get the backend response
    const backendResponseData = await backendResponse.json();

    // Return the backend response
    return new Response(JSON.stringify(backendResponseData), {
      status: backendResponse.status,
      headers: getCorsHeaders(request, env)
    });
  } catch (error) {
    console.error('Backend request error:', error);
    return new Response(JSON.stringify({
      valid: false,
      message: 'Error connecting to validation service'
    }), {
      status: 500,
      headers: getCorsHeaders(request, env)
    });
  }
} 