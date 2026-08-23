# Docker Commands Cheatsheet

Here is a list of useful Docker commands specific to your `visapilot` project setup. You can run these commands from the root directory (`d:/AI_Project/JobSearch`).

## Basic Lifecycle

**Start all services in the background:**
```powershell
docker compose -f docker/docker-compose.yml up -d
```
*(Or use your package.json shortcut: `pnpm docker:up`)*

**Stop all running services:**
```powershell
docker compose -f docker/docker-compose.yml down
```
*(Or use your package.json shortcut: `pnpm docker:down`)*

**View live logs for all services:**
```powershell
docker compose -f docker/docker-compose.yml logs -f
```

---

## Rebuilding & Updating

**Rebuild the images cleanly (if code changes aren't showing up):**
```powershell
docker compose -f docker/docker-compose.yml build --no-cache
```
*After rebuilding, you must run the `up -d` command again to restart the containers with the new images.*

**Full clean restart (Stop -> Rebuild without cache -> Start):**
```powershell
docker compose -f docker/docker-compose.yml down
docker compose -f docker/docker-compose.yml build --no-cache
docker compose -f docker/docker-compose.yml up -d
```

---

## Managing Data (Volumes)

**Stop containers AND wipe all database/redis data:**
```powershell
docker compose -f docker/docker-compose.yml down -v
```
*(⚠️ **WARNING**: This will permanently delete all records in your local PostgreSQL and Redis databases!)*

---

## Interacting with Containers

**Open a shell inside the API container:**
```powershell
docker exec -it visapilot-api sh
```

**Open a shell inside the Postgres database container:**
```powershell
docker exec -it visapilot-postgres psql -U visapilot -d visapilot
```

**View logs for a specific service (e.g., API):**
```powershell
docker logs -f visapilot-api
```
