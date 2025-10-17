# Load Test Script for SC-009: 10 Concurrent Login Attempts
$baseUrl = "https://medio-backend.fly.dev"
$email = "test+deploy20251017b@example.com"
$password = "SecurePass123456!"
$concurrentRequests = 10

Write-Host "=== SC-009 Load Test: 10 Concurrent Login Attempts ===" -ForegroundColor Cyan
Write-Host "Target: $baseUrl" -ForegroundColor Gray
Write-Host "Test Account: $email" -ForegroundColor Gray
Write-Host ""

# Results tracking
$results = @()
$startTime = Get-Date

# Function to perform a single login attempt
function Invoke-LoginAttempt {
    param([int]$attemptNumber)

    $attemptStart = Get-Date

    try {
        # Step 1: Fetch CSRF token
        $csrfResponse = Invoke-WebRequest -Uri "$baseUrl/api/csrf-token" `
            -Method GET `
            -SessionVariable session `
            -UseBasicParsing `
            -ErrorAction Stop

        $csrfToken = ($csrfResponse.Content | ConvertFrom-Json).csrfToken

        # Step 2: Perform login with CSRF token
        $loginBody = @{
            email = $email
            password = $password
        } | ConvertTo-Json

        $loginResponse = Invoke-WebRequest -Uri "$baseUrl/api/auth/login" `
            -Method POST `
            -Headers @{
                "Content-Type" = "application/json"
                "X-CSRF-Token" = $csrfToken
            } `
            -Body $loginBody `
            -WebSession $session `
            -UseBasicParsing `
            -ErrorAction Stop

        $attemptEnd = Get-Date
        $duration = ($attemptEnd - $attemptStart).TotalMilliseconds

        return @{
            AttemptNumber = $attemptNumber
            Success = $true
            StatusCode = $loginResponse.StatusCode
            Duration = $duration
            Error = $null
        }
    }
    catch {
        $attemptEnd = Get-Date
        $duration = ($attemptEnd - $attemptStart).TotalMilliseconds

        return @{
            AttemptNumber = $attemptNumber
            Success = $false
            StatusCode = $_.Exception.Response.StatusCode.Value__
            Duration = $duration
            Error = $_.Exception.Message
        }
    }
}

# Execute concurrent requests using PowerShell jobs
Write-Host "Starting $concurrentRequests concurrent login attempts..." -ForegroundColor Yellow
$jobs = @()

for ($i = 1; $i -le $concurrentRequests; $i++) {
    $jobs += Start-Job -ScriptBlock ${function:Invoke-LoginAttempt} -ArgumentList $i
}

# Wait for all jobs to complete with timeout
Write-Host "Waiting for all requests to complete..." -ForegroundColor Yellow
$jobs | Wait-Job -Timeout 30 | Out-Null

# Collect results
foreach ($job in $jobs) {
    if ($job.State -eq 'Completed') {
        $result = Receive-Job -Job $job
        $results += $result
    }
    else {
        $results += @{
            AttemptNumber = $job.Id
            Success = $false
            StatusCode = 0
            Duration = 30000
            Error = "Job timeout or failed"
        }
    }
    Remove-Job -Job $job
}

$endTime = Get-Date
$totalDuration = ($endTime - $startTime).TotalSeconds

# Analysis
Write-Host ""
Write-Host "=== Test Results ===" -ForegroundColor Cyan

$successCount = ($results | Where-Object { $_.Success -eq $true }).Count
$failCount = $concurrentRequests - $successCount
$successRate = [math]::Round(($successCount / $concurrentRequests) * 100, 2)

$durations = $results | ForEach-Object { $_.Duration }
$avgDuration = [math]::Round(($durations | Measure-Object -Average).Average, 2)
$minDuration = [math]::Round(($durations | Measure-Object -Minimum).Minimum, 2)
$maxDuration = [math]::Round(($durations | Measure-Object -Maximum).Maximum, 2)

# Display individual results
Write-Host ""
Write-Host "Individual Request Results:" -ForegroundColor White
$results | Sort-Object AttemptNumber | ForEach-Object {
    $status = if ($_.Success) { "SUCCESS" } else { "FAILED" }
    $color = if ($_.Success) { "Green" } else { "Red" }
    $durationRounded = [math]::Round($_.Duration, 2)
    Write-Host "  Attempt $($_.AttemptNumber): $status - $durationRounded ms - Status: $($_.StatusCode)" -ForegroundColor $color
    if ($_.Error) {
        Write-Host "    Error: $($_.Error)" -ForegroundColor Red
    }
}

# Performance Metrics
Write-Host ""
Write-Host "=== Performance Metrics ===" -ForegroundColor Cyan
Write-Host "Total Requests:     $concurrentRequests" -ForegroundColor White
Write-Host "Successful:         $successCount" -ForegroundColor $(if ($successCount -eq $concurrentRequests) { "Green" } else { "Yellow" })
Write-Host "Failed:             $failCount" -ForegroundColor $(if ($failCount -eq 0) { "Green" } else { "Red" })
Write-Host "Success Rate:       $successRate%" -ForegroundColor $(if ($successRate -eq 100) { "Green" } else { "Yellow" })
Write-Host ""
Write-Host "Response Times:" -ForegroundColor White
Write-Host "  Average:          $avgDuration ms" -ForegroundColor $(if ($avgDuration -lt 2000) { "Green" } else { "Yellow" })
Write-Host "  Minimum:          $minDuration ms" -ForegroundColor Gray
Write-Host "  Maximum:          $maxDuration ms" -ForegroundColor $(if ($maxDuration -lt 2000) { "Green" } else { "Yellow" })
Write-Host ""
Write-Host "Total Test Duration: $totalDuration s" -ForegroundColor Gray

# SC-009 Validation
Write-Host ""
Write-Host "=== SC-009 Validation ===" -ForegroundColor Cyan
$sc009Pass = ($successCount -eq $concurrentRequests) -and ($maxDuration -lt 2000)
$sc009Status = if ($sc009Pass) { "PASS" } else { "FAIL" }
$sc009Color = if ($sc009Pass) { "Green" } else { "Red" }

Write-Host "SC-009: System handles 10 concurrent user login attempts without degradation" -ForegroundColor White
Write-Host "Status: $sc009Status" -ForegroundColor $sc009Color
Write-Host ""

if ($sc009Pass) {
    Write-Host "All concurrent logins succeeded with acceptable response times." -ForegroundColor Green
}
else {
    Write-Host "Issues detected:" -ForegroundColor Red
    if ($successCount -ne $concurrentRequests) {
        Write-Host "  - $failCount login failed" -ForegroundColor Red
    }
    if ($maxDuration -ge 2000) {
        Write-Host "  - Maximum response time ($maxDuration ms) exceeds 2s threshold" -ForegroundColor Red
    }
}

# Export results to JSON
$reportData = @{
    TestName = "SC-009: 10 Concurrent Login Attempts"
    Timestamp = $startTime.ToString("yyyy-MM-dd HH:mm:ss")
    Configuration = @{
        BaseUrl = $baseUrl
        ConcurrentRequests = $concurrentRequests
        TestAccount = $email
    }
    Results = @{
        TotalRequests = $concurrentRequests
        SuccessfulRequests = $successCount
        FailedRequests = $failCount
        SuccessRate = $successRate
    }
    PerformanceMetrics = @{
        AverageDurationMs = $avgDuration
        MinDurationMs = $minDuration
        MaxDurationMs = $maxDuration
        TotalDurationSec = $totalDuration
    }
    SC009Validation = @{
        Pass = $sc009Pass
        Status = $sc009Status
    }
    DetailedResults = $results
}

$reportJson = $reportData | ConvertTo-Json -Depth 10
$reportFile = "load-test-sc009-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
$reportJson | Out-File -FilePath $reportFile -Encoding utf8

Write-Host ""
Write-Host "Detailed results exported to: $reportFile" -ForegroundColor Gray
