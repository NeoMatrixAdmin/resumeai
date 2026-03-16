$key = "AIzaSyDvY0Srd26PZuwz1r8cK8JLPC0YDczQWZg"
$models = @(
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash-001",
  "gemini-2.0-flash-lite-001",
  "gemini-flash-latest",
  "gemini-flash-lite-latest",
  "gemini-3-flash-preview",
  "gemini-3-pro-preview",
  "gemini-3.1-flash-lite-preview"
)

foreach ($model in $models) {
  try {
    $response = Invoke-WebRequest `
      -Uri "https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=$key" `
      -Method POST `
      -Headers @{"Content-Type"="application/json"} `
      -Body '{"contents":[{"parts":[{"text":"hi"}]}]}' `
      -ErrorAction Stop
    Write-Output "✓ $model — WORKS"
  } catch {
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = [System.IO.StreamReader]::new($stream)
    $body = $reader.ReadToEnd()
    if ($body -match '"code": 429') {
      if ($body -match 'limit: 0') {
        Write-Output "✗ $model — QUOTA ZERO (account restricted)"
      } else {
        Write-Output "~ $model — RATE LIMITED (works but hit limit)"
      }
    } elseif ($body -match '"code": 404') {
      Write-Output "✗ $model — NOT FOUND"
    } else {
      Write-Output "✗ $model — ERROR: $($_.Exception.Response.StatusCode)"
    }
  }
  Start-Sleep -Milliseconds 500
}