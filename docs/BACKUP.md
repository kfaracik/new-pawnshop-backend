# Database backups

Cyclic backups run via GitHub Actions: [`.github/workflows/db-backup.yml`](../.github/workflows/db-backup.yml).

- **Schedule:** daily at 03:00 UTC (plus a manual "Run workflow" button under the Actions tab).
- **What it does:** `mongodump` of the whole Atlas database → a single gzipped archive.
- **Where it's stored:** as a workflow **artifact** named `db-backup-<timestamp>`, kept for **30 days** (a rolling ~30-backup window). Download it from the run page under *Artifacts*.
- **Cost:** free — GitHub-hosted runner + artifact storage (the dump is only a few KB for this catalog).

## One-time setup

Add the connection string as a repository secret so the workflow can reach the cluster:

1. GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**
2. Name: `MONGODB_URI`
3. Value: the same `mongodb+srv://…` string the backend uses (from Render env / local `.env`)

The workflow fails fast with a clear error if the secret is missing.

> Scheduled workflows only run from the **default branch (`main`)**, so this file must be present on `main`.

## Restore a backup

Download the artifact, unzip it to get `backup-<stamp>.gz`, then:

```bash
# Restore into the same (or a new) cluster
mongorestore --uri="$MONGODB_URI" --gzip --archive=backup-<stamp>.gz

# Overwrite existing collections instead of merging
mongorestore --uri="$MONGODB_URI" --gzip --archive=backup-<stamp>.gz --drop

# Restore only specific collections
mongorestore --uri="$MONGODB_URI" --gzip --archive=backup-<stamp>.gz \
  --nsInclude="<db>.products" --nsInclude="<db>.orders"
```

`mongorestore` ships with the same [MongoDB Database Tools](https://www.mongodb.com/try/download/database-tools) the workflow installs.

## Longer retention (optional upgrade)

Artifacts expire after 30 days. For durable, longer-lived backups, add a step that uploads
the archive to object storage (e.g. Cloudflare R2 — the project already uses R2 for uploads).
That needs bucket credentials as additional secrets; not enabled by default to keep this free
and dependency-light.
