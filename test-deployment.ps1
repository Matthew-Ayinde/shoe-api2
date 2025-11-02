# Render Deployment Test Script
# Replace YOUR_RENDER_URL with your actual Render URL

$RENDER_URL = "https://shoe-store-api.onrender.com"

Write-Host "🧪 Testing Render Deployment..." -ForegroundColor Cyan
Write-Host ""

# Test 1: Health Check
Write-Host "1. Testing Health Endpoint..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$RENDER_URL/api/health" -Method Get
    Write-Host "   ✅ Health Check: PASSED" -ForegroundColor Green
    Write-Host "   Status: $($health.status)" -ForegroundColor White
} catch {
    Write-Host "   ❌ Health Check: FAILED" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 2: Products Endpoint
Write-Host "2. Testing Products Endpoint..." -ForegroundColor Yellow
try {
    $products = Invoke-RestMethod -Uri "$RENDER_URL/api/products" -Method Get
    Write-Host "   ✅ Products Endpoint: PASSED" -ForegroundColor Green
    Write-Host "   Products Count: $($products.data.products.Count)" -ForegroundColor White
} catch {
    Write-Host "   ❌ Products Endpoint: FAILED" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 3: Register New User
Write-Host "3. Testing User Registration..." -ForegroundColor Yellow
$testUser = @{
    email = "testuser$(Get-Random -Maximum 10000)@example.com"
    password = "TestPassword123!"
    firstName = "Test"
    lastName = "User"
} | ConvertTo-Json

try {
    $register = Invoke-RestMethod -Uri "$RENDER_URL/api/auth/register" -Method Post -Body $testUser -ContentType "application/json"
    Write-Host "   ✅ User Registration: PASSED" -ForegroundColor Green
    Write-Host "   User Email: $($register.data.user.email)" -ForegroundColor White
    
    # Save token for next test
    $global:authToken = $register.data.token
} catch {
    Write-Host "   ❌ User Registration: FAILED" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎉 Deployment Tests Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Your API is deployed at: $RENDER_URL" -ForegroundColor Cyan
Write-Host "API Documentation: $RENDER_URL/api/health" -ForegroundColor Cyan
