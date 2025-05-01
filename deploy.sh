#!/bin/bash

echo "Building and deploying Gift Voucher Validation System..."

# Check for .env file
if [ ! -f .env ]; then
    echo "Warning: No .env file found. Creating from .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "Created .env file. Please edit it with your actual Turnstile secret key."
        echo "You can continue with deployment, but remember to set proper environment variables."
    else
        echo "Error: .env.example file not found. Please create a .env file with your environment variables."
        echo "Example:"
        echo "TURNSTILE_SECRET_KEY=your_turnstile_secret_key_here"
        echo "PORT=3003"
        exit 1
    fi
fi

# Check if TURNSTILE_SECRET_KEY is set in the environment or .env file
if ! grep -q "TURNSTILE_SECRET_KEY" .env || grep -q "TURNSTILE_SECRET_KEY=your_turnstile_secret_key_here" .env; then
    echo "Warning: TURNSTILE_SECRET_KEY not properly set in .env file."
    echo "The application will use a fallback key for development purposes only."
    echo "For production use, please set a proper secret key in the .env file."
fi

# Build and start the containers with restart policy
docker-compose down
docker-compose build --no-cache
docker-compose up -d

echo "Deployment complete!"
echo "Frontend available at: http://localhost:8081"
echo "Backend API available at: http://localhost:3003"
echo "Containers configured to restart automatically after server reboot."
echo ""
echo "Test the API with curl:"
echo 'curl -X POST -H "Content-Type: application/json" -d '"'"'{"code":"GIFT100", "cf-turnstile-response":"YOUR_TURNSTILE_TOKEN"}'"'"' http://localhost:3003/validate-voucher'
echo ""

# Verify containers are running with restart policy
echo "Verifying container status:"
docker ps -a | grep "gift-voucher" 