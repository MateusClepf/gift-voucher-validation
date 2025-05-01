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
    // Log the incoming request
    const requestId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const clientIP = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For');
    const userAgent = request.headers.get('User-Agent');
    
    console.log(`[${timestamp}] [${requestId}] Request received: ${request.method} ${request.url}`);
    console.log(`[${timestamp}] [${requestId}] Client IP: ${clientIP}, User-Agent: ${userAgent}`);
    
    // Handle CORS preflight requests (OPTIONS)
    if (request.method === 'OPTIONS') {
      console.log(`[${timestamp}] [${requestId}] Handling OPTIONS preflight request`);
      return handleCorsPreflightRequest(env);
    }
    
    // Only allow POST requests
    if (request.method !== 'POST') {
      console.log(`[${timestamp}] [${requestId}] Method not allowed: ${request.method}`);
      return new Response('Method not allowed', { 
        status: 405,
        headers: getCorsHeaders(env)
      });
    }

    // Parse the request body
    let requestBody;
    try {
      requestBody = await request.json();
      console.log(`[${timestamp}] [${requestId}] Request body parsed successfully`);
      
      // Log voucher code if present (but mask it partially for privacy)
      if (requestBody.code) {
        const maskedCode = maskSensitiveData(requestBody.code);
        console.log(`[${timestamp}] [${requestId}] Voucher code: ${maskedCode}`);
      }
    } catch (error) {
      console.error(`[${timestamp}] [${requestId}] Error parsing request body: ${error.message}`);
      return new Response('Invalid JSON body', { 
        status: 400,
        headers: getCorsHeaders(env)
      });
    }

    // Extract the Turnstile token
    const turnstileToken = requestBody['cf-turnstile-response'];
    if (!turnstileToken) {
      console.log(`[${timestamp}] [${requestId}] Turnstile token missing`);
      return new Response(JSON.stringify({
        valid: false,
        message: 'Security validation token is required'
      }), {
        status: 400,
        headers: getCorsHeaders(env)
      });
    }
    
    console.log(`[${timestamp}] [${requestId}] Turnstile token received (length: ${turnstileToken.length})`);

    // Validate the Turnstile token
    console.log(`[${timestamp}] [${requestId}] Validating Turnstile token...`);
    const turnstileResult = await validateTurnstileToken(turnstileToken, clientIP, env);
    
    // Log validation result (success or failure)
    if (turnstileResult.success) {
      console.log(`[${timestamp}] [${requestId}] Turnstile validation successful`);
      console.log(`[${timestamp}] [${requestId}] Token details: action=${turnstileResult.action || 'unknown'}, cdata=${turnstileResult.cdata || 'none'}, hostname=${turnstileResult.hostname || 'unknown'}`);
    } else {
      console.error(`[${timestamp}] [${requestId}] Turnstile validation failed: ${JSON.stringify(turnstileResult['error-codes'])}`);
      return new Response(JSON.stringify({
        valid: false,
        message: 'Security validation failed',
        turnstileError: turnstileResult['error-codes']
      }), {
        status: 403,
        headers: getCorsHeaders(env)
      });
    }

    // Make sure the token was generated for our expected hostname
    if (turnstileResult.hostname && env.FRONTEND_URL) {
      const expectedHostname = new URL(env.FRONTEND_URL).hostname;
      if (turnstileResult.hostname !== expectedHostname) {
        console.error(`[${timestamp}] [${requestId}] Hostname mismatch: expected=${expectedHostname}, actual=${turnstileResult.hostname}`);
        return new Response(JSON.stringify({
          valid: false,
          message: 'Security validation failed: invalid hostname',
        }), {
          status: 403,
          headers: getCorsHeaders(env)
        });
      }
      console.log(`[${timestamp}] [${requestId}] Hostname validation successful: ${turnstileResult.hostname}`);
    }

    // Token is valid, forward the request to the backend
    console.log(`[${timestamp}] [${requestId}] All validations passed, forwarding to backend: ${env.BACKEND_URL}`);
    const backendResponse = await forwardRequestToBackend(requestBody, env, requestId, timestamp);
    console.log(`[${timestamp}] [${requestId}] Request completed`);
    return backendResponse;
  }
}

/**
 * Masks sensitive data for logging
 * @param {string} data - The data to mask
 * @returns {string} - The masked data
 */
function maskSensitiveData(data) {
  if (!data || data.length <= 4) {
    return '****';
  }
  // Show first 2 and last 2 characters, mask the rest
  return data.substring(0, 2) + '*'.repeat(data.length - 4) + data.substring(data.length - 2);
}

/**
 * Handles CORS preflight requests
 * @param {Object} env - Environment variables
 * @returns {Response} - Response for preflight request
 */
function handleCorsPreflightRequest(env) {
  return new Response(null, {
    status: 204,
    headers: {
      ...getCorsHeaders(env),
      'Access-Control-Max-Age': '86400', // Cache preflight response for 24 hours
    }
  });
}

/**
 * Returns CORS headers for responses
 * @param {Object} env - Environment variables
 * @returns {Object} - CORS headers
 */
function getCorsHeaders(env) {
  return {
    'Access-Control-Allow-Origin': env.FRONTEND_URL || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, cf-turnstile-response',
    'Content-Type': 'application/json'
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
    console.error(`Error validating Turnstile token: ${error.message}`);
    return { success: false, 'error-codes': ['verification-failed'] };
  }
}

/**
 * Forwards the request to the backend after validation
 * @param {Object} requestBody - The validated request body
 * @param {Object} env - Environment variables containing the backend URL
 * @param {string} requestId - The ID for this request (for logging)
 * @param {string} timestamp - The timestamp for logging
 * @returns {Promise<Response>} - The backend response
 */
async function forwardRequestToBackend(requestBody, env, requestId, timestamp) {
  try {
    // Forward the request to the backend
    console.log(`[${timestamp}] [${requestId}] Making request to backend...`);
    const startTime = Date.now();
    
    const backendResponse = await fetch(env.BACKEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    const endTime = Date.now();
    console.log(`[${timestamp}] [${requestId}] Backend response received in ${endTime - startTime}ms, status: ${backendResponse.status}`);

    // Get the backend response
    const backendResponseData = await backendResponse.json();
    
    // Log the response result (is voucher valid?)
    if (backendResponseData.valid) {
      console.log(`[${timestamp}] [${requestId}] Voucher validation successful, value: ${backendResponseData.value || 'unknown'}`);
    } else {
      console.log(`[${timestamp}] [${requestId}] Voucher validation failed: ${backendResponseData.message || 'No error message'}`);
    }

    // Return the backend response with proper CORS headers
    return new Response(JSON.stringify(backendResponseData), {
      status: backendResponse.status,
      headers: getCorsHeaders(env)
    });
  } catch (error) {
    console.error(`[${timestamp}] [${requestId}] Backend request error: ${error.message}`);
    return new Response(JSON.stringify({
      valid: false,
      message: 'Error connecting to validation service'
    }), {
      status: 500,
      headers: getCorsHeaders(env)
    });
  }
} 