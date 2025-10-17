# Comprehensive 15-minute Health Monitoring Script
# Validates: SC-004, SC-005, SC-006, SC-007, SC-010

$DURATION = 900  # 15 minutes in seconds
$INTERVAL = 60   # Check every 60 seconds
$BACKEND_APP = "medio-backend"
$FRONTEND_APP = "medio-react-app"
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
$REPORT_FILE = "monitoring-report-$TIMESTAMP.txt"

function Write-Log {
    param($Message)
    Write-Host $Message
    Add-Content -Path $REPORT_FILE -Value $Message
}

Write-Log "======================================="
Write-Log "MEDIO FLY.IO DEPLOYMENT HEALTH MONITOR"
Write-Log "======================================="
Write-Log "Start Time: $(Get-Date)"
Write-Log "Duration: 15 minutes"
Write-Log "Interval: 60 seconds"
Write-Log ""

# Initialize counters
$total_checks = 0
$backend_health_pass = 0
$backend_health_fail = 0
$frontend_health_pass = 0
$frontend_health_fail = 0
$error_502_count = 0
$error_503_count = 0
$error_500_count = 0
$backend_response_times = @()
$query_times = @()

$start_time = Get-Date
$check_count = 0

Write-Log "Starting monitoring loop..."
Write-Log ""

while (((Get-Date) - $start_time).TotalSeconds -lt $DURATION) {
    $check_count++
    $current_time = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

    Write-Log "========================================"
    Write-Log "CHECK #$check_count at $current_time"
    Write-Log "========================================"

    # MONITOR-001: Backend Status Check
    Write-Log ""
    Write-Log "[MONITOR-001] Backend Status:"
    $backend_status = flyctl status -a $BACKEND_APP 2>&1 | Out-String
    Write-Log $backend_status

    # MONITOR-002: Health Check Validation
    Write-Log ""
    Write-Log "[MONITOR-002] Health Check Status:"
    $backend_checks = flyctl checks list -a $BACKEND_APP 2>&1 | Out-String
    Write-Log $backend_checks

    # Count passing vs failing health checks
    if ($backend_checks -match "passing") {
        $backend_health_pass++
        Write-Log "  Backend health: PASS"
    } else {
        $backend_health_fail++
        Write-Log "  Backend health: FAIL"
    }

    # Check frontend health
    $frontend_checks = flyctl checks list -a $FRONTEND_APP 2>&1 | Out-String
    if ($frontend_checks -match "passing") {
        $frontend_health_pass++
        Write-Log "  Frontend health: PASS"
    } else {
        $frontend_health_fail++
        Write-Log "  Frontend health: FAIL"
    }

    $total_checks++

    # MONITOR-003: Backend Log Analysis
    Write-Log ""
    Write-Log "[MONITOR-003] Backend Logs (recent):"
    $backend_logs = flyctl logs -a $BACKEND_APP -n 2>&1 | Select-Object -Last 50 | Out-String
    Write-Log $backend_logs

    # MONITOR-006: Check for 502/503 errors (SC-007)
    $error_502 = ($backend_logs | Select-String -Pattern "502" -AllMatches).Matches.Count
    $error_503 = ($backend_logs | Select-String -Pattern "503" -AllMatches).Matches.Count
    $error_500 = ($backend_logs | Select-String -Pattern "500" -AllMatches).Matches.Count
    $error_502_count += $error_502
    $error_503_count += $error_503
    $error_500_count += $error_500

    Write-Log ""
    Write-Log "[MONITOR-006] Error Detection:"
    Write-Log "  502 errors this check: $error_502"
    Write-Log "  503 errors this check: $error_503"
    Write-Log "  500 errors this check: $error_500"

    # MONITOR-007: Database Query Performance (SC-010)
    Write-Log ""
    Write-Log "[MONITOR-007] Database Query Analysis:"
    $query_logs = $backend_logs | Select-String -Pattern "query" | Out-String
    if ($query_logs) {
        Write-Log $query_logs

        # Extract query times if present
        $matches = [regex]::Matches($backend_logs, "(\d+)ms")
        foreach ($match in $matches) {
            $query_time = [int]$match.Groups[1].Value
            if ($query_time -gt 0 -and $query_time -lt 10000) {  # Sanity check
                $query_times += $query_time
                Write-Log "  Query time detected: ${query_time}ms"
            }
        }
    } else {
        Write-Log "  No queries found in recent logs"
    }

    # MONITOR-005: Test health endpoint response time
    Write-Log ""
    Write-Log "[MONITOR-005] Health Endpoint Response Test:"

    try {
        $start_req = Get-Date
        $response = Invoke-WebRequest -Uri "https://medio-backend.fly.dev/health" -UseBasicParsing -TimeoutSec 10
        $end_req = Get-Date
        $response_ms = ($end_req - $start_req).TotalMilliseconds
        $backend_response_times += $response_ms
        Write-Log "  Backend /health response: $([math]::Round($response_ms, 2))ms (Status: $($response.StatusCode))"
    } catch {
        Write-Log "  Backend /health response: FAILED - $($_.Exception.Message)"
    }

    # MONITOR-004: Frontend Logs
    Write-Log ""
    Write-Log "[MONITOR-004] Frontend Logs:"
    $frontend_logs = flyctl logs -a $FRONTEND_APP -n 2>&1 | Select-Object -Last 30 | Out-String
    Write-Log $frontend_logs

    Write-Log ""
    Write-Log "Waiting $INTERVAL seconds until next check..."
    Write-Log ""

    # Wait for next interval (unless this is the last iteration)
    $elapsed = ((Get-Date) - $start_time).TotalSeconds
    if ($elapsed -lt $DURATION) {
        Start-Sleep -Seconds $INTERVAL
    }
}

# Calculate final statistics
Write-Log ""
Write-Log "========================================"
Write-Log "MONITORING SUMMARY REPORT"
Write-Log "========================================"
Write-Log "End Time: $(Get-Date)"
Write-Log ""

Write-Log "OBSERVATION METRICS:"
Write-Log "  Total monitoring time: 15 minutes"
Write-Log "  Total checks performed: $total_checks"
Write-Log ""

Write-Log "HEALTH CHECK RESULTS (SC-006):"
Write-Log "  Backend passing: $backend_health_pass"
Write-Log "  Backend failing: $backend_health_fail"
Write-Log "  Frontend passing: $frontend_health_pass"
Write-Log "  Frontend failing: $frontend_health_fail"

$total_health_checks = $backend_health_pass + $backend_health_fail + $frontend_health_pass + $frontend_health_fail
$total_health_pass = $backend_health_pass + $frontend_health_pass
$success_rate = if ($total_health_checks -gt 0) { [math]::Round(($total_health_pass * 100) / $total_health_checks, 2) } else { 0 }
Write-Log "  Overall success rate: $success_rate%"
Write-Log ""

# Calculate response time statistics
if ($backend_response_times.Count -gt 0) {
    $min_response = ($backend_response_times | Measure-Object -Minimum).Minimum
    $max_response = ($backend_response_times | Measure-Object -Maximum).Maximum
    $avg_response = ($backend_response_times | Measure-Object -Average).Average

    Write-Log "RESPONSE TIME STATISTICS:"
    Write-Log "  Average: $([math]::Round($avg_response, 2))ms"
    Write-Log "  Minimum: $([math]::Round($min_response, 2))ms"
    Write-Log "  Maximum: $([math]::Round($max_response, 2))ms"
    Write-Log ""
}

Write-Log "ERROR ANALYSIS (SC-007):"
Write-Log "  Total 502 errors: $error_502_count"
Write-Log "  Total 503 errors: $error_503_count"
Write-Log "  Total 500 errors: $error_500_count"
Write-Log ""

# Database query performance
if ($query_times.Count -gt 0) {
    $max_query = ($query_times | Measure-Object -Maximum).Maximum
    $avg_query = ($query_times | Measure-Object -Average).Average

    Write-Log "DATABASE QUERY PERFORMANCE (SC-010):"
    Write-Log "  Total queries detected: $($query_times.Count)"
    Write-Log "  Average query time: $([math]::Round($avg_query, 2))ms"
    Write-Log "  Maximum query time: $max_query ms"

    if ($max_query -lt 500) {
        Write-Log "  SC-010 Status: PASS (all queries < 500ms)"
    } else {
        Write-Log "  SC-010 Status: FAIL (queries exceed 500ms)"
    }
} else {
    Write-Log "DATABASE QUERY PERFORMANCE (SC-010):"
    Write-Log "  No database queries detected in logs"
}
Write-Log ""

Write-Log "SUCCESS CRITERIA VALIDATION:"
Write-Log ""

# SC-004: Backend deployed and accessible
Write-Log "SC-004 - Backend deployed and accessible:"
if ($backend_health_pass -gt 0) {
    Write-Log "  Status: PASS - Backend is accessible and responding"
} else {
    Write-Log "  Status: FAIL - Backend not accessible"
}
Write-Log ""

# SC-005: Frontend deployed and accessible
Write-Log "SC-005 - Frontend deployed and accessible:"
if ($frontend_health_pass -gt 0) {
    Write-Log "  Status: PASS - Frontend is accessible and responding"
} else {
    Write-Log "  Status: FAIL - Frontend not accessible"
}
Write-Log ""

# SC-006: 100% health check success rate
Write-Log "SC-006 - Health check success rate 100% for 15 minutes:"
if ($success_rate -eq 100) {
    Write-Log "  Status: PASS - Success rate: $success_rate%"
} else {
    Write-Log "  Status: FAIL - Success rate: $success_rate% (required: 100%)"
}
Write-Log ""

# SC-007: No 502/503 errors
Write-Log "SC-007 - Zero 502/503 errors during monitoring:"
if ($error_502_count -eq 0 -and $error_503_count -eq 0) {
    Write-Log "  Status: PASS - No gateway errors detected"
} else {
    Write-Log "  Status: FAIL - Found $error_502_count 502 errors and $error_503_count 503 errors"
}
Write-Log ""

# SC-010: Query performance
Write-Log "SC-010 - Database queries complete in <500ms:"
if ($query_times.Count -eq 0) {
    Write-Log "  Status: INCONCLUSIVE - No queries detected during monitoring"
} elseif ($max_query -lt 500) {
    Write-Log "  Status: PASS - All queries < 500ms (max: $max_query ms)"
} else {
    Write-Log "  Status: FAIL - Queries exceed 500ms (max: $max_query ms)"
}
Write-Log ""

Write-Log "========================================"
Write-Log "TASK COMPLETION STATUS"
Write-Log "========================================"
Write-Log ""
Write-Log "MONITOR-001 (Backend status monitoring): COMPLETED"
Write-Log "MONITOR-002 (Health check verification): COMPLETED"
Write-Log "MONITOR-003 (Backend log monitoring): COMPLETED"
Write-Log "MONITOR-004 (Frontend log monitoring): COMPLETED"
Write-Log "MONITOR-005 (API request monitoring): COMPLETED"
Write-Log "MONITOR-006 (502/503 error detection): COMPLETED"
Write-Log "MONITOR-007 (Database query performance): COMPLETED"
Write-Log ""

Write-Log "========================================"
Write-Log "Full report saved to: $REPORT_FILE"
Write-Log "Monitoring complete!"

Write-Host "`nReport location: $((Get-Location).Path)\$REPORT_FILE"
