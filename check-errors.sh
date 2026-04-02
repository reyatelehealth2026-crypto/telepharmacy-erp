#!/bin/bash

echo "=== Checking All Services ==="
echo ""

echo "1. API Container Status:"
docker ps --filter name=telepharmacy-api --format "{{.Status}}"
echo ""

echo "2. Admin Container Status:"
docker ps --filter name=telepharmacy-admin --format "{{.Status}}"
echo ""

echo "3. Shop Container Status:"
docker ps --filter name=telepharmacy-shop --format "{{.Status}}"
echo ""

echo "4. API Recent Errors (last 50 lines):"
docker logs telepharmacy-api --tail 50 2>&1 | grep -i "error\|exception\|failed\|crash" || echo "No errors found"
echo ""

echo "5. Admin Recent Errors (last 50 lines):"
docker logs telepharmacy-admin --tail 50 2>&1 | grep -i "error\|exception\|failed\|crash" || echo "No errors found"
echo ""

echo "6. Shop Recent Errors (last 50 lines):"
docker logs telepharmacy-shop --tail 50 2>&1 | grep -i "error\|exception\|failed\|crash" || echo "No errors found"
echo ""

echo "7. Testing API Endpoint:"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:3000/v1/health
echo ""

echo "8. Testing Admin Endpoint:"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:3001
echo ""

echo "9. Testing Shop Endpoint:"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:3002
echo ""

echo "10. Database Connection:"
docker exec telepharmacy-postgres pg_isready -U postgres || echo "Database not ready"
echo ""

echo "11. Redis Connection:"
docker exec telepharmacy-redis redis-cli ping || echo "Redis not ready"
echo ""

echo "=== Check Complete ==="
