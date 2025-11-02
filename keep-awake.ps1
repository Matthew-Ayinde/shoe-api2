# Keep Render App Awake Script
# Run this on your local machine or use a cron service like cron-job.org

$RENDER_URL = "https://shoe-store-api.onrender.com"

Write-Host "🔄 Pinging $RENDER_URL to keep it awake..." -ForegroundColor Cyan

while ($true) {
    try {
        $response = Invoke-RestMethod -Uri "$RENDER_URL/api/health" -Method Get
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        Write-Host "[$timestamp] ✅ Ping successful - Status: $($response.status)" -ForegroundColor Green
    } catch {
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        Write-Host "[$timestamp] ❌ Ping failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    # Wait 14 minutes before next ping
    Start-Sleep -Seconds 840
}
