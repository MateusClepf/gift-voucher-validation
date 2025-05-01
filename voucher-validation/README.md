# Voucher Validation Worker

A Cloudflare Worker that validates Cloudflare Turnstile tokens before forwarding requests to a backend API. This worker acts as a middleware between the frontend and the backend, ensuring that only legitimate requests with valid Turnstile tokens are processed.

## Features

- Validates Turnstile tokens using Cloudflare's API
- Verifies that tokens were issued for the expected frontend URL
- Forwards valid requests to the backend API
- Returns appropriate error responses for invalid requests
- Handles CORS for cross-domain requests

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
   - Create a `.dev.vars` file for local development
   - Set your `TURNSTILE_SECRET_KEY` value in the file

3. Run locally:
```bash
npm run dev
```

4. Deploy to Cloudflare Workers:
```bash
npm run deploy
```

## Deployment Instructions

### Prerequisites

1. Install Wrangler CLI globally:
```bash
npm install -g wrangler
```

2. Login to your Cloudflare account:
```bash
wrangler login
```

### Deployment Steps

1. Set up your production environment variables:
   - Edit `wrangler.toml` and uncomment the production environment variables section
   - Add your Turnstile secret key to the production environment:
     ```toml
     [env.production.vars]
     TURNSTILE_SECRET_KEY = "your-secret-key-here"
     ```
   - Alternatively, use the Cloudflare dashboard or Wrangler secrets to set sensitive values:
     ```bash
     wrangler secret put TURNSTILE_SECRET_KEY
     ```

2. Verify your configuration:
   - Ensure your `wrangler.toml` has the correct routes configured to intercept requests to your backend
   - Confirm that `FRONTEND_URL` and `BACKEND_URL` are set correctly

3. Deploy the worker:
```bash
wrangler deploy
```

4. Verify deployment:
   - Check the Cloudflare Workers dashboard to confirm your worker is running
   - Test the worker by sending a request with a Turnstile token
   - Monitor the worker logs for any errors:
     ```bash
     wrangler tail
     ```

### Domain Configuration

The worker is configured to intercept requests to `shop-test-api.requestlab.net/validate-voucher` using Workers Routes:

1. Ensure that your domain (requestlab.net) is properly configured in Cloudflare
2. The route pattern in `wrangler.toml` should match the exact endpoint you want to intercept
3. The frontend code should continue to use the original backend URL, as requests will be intercepted by the worker

## Environment Variables

- `TURNSTILE_SECRET_KEY`: Your Cloudflare Turnstile secret key (required)
- `FRONTEND_URL`: The URL of your frontend application (e.g., `https://shop-test.whereismypacket.net`)
- `BACKEND_URL`: The URL of your backend API endpoint (e.g., `https://shop-test-api.requestlab.net/validate-voucher`)

## Usage

The worker is designed to handle POST requests containing:

1. A voucher code to validate
2. A Cloudflare Turnstile token for verification

Example request:
```json
{
  "code": "GIFT100",
  "cf-turnstile-response": "0.1AbCdEfGhIjKlMnOpQrStUvWxYz..."
}
```

If validation is successful, the request is forwarded to the backend API. If validation fails, an appropriate error response is returned.

## Integration with Frontend

When integrating with a frontend application, ensure that:

1. The Turnstile widget is properly initialized with your site key
2. The token from the widget is included with each API request
3. The API requests are sent to this worker's URL instead of directly to the backend 