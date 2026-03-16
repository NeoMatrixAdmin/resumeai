try {
  $response = Invoke-WebRequest `
    -Uri "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=AIzaSyDvY0Srd26PZuwz1r8cK8JLPC0YDczQWZg" `
    -Method POST `
    -Headers @{"Content-Type"="application/json"} `
    -Body '{"contents":[{"parts":[{"text":"say hello"}]}]}' 
Write-Output $response.Content
} catch {
  Write-Output "Status: $($_.Exception.Response.StatusCode)"
  $stream = $_.Exception.Response.GetResponseStream()
  $reader = [System.IO.StreamReader]::new($stream)
  Write-Output "Body: $($reader.ReadToEnd())"
}