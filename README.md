# Gift Voucher Validation System

A simple web application for validating gift vouchers, consisting of:
- Frontend: HTML, CSS, and JavaScript
- Cloudflare Worker: Handles Turnstile validation and acts as a proxy
- Backend: Node.js with Express API

## Project Structure

```
gift-voucher-validation/
├── frontend/
│   ├── index.html    # Main HTML page
│   ├── styles.css    # CSS styles
│   ├── script.js     # Frontend JavaScript
│   └── Dockerfile    # Frontend Docker configuration
├── voucher-validation/
│   ├── src/          # Cloudflare Worker code
│   ├── wrangler.toml # Worker configuration
│   └── package.json  # Worker dependencies
├── backend/
│   ├── package.json  # Node.js package configuration
│   ├── server.js     # Express API server
│   └── Dockerfile    # Backend Docker configuration
├── docker-compose.yml # Docker composition file
├── deploy.sh         # Deployment script
├── .env.example      # Example environment variables
└── .env              # Environment variables (create from .env.example)
```

## Architecture

This system implements a secure architecture with:
1. **Frontend**: User interface for entering and validating voucher codes
2. **Cloudflare Worker**: Middleware that validates Turnstile tokens for bot protection
3. **Backend API**: Validates voucher codes against a database

The data flow is:
1. User enters a voucher code and completes the Turnstile challenge
2. Frontend sends voucher code and Turnstile token to the Cloudflare Worker
3. Worker validates the Turnstile token to ensure the request is from a legitimate user
4. If valid, the Worker forwards the request to the Backend API
5. Backend API validates the voucher code and returns the result
6. Worker returns the API response to the Frontend

## Features

- Simple and clean user interface
- Bot protection with Cloudflare Turnstile
- Secure architecture with separation of concerns
- Docker containerization for easy deployment
- Automatic restart after server reboots

## Security

This application uses Cloudflare Turnstile for bot protection with the following workflow:

1. User enters a voucher code and clicks "Validate"
2. The Cloudflare Turnstile widget appears, prompting the user to complete the security challenge
3. Once the challenge is completed, the token and voucher code are sent to the Cloudflare Worker
4. The Worker validates the token with Cloudflare's verification API
5. If the token is valid, the Worker forwards the request to the backend
6. The Backend processes the voucher code without needing to re-validate the token

### Environment Variables

The following environment variables are used:

#### Backend
| Variable | Description | Required |
|----------|-------------|----------|
| PORT | Port for the backend server | No (default: 3003) |

#### Cloudflare Worker
| Variable | Description | Required |
|----------|-------------|----------|
| TURNSTILE_SECRET_KEY | Cloudflare Turnstile secret key | Yes |
| FRONTEND_URL | URL of the frontend application | Yes |
| BACKEND_URL | URL of the backend API | Yes |

## Docker Setup (Recommended)

The easiest way to run the frontend and backend is using Docker Compose:

```bash
# Copy and edit environment variables
cp .env.example .env
# Edit .env with your configuration

# Build and start both containers
./deploy.sh

# Or manually
docker-compose up -d
```

The containers are configured with `restart: always` policy to automatically restart after server reboots.

The services will be available at:
- Frontend: http://localhost:8081
- Backend API: http://localhost:3003

## Cloudflare Worker Deployment

To deploy the Cloudflare Worker:

```bash
cd voucher-validation
npm install
npm run deploy
```

Make sure to set the required environment variables in the Cloudflare dashboard.

## Manual Setup

See the README files in the individual component folders for instructions on setting them up manually.

## Valid Vouchers

The system has 5 hardcoded valid voucher codes:

1. GIFT100 - $100
2. DISC25 - $25
3. SAVE50 - $50
4. PROMO75 - $75
5. VIP200 - $200

## Deployment Notes

For production deployment:

- Frontend: Deploy to shop-test.whereismypacket.net
- Cloudflare Worker: Deploy to voucher-validation.shop-test-api.requestlab.net
- Backend API: Deploy to shop-test-api.requestlab.net/validate-voucher

The API is accessible on the default HTTPS port as there will be a CDN layer in front of it. 