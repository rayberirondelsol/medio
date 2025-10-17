#!/bin/bash

# 5-minute health monitoring script for Medio backend
# Author: Observability Engineer
# Date: 2025-10-17

APP_NAME="medio-backend"
HEALTH_URL="https://medio-backend.fly.dev/api/health"
MONITORING_DURATION=300  # 5 minutes
CHECK_INTERVAL=30        # 30 seconds
LOG_FILE="health-monitoring-$(date +%Y%m%d-%H%M%S).log"
METRICS_FILE="health-metrics-$(date +%Y%m%d-%H%M%S).json"

# Initialize metrics
TOTAL_CHECKS=0
SUCCESSFUL_CHECKS=0
FAILED_CHECKS=0
declare -a RESPONSE_TIMES=()
declare -a HTTP_CODES=()
DB_ERRORS=0
GATEWAY_ERRORS=0

echo "========================================" | tee -a "$LOG_FILE"
echo "Medio Backend Health Monitoring Report" | tee -a "$LOG_FILE"
echo "Started: $(date)" | tee -a "$LOG_FILE"
echo "Duration: ${MONITORING_DURATION}s (${CHECK_INTERVAL}s intervals)" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

START_TIME=$(date +%s)
CHECK_COUNT=0

while [ $(($(date +%s) - START_TIME)) -lt $MONITORING_DURATION ]; do
    CHECK_COUNT=$((CHECK_COUNT + 1))
    CURRENT_TIME=$(date +"%Y-%m-%d %H:%M:%S")

    echo "=== Check #${CHECK_COUNT} at ${CURRENT_TIME} ===" | tee -a "$LOG_FILE"

    # 1. Check Fly.io machine status
    echo "Checking machine status..." | tee -a "$LOG_FILE"
    flyctl status -a "$APP_NAME" 2>&1 | tee -a "$LOG_FILE"

    # 2. Test health endpoint with detailed metrics
    echo "" | tee -a "$LOG_FILE"
    echo "Testing health endpoint..." | tee -a "$LOG_FILE"

    HEALTH_RESPONSE=$(curl -w "\n__METRICS__\nhttp_code=%{http_code}\ntime_total=%{time_total}\ntime_connect=%{time_connect}\ntime_starttransfer=%{time_starttransfer}\nsize_download=%{size_download}" \
        -o - -s "$HEALTH_URL" 2>&1)

    # Parse response
    HTTP_CODE=$(echo "$HEALTH_RESPONSE" | grep "http_code=" | cut -d'=' -f2)
    RESPONSE_TIME=$(echo "$HEALTH_RESPONSE" | grep "time_total=" | cut -d'=' -f2)

    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    HTTP_CODES+=("$HTTP_CODE")
    RESPONSE_TIMES+=("$RESPONSE_TIME")

    if [ "$HTTP_CODE" = "200" ]; then
        SUCCESSFUL_CHECKS=$((SUCCESSFUL_CHECKS + 1))
        echo "✓ Health check PASSED (${RESPONSE_TIME}s)" | tee -a "$LOG_FILE"
    else
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        echo "✗ Health check FAILED (HTTP ${HTTP_CODE})" | tee -a "$LOG_FILE"

        # Track gateway errors
        if [ "$HTTP_CODE" = "502" ] || [ "$HTTP_CODE" = "503" ]; then
            GATEWAY_ERRORS=$((GATEWAY_ERRORS + 1))
        fi
    fi

    # Display response body
    echo "" | tee -a "$LOG_FILE"
    echo "Response body:" | tee -a "$LOG_FILE"
    echo "$HEALTH_RESPONSE" | grep -v "__METRICS__" | grep -v "http_code=" | grep -v "time_total=" | grep -v "time_connect=" | grep -v "time_starttransfer=" | grep -v "size_download=" | tee -a "$LOG_FILE"

    # 3. Check recent logs for errors
    echo "" | tee -a "$LOG_FILE"
    echo "Checking recent logs for errors..." | tee -a "$LOG_FILE"

    RECENT_LOGS=$(flyctl logs -a "$APP_NAME" --json 2>&1 | tail -20)

    # Check for database errors
    DB_ERROR_COUNT=$(echo "$RECENT_LOGS" | grep -i "database\|postgres\|connection.*error\|ECONNREFUSED" | wc -l)
    if [ "$DB_ERROR_COUNT" -gt 0 ]; then
        DB_ERRORS=$((DB_ERRORS + DB_ERROR_COUNT))
        echo "⚠ Found ${DB_ERROR_COUNT} database-related errors" | tee -a "$LOG_FILE"
        echo "$RECENT_LOGS" | grep -i "database\|postgres\|connection.*error\|ECONNREFUSED" | tee -a "$LOG_FILE"
    else
        echo "✓ No database errors found" | tee -a "$LOG_FILE"
    fi

    echo "" | tee -a "$LOG_FILE"
    echo "---" | tee -a "$LOG_FILE"
    echo "" | tee -a "$LOG_FILE"

    # Wait for next interval (unless it's the last check)
    ELAPSED=$(($(date +%s) - START_TIME))
    if [ $ELAPSED -lt $MONITORING_DURATION ]; then
        REMAINING=$((MONITORING_DURATION - ELAPSED))
        if [ $REMAINING -ge $CHECK_INTERVAL ]; then
            echo "Waiting ${CHECK_INTERVAL}s until next check... (${REMAINING}s remaining)" | tee -a "$LOG_FILE"
            sleep $CHECK_INTERVAL
        else
            echo "Final check completed. (${REMAINING}s remaining)" | tee -a "$LOG_FILE"
            break
        fi
    fi
done

# Calculate final metrics
END_TIME=$(date +%s)
ACTUAL_DURATION=$((END_TIME - START_TIME))

# Calculate success rate
if [ $TOTAL_CHECKS -gt 0 ]; then
    SUCCESS_RATE=$(echo "scale=2; ($SUCCESSFUL_CHECKS * 100) / $TOTAL_CHECKS" | bc)
else
    SUCCESS_RATE=0
fi

# Calculate average response time
TOTAL_TIME=0
for time in "${RESPONSE_TIMES[@]}"; do
    TOTAL_TIME=$(echo "$TOTAL_TIME + $time" | bc)
done

if [ ${#RESPONSE_TIMES[@]} -gt 0 ]; then
    AVG_RESPONSE_TIME=$(echo "scale=3; $TOTAL_TIME / ${#RESPONSE_TIMES[@]}" | bc)
else
    AVG_RESPONSE_TIME=0
fi

# Find max response time
MAX_RESPONSE_TIME=0
for time in "${RESPONSE_TIMES[@]}"; do
    if (( $(echo "$time > $MAX_RESPONSE_TIME" | bc -l) )); then
        MAX_RESPONSE_TIME=$time
    fi
done

# Find min response time
MIN_RESPONSE_TIME=999999
for time in "${RESPONSE_TIMES[@]}"; do
    if (( $(echo "$time < $MIN_RESPONSE_TIME" | bc -l) )); then
        MIN_RESPONSE_TIME=$time
    fi
done

# Generate final report
echo "" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"
echo "FINAL HEALTH MONITORING REPORT" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"
echo "Completed: $(date)" | tee -a "$LOG_FILE"
echo "Actual Duration: ${ACTUAL_DURATION}s" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

echo "--- HEALTH CHECK METRICS ---" | tee -a "$LOG_FILE"
echo "Total Health Checks: $TOTAL_CHECKS" | tee -a "$LOG_FILE"
echo "Successful Checks: $SUCCESSFUL_CHECKS" | tee -a "$LOG_FILE"
echo "Failed Checks: $FAILED_CHECKS" | tee -a "$LOG_FILE"
echo "Success Rate: ${SUCCESS_RATE}%" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

echo "--- RESPONSE TIME METRICS ---" | tee -a "$LOG_FILE"
echo "Average Response Time: ${AVG_RESPONSE_TIME}s" | tee -a "$LOG_FILE"
echo "Min Response Time: ${MIN_RESPONSE_TIME}s" | tee -a "$LOG_FILE"
echo "Max Response Time: ${MAX_RESPONSE_TIME}s" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

echo "--- ERROR METRICS ---" | tee -a "$LOG_FILE"
echo "Database Errors: $DB_ERRORS" | tee -a "$LOG_FILE"
echo "Gateway Errors (502/503): $GATEWAY_ERRORS" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

echo "--- SUCCESS CRITERIA VALIDATION ---" | tee -a "$LOG_FILE"

# SC-004: Health check responds within 1 second
if (( $(echo "$AVG_RESPONSE_TIME < 1.0" | bc -l) )); then
    echo "✓ SC-004: PASS - Health checks respond within 1 second (avg: ${AVG_RESPONSE_TIME}s)" | tee -a "$LOG_FILE"
else
    echo "✗ SC-004: FAIL - Health checks exceed 1 second (avg: ${AVG_RESPONSE_TIME}s)" | tee -a "$LOG_FILE"
fi

# SC-005: Zero database connection errors
if [ $DB_ERRORS -eq 0 ]; then
    echo "✓ SC-005: PASS - Zero database connection errors" | tee -a "$LOG_FILE"
else
    echo "✗ SC-005: FAIL - Found $DB_ERRORS database errors" | tee -a "$LOG_FILE"
fi

# SC-006: Health checks pass 100%
if [ "$SUCCESS_RATE" = "100.00" ] || [ "$SUCCESS_RATE" = "100" ]; then
    echo "✓ SC-006: PASS - Health checks pass 100%" | tee -a "$LOG_FILE"
else
    echo "✗ SC-006: FAIL - Health check success rate: ${SUCCESS_RATE}%" | tee -a "$LOG_FILE"
fi

# SC-007: Zero 502/503 errors
if [ $GATEWAY_ERRORS -eq 0 ]; then
    echo "✓ SC-007: PASS - Zero 502/503 errors" | tee -a "$LOG_FILE"
else
    echo "✗ SC-007: FAIL - Found $GATEWAY_ERRORS gateway errors" | tee -a "$LOG_FILE"
fi

# SC-010: Database queries under 500ms (we'll check this from logs if available)
echo "✓ SC-010: INFO - Database query times need to be checked from application logs" | tee -a "$LOG_FILE"

echo "" | tee -a "$LOG_FILE"
echo "--- RECOMMENDATIONS ---" | tee -a "$LOG_FILE"

ISSUES_FOUND=0

if (( $(echo "$AVG_RESPONSE_TIME > 1.0" | bc -l) )); then
    echo "⚠ Response time exceeds target. Consider:" | tee -a "$LOG_FILE"
    echo "  - Adding more machine instances for load distribution" | tee -a "$LOG_FILE"
    echo "  - Optimizing database queries" | tee -a "$LOG_FILE"
    echo "  - Enabling connection pooling" | tee -a "$LOG_FILE"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

if [ $DB_ERRORS -gt 0 ]; then
    echo "⚠ Database errors detected. Consider:" | tee -a "$LOG_FILE"
    echo "  - Checking database connection pool settings" | tee -a "$LOG_FILE"
    echo "  - Verifying database credentials and permissions" | tee -a "$LOG_FILE"
    echo "  - Monitoring database resource utilization" | tee -a "$LOG_FILE"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

if [ $GATEWAY_ERRORS -gt 0 ]; then
    echo "⚠ Gateway errors detected. Consider:" | tee -a "$LOG_FILE"
    echo "  - Checking application startup time" | tee -a "$LOG_FILE"
    echo "  - Verifying health check configuration" | tee -a "$LOG_FILE"
    echo "  - Reviewing application logs for crashes" | tee -a "$LOG_FILE"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

if [ "$SUCCESS_RATE" != "100.00" ] && [ "$SUCCESS_RATE" != "100" ]; then
    echo "⚠ Health check failures detected. Consider:" | tee -a "$LOG_FILE"
    echo "  - Reviewing application error logs" | tee -a "$LOG_FILE"
    echo "  - Checking for resource constraints (CPU/Memory)" | tee -a "$LOG_FILE"
    echo "  - Verifying all dependencies are available" | tee -a "$LOG_FILE"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

if [ $ISSUES_FOUND -eq 0 ]; then
    echo "✓ No issues found. System is healthy and meeting all success criteria." | tee -a "$LOG_FILE"
fi

echo "" | tee -a "$LOG_FILE"
echo "Full logs saved to: $LOG_FILE" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"

# Export metrics to JSON
cat > "$METRICS_FILE" << EOF
{
  "monitoring_session": {
    "start_time": "$(date -d @$START_TIME +"%Y-%m-%d %H:%M:%S")",
    "end_time": "$(date -d @$END_TIME +"%Y-%m-%d %H:%M:%S")",
    "duration_seconds": $ACTUAL_DURATION
  },
  "health_checks": {
    "total": $TOTAL_CHECKS,
    "successful": $SUCCESSFUL_CHECKS,
    "failed": $FAILED_CHECKS,
    "success_rate_percent": $SUCCESS_RATE
  },
  "response_times": {
    "average_seconds": $AVG_RESPONSE_TIME,
    "min_seconds": $MIN_RESPONSE_TIME,
    "max_seconds": $MAX_RESPONSE_TIME,
    "all_times": [$(IFS=,; echo "${RESPONSE_TIMES[*]}")]
  },
  "errors": {
    "database_errors": $DB_ERRORS,
    "gateway_errors": $GATEWAY_ERRORS
  },
  "success_criteria": {
    "SC-004_health_under_1s": $([ $(echo "$AVG_RESPONSE_TIME < 1.0" | bc -l) -eq 1 ] && echo "true" || echo "false"),
    "SC-005_zero_db_errors": $([ $DB_ERRORS -eq 0 ] && echo "true" || echo "false"),
    "SC-006_100_percent_pass": $([ "$SUCCESS_RATE" = "100.00" ] || [ "$SUCCESS_RATE" = "100" ] && echo "true" || echo "false"),
    "SC-007_zero_gateway_errors": $([ $GATEWAY_ERRORS -eq 0 ] && echo "true" || echo "false")
  },
  "http_codes": [$(IFS=,; echo "${HTTP_CODES[*]}")]
}
EOF

echo "Metrics exported to: $METRICS_FILE"
