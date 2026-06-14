# ==========================================================================
# backup-clinic.ps1  -  daily backup of the Eye EMR database.
# Registered by install.bat as a scheduled task ("Eye EMR Backup", 23:00).
#
# The DB runs in WAL mode, so a plain file copy can be inconsistent. We use
# SQLite's online backup (VACUUM INTO) via the better-sqlite3 that already
# ships in the standalone bundle, producing a single clean .db snapshot.
# If that fails for any reason, we fall back to copying the db + WAL + SHM trio.
#
# Retention: snapshots older than $RetentionDays are deleted.
# ==========================================================================

$ErrorActionPreference = 'Stop'

$DataDir       = 'C:\ClinicData'
$Db            = Join-Path $DataDir 'clinic.db'
$BackupDir     = Join-Path $DataDir 'backups'
$RetentionDays = 30

# app root = two levels up from this script (deploy\windows\ -> root)
$Root       = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$Standalone = Join-Path $Root '.next\standalone'

if (-not (Test-Path $Db)) { Write-Host "No database at $Db - nothing to back up."; exit 0 }
if (-not (Test-Path $BackupDir)) { New-Item -ItemType Directory -Path $BackupDir | Out-Null }

$stamp  = Get-Date -Format 'yyyy-MM-dd_HHmm'
$target = Join-Path $BackupDir "clinic-$stamp.db"

$ok = $false
try {
    # Use better-sqlite3's online backup for a consistent single-file snapshot.
    $node = @"
const Database = require('better-sqlite3');
const db = new Database(process.argv[1], { readonly: true });
db.exec("VACUUM INTO '" + process.argv[2].replace(/'/g, "''") + "'");
db.close();
"@
    $tmpJs = Join-Path $env:TEMP 'eye-emr-backup.js'
    Set-Content -Path $tmpJs -Value $node -Encoding ASCII
    Push-Location $Standalone
    & node $tmpJs $Db $target
    Pop-Location
    if (Test-Path $target) { $ok = $true }
} catch {
    Write-Warning "Online backup failed ($_). Falling back to file copy."
}

if (-not $ok) {
    Copy-Item $Db $target -Force
    foreach ($ext in @('-wal','-shm')) {
        if (Test-Path "$Db$ext") { Copy-Item "$Db$ext" "$target$ext" -Force }
    }
}

Write-Host "Backup written: $target"

# --- retention ---
Get-ChildItem -Path $BackupDir -Filter 'clinic-*.db*' |
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$RetentionDays) } |
    ForEach-Object { Remove-Item $_.FullName -Force; Write-Host "Pruned old backup: $($_.Name)" }
