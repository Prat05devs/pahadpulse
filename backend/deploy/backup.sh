#!/bin/sh
# Dumps the pahadpulse database (custom format; restore with pg_restore). Run by the `backup`
# service every 24 h and by `server deploy` before every rebuild. Mirrors the droplet's shared
# backup script, for this project's own database.
set -eu
stamp=$(date -u +%Y%m%dT%H%M%SZ)
pg_dump --format=custom --file=/backups/.partial "$PGDATABASE"
mv /backups/.partial "/backups/$PGDATABASE-$stamp.dump"
find /backups -name '*.dump' -mtime +"${BACKUP_KEEP_DAYS:-14}" -delete
echo "backup complete: $stamp"
