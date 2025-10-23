$conn = Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue
if ($conn) {
    $processId = $conn.OwningProcess
    Write-Host "Killing backend PID: $processId"
    Stop-Process -Id $processId -Force
    Write-Host "Backend killed successfully"
} else {
    Write-Host "No process found on port 5000"
}
