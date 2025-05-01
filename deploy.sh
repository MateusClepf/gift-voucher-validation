#!/bin/bash

echo "Building and deploying Gift Voucher Validation System..."

# Build and start the containers with restart policy
docker-compose down
docker-compose build --no-cache
docker-compose up -d

echo "Deployment complete!"
echo "Frontend available at: http://localhost"
echo "Backend API available at: http://localhost:3003"
echo "Containers configured to restart automatically after server reboot."
echo ""
echo "Test the API with curl:"
echo 'curl -X POST -H "Content-Type: application/json" -d '"'"'{"code":"GIFT100"}'"'"' http://localhost:3003/validate-voucher'
echo ""

# Verify containers are running with restart policy
echo "Verifying container status:"
docker ps -a | grep "gift-voucher" 