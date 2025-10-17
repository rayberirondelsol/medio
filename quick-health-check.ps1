# Quick health check script for PowerShell
$url = "https://medio-backend.fly.dev/api/health"
$results = @()

Write-Host "=== Running 10 Quick Health Checks ===" -ForegroundColor Cyan

for ($i = 1; $i -le 10; $i++) {
    try {
        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        $response = Invoke-RestMethod -Uri $url -Method Get -ErrorAction Stop
        $stopwatch.Stop()

        $result = [PSCustomObject]@{
            Check = $i
            Status = $response.status
            Database = $response.services.database
            ResponseTime = $stopwatch.Elapsed.TotalSeconds
            Timestamp = $response.timestamp
        }

        $results += $result

        Write-Host "Check $i`: Status=$($response.status), DB=$($response.services.database), Time=$($stopwatch.Elapsed.TotalSeconds.ToString('F3'))s" -ForegroundColor Green
    }
    catch {
        Write-Host "Check $i`: FAILED - $($_.Exception.Message)" -ForegroundColor Red
        $results += [PSCustomObject]@{
            Check = $i
            Status = "FAILED"
            Database = "UNKNOWN"
            ResponseTime = 0
            Timestamp = (Get-Date).ToString("o")
        }
    }

    if ($i -lt 10) { Start-Sleep -Seconds 3 }
}

# Calculate statistics
$successCount = ($results | Where-Object { $_.Status -eq "healthy" }).Count
$avgTime = ($results | Where-Object { $_.ResponseTime -gt 0 } | Measure-Object -Property ResponseTime -Average).Average
$maxTime = ($results | Where-Object { $_.ResponseTime -gt 0 } | Measure-Object -Property ResponseTime -Maximum).Maximum
$minTime = ($results | Where-Object { $_.ResponseTime -gt 0 } | Measure-Object -Property ResponseTime -Minimum).Minimum

Write-Host "`n=== Quick Check Summary ===" -ForegroundColor Cyan
Write-Host "Total Checks: 10"
Write-Host "Successful: $successCount"
Write-Host "Success Rate: $($successCount * 10)%"
Write-Host "Avg Response Time: $($avgTime.ToString('F3'))s"
Write-Host "Min Response Time: $($minTime.ToString('F3'))s"
Write-Host "Max Response Time: $($maxTime.ToString('F3'))s"

# Export to CSV
$results | Export-Csv -Path "health-check-results.csv" -NoTypeInformation
Write-Host "`nResults exported to: health-check-results.csv" -ForegroundColor Yellow
