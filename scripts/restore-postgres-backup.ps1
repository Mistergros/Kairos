param(
  [Parameter(Mandatory = $true)]
  [string]$BackupPath,

  [string]$DbName = "duerp",
  [string]$Host = "localhost",
  [string]$User = "postgres"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $BackupPath)) {
  throw "Backup file not found: $BackupPath"
}

$psql = Get-Command psql -ErrorAction SilentlyContinue
$createdb = Get-Command createdb -ErrorAction SilentlyContinue

if (-not $psql -or -not $createdb) {
  throw "PostgreSQL client tools not found. Install PostgreSQL first, then rerun this script."
}

$pw = Read-Host "Password for PostgreSQL user '$User'"
$env:PGPASSWORD = $pw

Write-Host "Creating database '$DbName'..."
& $createdb -h $Host -U $User $DbName

Write-Host "Restoring backup '$BackupPath'..."
& $psql -h $Host -U $User -d $DbName -f $BackupPath

Write-Host "Restore completed."
Write-Host "Update .env.local with:"
Write-Host "DATABASE_URL=postgresql://$User:$pw@$Host:5432/$DbName"
