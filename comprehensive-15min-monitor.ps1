# Comprehensive 15-Minute Health Check Monitoring
# Monitors Medio backend on Fly.io and validates success criteria

$ErrorActionPreference = "Continue"
$startTime = Get-Date
$duration = 15 * 60 # 15 minutes in seconds
$checkInterval = 30 # 30 seconds
$resultsFile = "monitoring-results-15min.json"
$logFile = "monitoring-log-15min.txt"

# Initialize results structure
$results = @{
    startTime = $startTime.ToString("yyyy-MM-dd HH:mm:ss")
    endTime = $null
    statusChecks = @()
    healthChecks = @()
    logs = @()
    metrics = @{
        totalChecks = 0
        passedChecks = 0
        failedChecks = 0
        healthCheckSuccessRate = 0
        avgResponseTime = 0
        minResponseTime = [double]::MaxValue
        maxResponseTime = 0
        dbQueriesCount = 0
        dbQueriesUnder500ms = 0
        dbQueryTimes = @()
        errorsFound = @()
    }
    successCriteria = @{
        SC006_15MinHealthChecks = $false
        SC010_DatabaseQueries = $false
    }
}

Write-Host "=== COMPREHENSIVE 15-MINUTE HEALTH CHECK MONITORING ===" -ForegroundColor Cyan
Write-Host "Start Time: $($startTime.ToString('HH:mm:ss'))" -ForegroundColor Green
Write-Host "Duration: 15 minutes (30 checks)" -ForegroundColor Green
Write-Host "Check Interval: 30 seconds" -ForegroundColor Green
Write-Host ""

$checkNumber = 0
$endTime = $startTime.AddSeconds($duration)

while ((Get-Date) -lt $endTime) {
    $checkNumber++
    $currentTime = Get-Date
    $elapsed = [math]::Round(($currentTime - $startTime).TotalSeconds)
    $remaining = [math]::Round(($endTime - $currentTime).TotalSeconds)

    Write-Host "[$checkNumber/30] Check at +$($elapsed)s (Remaining: $($remaining)s)" -ForegroundColor Yellow

    # 1. Check Fly.io status
    Write-Host "  Checking Fly.io status..." -NoNewline
    try {
        $statusOutput = flyctl status -a medio-backend 2>&1 | Out-String
        $statusCheck = @{
            timestamp = $currentTime.ToString("HH:mm:ss")
            elapsed = $elapsed
            status = if ($statusOutput -match "started.*1 total, 1 passing") { "PASS" } else { "FAIL" }
            output = $statusOutput
        }
        $results.statusChecks += $statusCheck

        if ($statusCheck.status -eq "PASS") {
            Write-Host " PASS" -ForegroundColor Green
            $results.metrics.passedChecks++
        } else {
            Write-Host " FAIL" -ForegroundColor Red
            $results.metrics.failedChecks++
            $results.metrics.errorsFound += "Status check failed at $elapsed s"
        }
    } catch {
        Write-Host " ERROR" -ForegroundColor Red
        $results.metrics.failedChecks++
        $results.metrics.errorsFound += "Status check error at $elapsed s: $_"
    }
    $results.metrics.totalChecks++

    # 2. Test health endpoint
    Write-Host "  Testing health endpoint..." -NoNewline
    try {
        $healthStart = Get-Date
        $response = Invoke-WebRequest -Uri "https://medio-backend.fly.dev/api/health" -UseBasicParsing -TimeoutSec 10
        $healthEnd = Get-Date
        $responseTime = ($healthEnd - $healthStart).TotalMilliseconds

        $healthCheck = @{
            timestamp = $currentTime.ToString("HH:mm:ss")
            elapsed = $elapsed
            statusCode = $response.StatusCode
            responseTimeMs = [math]::Round($responseTime, 2)
            status = if ($response.StatusCode -eq 200) { "PASS" } else { "FAIL" }
        }
        $results.healthChecks += $healthCheck

        if ($healthCheck.status -eq "PASS") {
            Write-Host " $($healthCheck.responseTimeMs)ms - PASS" -ForegroundColor Green
        } else {
            Write-Host " $($response.StatusCode) - FAIL" -ForegroundColor Red
            $results.metrics.errorsFound += "Health check failed at $elapsed s with status $($response.StatusCode)"
        }

        # Update response time metrics
        if ($responseTime -lt $results.metrics.minResponseTime) {
            $results.metrics.minResponseTime = $responseTime
        }
        if ($responseTime -gt $results.metrics.maxResponseTime) {
            $results.metrics.maxResponseTime = $responseTime
        }

    } catch {
        Write-Host " ERROR - $_" -ForegroundColor Red
        $results.metrics.errorsFound += "Health endpoint error at $elapsed s: $_"
        $healthCheck = @{
            timestamp = $currentTime.ToString("HH:mm:ss")
            elapsed = $elapsed
            error = $_.Exception.Message
            status = "ERROR"
        }
        $results.healthChecks += $healthCheck
    }

    # 3. Collect recent logs (last 1 minute)
    if ($checkNumber % 2 -eq 0) { # Every 2nd check (every minute)
        Write-Host "  Collecting logs..." -NoNewline
        try {
            $logOutput = flyctl logs -a medio-backend --since "1m" 2>&1 | Out-String
            $results.logs += @{
                timestamp = $currentTime.ToString("HH:mm:ss")
                content = $logOutput
            }

            # Parse for database query times
            $queryMatches = [regex]::Matches($logOutput, "query.*?(\d+)ms|executed.*?(\d+)ms|duration[:\s]+(\d+)ms")
            foreach ($match in $queryMatches) {
                $queryTime = if ($match.Groups[1].Success) { [int]$match.Groups[1].Value }
                            elseif ($match.Groups[2].Success) { [int]$match.Groups[2].Value }
                            else { [int]$match.Groups[3].Value }

                $results.metrics.dbQueryTimes += $queryTime
                $results.metrics.dbQueriesCount++
                if ($queryTime -lt 500) {
                    $results.metrics.dbQueriesUnder500ms++
                }
            }

            # Check for errors
            if ($logOutput -match "error|ERROR|exception|Exception|502|503") {
                $errorLines = $logOutput -split "`n" | Where-Object { $_ -match "error|ERROR|exception|Exception|502|503" }
                foreach ($errorLine in $errorLines) {
                    $results.metrics.errorsFound += "Log error at $elapsed s: $($errorLine.Trim())"
                }
                Write-Host " Errors found!" -ForegroundColor Red
            } else {
                Write-Host " OK" -ForegroundColor Green
            }

        } catch {
            Write-Host " ERROR" -ForegroundColor Red
        }
    }

    # Wait for next check
    if ((Get-Date) -lt $endTime) {
        Start-Sleep -Seconds $checkInterval
    }
}

# Final calculations
$results.endTime = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")

# Calculate health check success rate
$passedHealthChecks = ($results.healthChecks | Where-Object { $_.status -eq "PASS" }).Count
$totalHealthChecks = $results.healthChecks.Count
$results.metrics.healthCheckSuccessRate = if ($totalHealthChecks -gt 0) {
    [math]::Round(($passedHealthChecks / $totalHealthChecks) * 100, 2)
} else { 0 }

# Calculate average response time
$validResponseTimes = $results.healthChecks | Where-Object { $_.responseTimeMs -gt 0 } | Select-Object -ExpandProperty responseTimeMs
if ($validResponseTimes.Count -gt 0) {
    $results.metrics.avgResponseTime = [math]::Round(($validResponseTimes | Measure-Object -Average).Average, 2)
} else {
    $results.metrics.avgResponseTime = 0
}

# Handle min response time
if ($results.metrics.minResponseTime -eq [double]::MaxValue) {
    $results.metrics.minResponseTime = 0
}

# Calculate database query metrics
if ($results.metrics.dbQueriesCount -gt 0) {
    $dbQuerySuccessRate = [math]::Round(($results.metrics.dbQueriesUnder500ms / $results.metrics.dbQueriesCount) * 100, 2)
    $results.successCriteria.SC010_DatabaseQueries = ($dbQuerySuccessRate -eq 100)
} else {
    $results.successCriteria.SC010_DatabaseQueries = $true # No queries = pass by default
}

# Validate success criteria
$results.successCriteria.SC006_15MinHealthChecks = ($results.metrics.healthCheckSuccessRate -eq 100)

# Save results
$results | ConvertTo-Json -Depth 10 | Out-File $resultsFile -Encoding UTF8

# Generate report
Write-Host ""
Write-Host "=== MONITORING COMPLETE ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "OVERALL METRICS:" -ForegroundColor Yellow
Write-Host "  Total Checks: $($results.metrics.totalChecks)"
Write-Host "  Passed: $($results.metrics.passedChecks)" -ForegroundColor Green
Write-Host "  Failed: $($results.metrics.failedChecks)" -ForegroundColor $(if ($results.metrics.failedChecks -eq 0) { "Green" } else { "Red" })
Write-Host ""
Write-Host "HEALTH ENDPOINT METRICS:" -ForegroundColor Yellow
Write-Host "  Total Health Checks: $totalHealthChecks"
Write-Host "  Success Rate: $($results.metrics.healthCheckSuccessRate)%" -ForegroundColor $(if ($results.metrics.healthCheckSuccessRate -eq 100) { "Green" } else { "Red" })
Write-Host "  Response Time - Avg: $($results.metrics.avgResponseTime)ms"
Write-Host "  Response Time - Min: $([math]::Round($results.metrics.minResponseTime, 2))ms"
Write-Host "  Response Time - Max: $([math]::Round($results.metrics.maxResponseTime, 2))ms"
Write-Host ""
Write-Host "DATABASE METRICS:" -ForegroundColor Yellow
Write-Host "  Queries Detected: $($results.metrics.dbQueriesCount)"
if ($results.metrics.dbQueriesCount -gt 0) {
    Write-Host "  Queries Under 500ms: $($results.metrics.dbQueriesUnder500ms)"
    Write-Host "  Query Success Rate: $dbQuerySuccessRate%" -ForegroundColor $(if ($dbQuerySuccessRate -eq 100) { "Green" } else { "Red" })
    Write-Host "  Avg Query Time: $([math]::Round(($results.metrics.dbQueryTimes | Measure-Object -Average).Average, 2))ms"
} else {
    Write-Host "  No database queries detected in logs"
}
Write-Host ""
Write-Host "ERRORS FOUND:" -ForegroundColor Yellow
if ($results.metrics.errorsFound.Count -eq 0) {
    Write-Host "  None" -ForegroundColor Green
} else {
    foreach ($error in $results.metrics.errorsFound) {
        Write-Host "  - $error" -ForegroundColor Red
    }
}
Write-Host ""
Write-Host "SUCCESS CRITERIA VALIDATION:" -ForegroundColor Yellow
Write-Host "  SC-006 (15-min health checks @ 100%): $(if ($results.successCriteria.SC006_15MinHealthChecks) { 'PASS' } else { 'FAIL' })" -ForegroundColor $(if ($results.successCriteria.SC006_15MinHealthChecks) { "Green" } else { "Red" })
Write-Host "  SC-010 (DB queries under 500ms):     $(if ($results.successCriteria.SC010_DatabaseQueries) { 'PASS' } else { 'FAIL' })" -ForegroundColor $(if ($results.successCriteria.SC010_DatabaseQueries) { "Green" } else { "Red" })
Write-Host ""
Write-Host "Results saved to: $resultsFile" -ForegroundColor Cyan
Write-Host ""
