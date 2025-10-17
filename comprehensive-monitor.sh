#!/bin/bash

# Comprehensive 15-minute Health Monitoring Script
# Validates: SC-004, SC-005, SC-006, SC-007, SC-010

DURATION=900  # 15 minutes in seconds
INTERVAL=60   # Check every 60 seconds
BACKEND_APP="medio-backend"
FRONTEND_APP="medio-react-app"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="monitoring-report-${TIMESTAMP}.txt"

echo "=======================================" | tee -a $REPORT_FILE
echo "MEDIO FLY.IO DEPLOYMENT HEALTH MONITOR" | tee -a $REPORT_FILE
echo "=======================================" | tee -a $REPORT_FILE
echo "Start Time: $(date)" | tee -a $REPORT_FILE
echo "Duration: 15 minutes" | tee -a $REPORT_FILE
echo "Interval: 60 seconds" | tee -a $REPORT_FILE
echo "" | tee -a $REPORT_FILE

# Initialize counters
total_checks=0
backend_health_pass=0
backend_health_fail=0
frontend_health_pass=0
frontend_health_fail=0
error_502_count=0
error_503_count=0
error_500_count=0
declare -a backend_response_times=()
declare -a query_times=()

# Start time
start_time=$(date +%s)
check_count=0

echo "Starting monitoring loop..." | tee -a $REPORT_FILE
echo "" | tee -a $REPORT_FILE

while [ $(($(date +%s) - start_time)) -lt $DURATION ]; do
    check_count=$((check_count + 1))
    current_time=$(date +"%Y-%m-%d %H:%M:%S")

    echo "========================================" | tee -a $REPORT_FILE
    echo "CHECK #${check_count} at ${current_time}" | tee -a $REPORT_FILE
    echo "========================================" | tee -a $REPORT_FILE

    # MONITOR-001: Backend Status Check
    echo "" | tee -a $REPORT_FILE
    echo "[MONITOR-001] Backend Status:" | tee -a $REPORT_FILE
    flyctl status -a $BACKEND_APP 2>&1 | tee -a $REPORT_FILE

    # MONITOR-002: Health Check Validation
    echo "" | tee -a $REPORT_FILE
    echo "[MONITOR-002] Health Check Status:" | tee -a $REPORT_FILE
    backend_checks=$(flyctl checks list -a $BACKEND_APP 2>&1)
    echo "$backend_checks" | tee -a $REPORT_FILE

    # Count passing vs failing health checks
    if echo "$backend_checks" | grep -q "passing"; then
        backend_health_pass=$((backend_health_pass + 1))
        echo "  Backend health: PASS" | tee -a $REPORT_FILE
    else
        backend_health_fail=$((backend_health_fail + 1))
        echo "  Backend health: FAIL" | tee -a $REPORT_FILE
    fi

    # Check frontend health
    frontend_checks=$(flyctl checks list -a $FRONTEND_APP 2>&1)
    if echo "$frontend_checks" | grep -q "passing"; then
        frontend_health_pass=$((frontend_health_pass + 1))
        echo "  Frontend health: PASS" | tee -a $REPORT_FILE
    else
        frontend_health_fail=$((frontend_health_fail + 1))
        echo "  Frontend health: FAIL" | tee -a $REPORT_FILE
    fi

    total_checks=$((total_checks + 1))

    # MONITOR-003 & 004: Log Analysis
    echo "" | tee -a $REPORT_FILE
    echo "[MONITOR-003] Backend Logs (last 30 seconds):" | tee -a $REPORT_FILE
    backend_logs=$(flyctl logs -a $BACKEND_APP -n 2>&1 | tail -50)
    echo "$backend_logs" | tee -a $REPORT_FILE

    # MONITOR-006: Check for 502/503 errors (SC-007)
    error_502=$(echo "$backend_logs" | grep -c "502" || echo 0)
    error_503=$(echo "$backend_logs" | grep -c "503" || echo 0)
    error_500=$(echo "$backend_logs" | grep -c "500" || echo 0)
    error_502_count=$((error_502_count + error_502))
    error_503_count=$((error_503_count + error_503))
    error_500_count=$((error_500_count + error_500))

    echo "" | tee -a $REPORT_FILE
    echo "[MONITOR-006] Error Detection:" | tee -a $REPORT_FILE
    echo "  502 errors this check: $error_502" | tee -a $REPORT_FILE
    echo "  503 errors this check: $error_503" | tee -a $REPORT_FILE
    echo "  500 errors this check: $error_500" | tee -a $REPORT_FILE

    # MONITOR-007: Database Query Performance (SC-010)
    echo "" | tee -a $REPORT_FILE
    echo "[MONITOR-007] Database Query Analysis:" | tee -a $REPORT_FILE
    query_logs=$(echo "$backend_logs" | grep -i "query" || echo "No queries found")
    echo "$query_logs" | tee -a $REPORT_FILE

    # Extract query times if present (looking for patterns like "query: 123ms")
    query_time=$(echo "$backend_logs" | grep -oP "query.*?(\d+)ms" | grep -oP "\d+ms" | grep -oP "\d+" || echo "")
    if [ ! -z "$query_time" ]; then
        query_times+=($query_time)
        echo "  Query time detected: ${query_time}ms" | tee -a $REPORT_FILE
    fi

    # MONITOR-005: Test health endpoint response time
    echo "" | tee -a $REPORT_FILE
    echo "[MONITOR-005] Health Endpoint Response Test:" | tee -a $REPORT_FILE

    # Test backend health endpoint
    response_time=$(curl -o /dev/null -s -w '%{time_total}\n' https://medio-backend.fly.dev/health 2>&1 || echo "0")
    if [ "$response_time" != "0" ]; then
        # Convert to milliseconds
        response_ms=$(echo "$response_time * 1000" | bc)
        backend_response_times+=($response_ms)
        echo "  Backend /health response: ${response_ms}ms" | tee -a $REPORT_FILE
    else
        echo "  Backend /health response: FAILED" | tee -a $REPORT_FILE
    fi

    # Frontend status
    echo "" | tee -a $REPORT_FILE
    echo "[MONITOR-004] Frontend Logs:" | tee -a $REPORT_FILE
    flyctl logs -a $FRONTEND_APP -n 2>&1 | tail -30 | tee -a $REPORT_FILE

    echo "" | tee -a $REPORT_FILE
    echo "Waiting ${INTERVAL} seconds until next check..." | tee -a $REPORT_FILE
    echo "" | tee -a $REPORT_FILE

    # Wait for next interval
    sleep $INTERVAL
done

# Calculate final statistics
echo "" | tee -a $REPORT_FILE
echo "========================================" | tee -a $REPORT_FILE
echo "MONITORING SUMMARY REPORT" | tee -a $REPORT_FILE
echo "========================================" | tee -a $REPORT_FILE
echo "End Time: $(date)" | tee -a $REPORT_FILE
echo "" | tee -a $REPORT_FILE

echo "OBSERVATION METRICS:" | tee -a $REPORT_FILE
echo "  Total monitoring time: 15 minutes" | tee -a $REPORT_FILE
echo "  Total checks performed: $total_checks" | tee -a $REPORT_FILE
echo "" | tee -a $REPORT_FILE

echo "HEALTH CHECK RESULTS (SC-006):" | tee -a $REPORT_FILE
echo "  Backend passing: $backend_health_pass" | tee -a $REPORT_FILE
echo "  Backend failing: $backend_health_fail" | tee -a $REPORT_FILE
echo "  Frontend passing: $frontend_health_pass" | tee -a $REPORT_FILE
echo "  Frontend failing: $frontend_health_fail" | tee -a $REPORT_FILE

total_health_checks=$((backend_health_pass + backend_health_fail + frontend_health_pass + frontend_health_fail))
total_health_pass=$((backend_health_pass + frontend_health_pass))
success_rate=0
if [ $total_health_checks -gt 0 ]; then
    success_rate=$(echo "scale=2; ($total_health_pass * 100) / $total_health_checks" | bc)
fi
echo "  Overall success rate: ${success_rate}%" | tee -a $REPORT_FILE
echo "" | tee -a $REPORT_FILE

# Calculate response time statistics
if [ ${#backend_response_times[@]} -gt 0 ]; then
    min_response=${backend_response_times[0]}
    max_response=${backend_response_times[0]}
    sum_response=0

    for time in "${backend_response_times[@]}"; do
        sum_response=$(echo "$sum_response + $time" | bc)
        if (( $(echo "$time < $min_response" | bc -l) )); then
            min_response=$time
        fi
        if (( $(echo "$time > $max_response" | bc -l) )); then
            max_response=$time
        fi
    done

    avg_response=$(echo "scale=2; $sum_response / ${#backend_response_times[@]}" | bc)

    echo "RESPONSE TIME STATISTICS:" | tee -a $REPORT_FILE
    echo "  Average: ${avg_response}ms" | tee -a $REPORT_FILE
    echo "  Minimum: ${min_response}ms" | tee -a $REPORT_FILE
    echo "  Maximum: ${max_response}ms" | tee -a $REPORT_FILE
    echo "" | tee -a $REPORT_FILE
fi

echo "ERROR ANALYSIS (SC-007):" | tee -a $REPORT_FILE
echo "  Total 502 errors: $error_502_count" | tee -a $REPORT_FILE
echo "  Total 503 errors: $error_503_count" | tee -a $REPORT_FILE
echo "  Total 500 errors: $error_500_count" | tee -a $REPORT_FILE
echo "" | tee -a $REPORT_FILE

# Database query performance
if [ ${#query_times[@]} -gt 0 ]; then
    echo "DATABASE QUERY PERFORMANCE (SC-010):" | tee -a $REPORT_FILE
    echo "  Total queries detected: ${#query_times[@]}" | tee -a $REPORT_FILE

    max_query=0
    for qtime in "${query_times[@]}"; do
        if [ $qtime -gt $max_query ]; then
            max_query=$qtime
        fi
    done

    echo "  Maximum query time: ${max_query}ms" | tee -a $REPORT_FILE

    if [ $max_query -lt 500 ]; then
        echo "  SC-010 Status: PASS (all queries < 500ms)" | tee -a $REPORT_FILE
    else
        echo "  SC-010 Status: FAIL (queries exceed 500ms)" | tee -a $REPORT_FILE
    fi
else
    echo "DATABASE QUERY PERFORMANCE (SC-010):" | tee -a $REPORT_FILE
    echo "  No database queries detected in logs" | tee -a $REPORT_FILE
fi
echo "" | tee -a $REPORT_FILE

echo "SUCCESS CRITERIA VALIDATION:" | tee -a $REPORT_FILE
echo "" | tee -a $REPORT_FILE

# SC-004: Backend deployed and accessible
echo "SC-004 - Backend deployed and accessible:" | tee -a $REPORT_FILE
if [ $backend_health_pass -gt 0 ]; then
    echo "  Status: PASS - Backend is accessible and responding" | tee -a $REPORT_FILE
else
    echo "  Status: FAIL - Backend not accessible" | tee -a $REPORT_FILE
fi
echo "" | tee -a $REPORT_FILE

# SC-005: Frontend deployed and accessible
echo "SC-005 - Frontend deployed and accessible:" | tee -a $REPORT_FILE
if [ $frontend_health_pass -gt 0 ]; then
    echo "  Status: PASS - Frontend is accessible and responding" | tee -a $REPORT_FILE
else
    echo "  Status: FAIL - Frontend not accessible" | tee -a $REPORT_FILE
fi
echo "" | tee -a $REPORT_FILE

# SC-006: 100% health check success rate
echo "SC-006 - Health check success rate 100% for 15 minutes:" | tee -a $REPORT_FILE
if [ "$success_rate" = "100.00" ] || [ "$success_rate" = "100" ]; then
    echo "  Status: PASS - Success rate: ${success_rate}%" | tee -a $REPORT_FILE
else
    echo "  Status: FAIL - Success rate: ${success_rate}% (required: 100%)" | tee -a $REPORT_FILE
fi
echo "" | tee -a $REPORT_FILE

# SC-007: No 502/503 errors
echo "SC-007 - Zero 502/503 errors during monitoring:" | tee -a $REPORT_FILE
if [ $error_502_count -eq 0 ] && [ $error_503_count -eq 0 ]; then
    echo "  Status: PASS - No gateway errors detected" | tee -a $REPORT_FILE
else
    echo "  Status: FAIL - Found $error_502_count 502 errors and $error_503_count 503 errors" | tee -a $REPORT_FILE
fi
echo "" | tee -a $REPORT_FILE

# SC-010: Query performance
echo "SC-010 - Database queries complete in <500ms:" | tee -a $REPORT_FILE
if [ ${#query_times[@]} -eq 0 ]; then
    echo "  Status: INCONCLUSIVE - No queries detected during monitoring" | tee -a $REPORT_FILE
elif [ $max_query -lt 500 ]; then
    echo "  Status: PASS - All queries < 500ms (max: ${max_query}ms)" | tee -a $REPORT_FILE
else
    echo "  Status: FAIL - Queries exceed 500ms (max: ${max_query}ms)" | tee -a $REPORT_FILE
fi
echo "" | tee -a $REPORT_FILE

echo "========================================" | tee -a $REPORT_FILE
echo "TASK COMPLETION STATUS" | tee -a $REPORT_FILE
echo "========================================" | tee -a $REPORT_FILE
echo "" | tee -a $REPORT_FILE
echo "MONITOR-001 (Backend status monitoring): COMPLETED" | tee -a $REPORT_FILE
echo "MONITOR-002 (Health check verification): COMPLETED" | tee -a $REPORT_FILE
echo "MONITOR-003 (Backend log monitoring): COMPLETED" | tee -a $REPORT_FILE
echo "MONITOR-004 (Frontend log monitoring): COMPLETED" | tee -a $REPORT_FILE
echo "MONITOR-005 (API request monitoring): COMPLETED" | tee -a $REPORT_FILE
echo "MONITOR-006 (502/503 error detection): COMPLETED" | tee -a $REPORT_FILE
echo "MONITOR-007 (Database query performance): COMPLETED" | tee -a $REPORT_FILE
echo "" | tee -a $REPORT_FILE

echo "Full report saved to: $REPORT_FILE"
echo "Monitoring complete!"
