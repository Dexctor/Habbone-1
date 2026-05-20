param(
  [string]$VpsHost = "root@37.59.101.4",
  [string]$SshKey = "C:\Users\Dexct\.ssh\codex_nopass",
  [string]$VpsUploadsDir = "/opt/uploads-habbone",
  [string]$Bucket = "directus-uploads",
  [string]$WorkDir = ".supabase-legacy-uploads"
)

$ErrorActionPreference = "Stop"

function Require-Env([string]$Name) {
  $value = [Environment]::GetEnvironmentVariable($Name)
  if ([string]::IsNullOrWhiteSpace($value)) {
    throw "Missing environment variable: $Name"
  }
  return $value.Trim()
}

function Content-Type([string]$Path) {
  switch ([System.IO.Path]::GetExtension($Path).ToLowerInvariant()) {
    ".png"  { "image/png"; break }
    ".jpg"  { "image/jpeg"; break }
    ".jpeg" { "image/jpeg"; break }
    ".gif"  { "image/gif"; break }
    ".webp" { "image/webp"; break }
    ".avif" { "image/avif"; break }
    ".svg"  { "image/svg+xml"; break }
    ".json" { "application/json"; break }
    default { "application/octet-stream"; break }
  }
}

function Escape-RemotePath([string]$Path) {
  return "'" + $Path.Replace("'", "'\''") + "'"
}

function Escape-ObjectPath([string]$Path) {
  return (($Path -split "/") | ForEach-Object { [uri]::EscapeDataString($_) }) -join "/"
}

$dbUrl = Require-Env "SUPABASE_DB_URL"
$supabaseUrl = (Require-Env "SUPABASE_URL").TrimEnd("/")
$serviceRoleKey = Require-Env "SUPABASE_SERVICE_ROLE_KEY"

$root = (Resolve-Path ".").Path
$downloadDir = Join-Path $root $WorkDir
New-Item -ItemType Directory -Force -Path $downloadDir | Out-Null

$query = @"
select distinct regexp_replace(path, '^/?uploads/', '') as filename
from (
  select cover_image as path from habbonex_main.articles
  union all select image from habbonex_main.stories
  union all select image from habbonex_main.shop_items
  union all select image from habbonex_main.sponsors
) refs
where path like '/uploads/%' or path like 'uploads/%'
order by filename;
"@

Write-Host "Reading legacy media references from Supabase..."
$filenames = docker run --rm postgres:17 psql $dbUrl -At -v ON_ERROR_STOP=1 -c $query
$filenames = @($filenames | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })

if ($filenames.Count -eq 0) {
  Write-Host "No legacy /uploads references found."
  exit 0
}

Write-Host "Found $($filenames.Count) referenced legacy files."

$headersBase = @{
  "Authorization" = "Bearer $serviceRoleKey"
  "apikey" = $serviceRoleKey
  "x-upsert" = "true"
}

$uploaded = 0
$missing = 0

foreach ($filename in $filenames) {
  $filename = $filename.Trim()
  $localPath = Join-Path $downloadDir $filename
  $remotePath = "$VpsUploadsDir/$filename"
  $objectPath = "uploads/$filename"

  if (!(Test-Path -LiteralPath $localPath)) {
    $remoteSpec = "${VpsHost}:$(Escape-RemotePath $remotePath)"
    Write-Host "Downloading $filename"
    & scp -i $SshKey -o BatchMode=yes -o ConnectTimeout=10 $remoteSpec $localPath
    if ($LASTEXITCODE -ne 0) {
      Write-Warning "Missing or failed download: $filename"
      $missing++
      continue
    }
  }

  $bytes = [System.IO.File]::ReadAllBytes($localPath)
  $headers = $headersBase.Clone()
  $headers["Content-Type"] = Content-Type $filename

  $uri = "$supabaseUrl/storage/v1/object/$([uri]::EscapeDataString($Bucket))/$(Escape-ObjectPath $objectPath)"
  Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -Body $bytes | Out-Null
  $uploaded++
  Write-Host "Uploaded $objectPath"
}

Write-Host "Done. Uploaded/upserted: $uploaded. Missing downloads: $missing."

if ($missing -gt 0) {
  exit 2
}
