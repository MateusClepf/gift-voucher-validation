# Gift Voucher Validation System

A simple web application for validating gift vouchers, consisting of:
- Frontend: HTML, CSS, and JavaScript
- Backend: Node.js with Express

## Project Structure

```
gift-voucher-validation/
├── frontend/
│   ├── index.html    # Main HTML page
│   ├── styles.css    # CSS styles
│   ├── script.js     # Frontend JavaScript
│   └── Dockerfile    # Frontend Docker configuration
├── backend/
│   ├── package.json  # Node.js package configuration
│   ├── server.js     # Express API server
│   └── Dockerfile    # Backend Docker configuration
├── docker-compose.yml # Docker composition file
└── deploy.sh         # Deployment script
```

## Docker Setup (Recommended)

The easiest way to run the application is using Docker Compose:

```bash
# Build and start both containers
./deploy.sh

# Or manually
docker-compose up -d
```

The containers are configured with `restart: always` policy to automatically restart after server reboots.

The services will be available at:
- Frontend: http://localhost:8081
- Backend API: http://localhost:3003

For production deployment:
- Frontend: shop-test.whereismypacket.net
- Backend API: shop-test-api.requestlab.net (standard HTTPS port)

Note that in production, there will be a CDN layer in front of the API, so frontend requests are made to the standard HTTPS port.

## Manual Setup

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

The server will run on port 3003 by default.

### Frontend Setup

The frontend is static HTML, CSS, and JavaScript. You can serve it using any web server.

For development, you can use a simple HTTP server:

```bash
# Using Python (if installed)
cd frontend
python -m http.server 8081

# Or with Node.js (if installed)
cd frontend
npx http-server -p 8081
```

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
- Backend API: Deploy to shop-test-api.requestlab.net (with CDN in front)

The API is accessible on the default HTTPS port as there will be a CDN layer in front of it. 