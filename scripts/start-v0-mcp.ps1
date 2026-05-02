$ErrorActionPreference = "Stop"
$projectRoot = "C:\PROYECTOS\VercelHack"
$envFile = Join-Path $projectRoot '.env.local'

if (-not (Test-Path -LiteralPath $envFile)) {
  throw "No existe $envFile"
}

Get-Content -LiteralPath $envFile | ForEach-Object {
  $line = $_.Trim()
  if (-not $line -or $line.StartsWith('#')) { return }
  $parts = $line -split '=', 2
  if ($parts.Count -eq 2) {
    $name = $parts[0].Trim()
    $value = $parts[1].Trim()
    if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
      $value = $value.Substring(1, $value.Length - 2)
    }
    [System.Environment]::SetEnvironmentVariable($name, $value, 'Process')
  }
}

if (-not $env:V0_API_KEY) {
  throw 'V0_API_KEY no esta definido en .env.local'
}

& npx -y mcp-remote https://mcp.v0.dev --header "Authorization: Bearer $env:V0_API_KEY"
