# Create Admin User Script
# Replace these values with your actual values

$RENDER_URL = "https://shoe-store-api.onrender.com"
$ADMIN_SECRET = "your-admin-secret-key-for-creating-admin-users-12345"

$adminData = @{
    email = "admin@yourstore.com"
    password = "YourSecureAdminPassword123!"
    firstName = "Admin"
    lastName = "User"
    role = "admin"
    adminSecret = $ADMIN_SECRET
} | ConvertTo-Json

Write-Host "Creating admin user..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "$RENDER_URL/api/auth/register" -Method Post -Body $adminData -ContentType "application/json"
    
    Write-Host "✅ Admin user created successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Admin Details:" -ForegroundColor Cyan
    Write-Host "Email: $($response.data.user.email)" -ForegroundColor White
    Write-Host "Name: $($response.data.user.profile.firstName) $($response.data.user.profile.lastName)" -ForegroundColor White
    Write-Host "Role: $($response.data.user.role)" -ForegroundColor White
    Write-Host ""
    Write-Host "🔑 Save this token:" -ForegroundColor Yellow
    Write-Host $response.data.token -ForegroundColor White
    
} catch {
    Write-Host "❌ Failed to create admin user" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
