# Deployment Guide

Appato has two independent intake flows:

- **Product Discovery Agent** — DigitalOcean-backed with model `deepseek-v4-pro`.
- **Business Idea Agent** — OpenRouter-backed with the literal model `openai/gpt-5.6-sol`.

The root route `/` presents both choices. Product sessions use `/discovery`, `/api/projects`, and `/api/session/{id}`. Business sessions use `/business-idea`, `/api/business-ideas`, and `/api/business-ideas/session/{id}`.

## Prerequisites

- Node.js 20+ for local builds
- Docker for containerized deploys
- A DigitalOcean API token (`DIGITALOCEAN_TOKEN`) to use the Product Discovery Agent
- An OpenRouter API key (`OPENROUTER_API_KEY`) to use the Business Idea Agent
- Git repository with the project source

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DIGITALOCEAN_TOKEN` | Product Discovery Agent | — | DigitalOcean token for product discovery inference |
| `OPENROUTER_API_KEY` | Business Idea Agent | — | OpenRouter key for business idea clarification |
| `NODE_ENV` | No | — | Set to `production` for production deploys |
| `SESSIONS_DIR` | No | `sessions` | Directory for session JSON files |
| `UPLOADS_DIR` | No | `uploads` | Directory for uploaded files |
| `PORT` | No | `3000` | HTTP server port |
| `STORAGE_BACKEND` | No | `file` | `file` or `supabase` |
| `SUPABASE_URL` | If `supabase` | — | Supabase project URL |
| `SUPABASE_PUBLISHABLE_KEY` | If `supabase` | — | Supabase publishable (anon) key |
| `SUPABASE_STORAGE_BUCKET` | No | `client-uploads` | Supabase upload bucket name |

`OPENROUTER_API_KEY` is checked at the start of Business Idea session creation and chat. If it is absent, those endpoints return `503 { error: 'Business Idea Agent is not configured.' }` without calling OpenRouter. Product endpoints do not depend on this key. Both agents share the existing `sessions` directory or `sessions` Supabase table; no database migration is required.

## Local Development

Create `.env.local` with the keys for the flows you intend to deploy:

```bash
DIGITALOCEAN_TOKEN=doo_v1_...
OPENROUTER_API_KEY=sk-or-v1_...
NODE_ENV=production
```

Run locally:

```bash
npm install
npm run dev
```

Open `http://localhost:3000/`. Verify `/discovery` and `/business-idea` independently if only one provider key is configured.

## Docker Self-Hosted

The `docker-compose.yml` mounts `./sessions:/app/sessions` and keeps session files across restarts.

```bash
git clone <repo-url> intake-agent
cd intake-agent

cat > .env.local <<'EOF'
DIGITALOCEAN_TOKEN=doo_v1_...
OPENROUTER_API_KEY=sk-or-v1_...
NODE_ENV=production
EOF

docker compose up --build -d
```

The same image can run on a DigitalOcean Droplet, Linode, Hetzner, AWS EC2, or another VPS. Add a reverse proxy for HTTPS, for example:

```caddyfile
intake.example.com {
    reverse_proxy localhost:3000
}
```

## Platform Options

### 1. GCP Cloud Run

Cloud Run is stateless by default. Session files are lost on restart unless a persistent volume is mounted or `STORAGE_BACKEND=supabase` is used.

#### Stateless demo

```bash
gcloud builds submit --tag gcr.io/PROJECT_ID/intake-agent

gcloud run deploy intake-agent \
  --image gcr.io/PROJECT_ID/intake-agent \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 3000 \
  --set-env-vars DIGITALOCEAN_TOKEN=doo_v1_...,OPENROUTER_API_KEY=sk-or-v1_...,NODE_ENV=production,SESSIONS_DIR=/app/sessions \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 3
```

#### Persistent sessions with Cloud Storage FUSE

```bash
gcloud storage buckets create gs://intake-agent-sessions --location=us-central1

gcloud beta run deploy intake-agent \
  --image gcr.io/PROJECT_ID/intake-agent \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 3000 \
  --set-env-vars DIGITALOCEAN_TOKEN=doo_v1_...,OPENROUTER_API_KEY=sk-or-v1_...,NODE_ENV=production,SESSIONS_DIR=/mnt/sessions \
  --add-volume name=sessions,type=cloud-storage,bucket=intake-agent-sessions \
  --add-volume-mount volume=sessions,mount-path=/mnt/sessions \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 3
```

#### Compute Engine

A small VM with a persistent disk is the simplest GCP option. Clone the repository, set both provider keys, and run the Docker Compose deployment above.

### 2. DigitalOcean Droplet

DigitalOcean App Platform does not provide persistent volume mounts for this application. Use a Droplet for persistent file sessions.

```bash
ssh root@<droplet-ip>
curl -fsSL https://get.docker.com | sh
git clone <repo-url> intake-agent
cd intake-agent

echo 'DIGITALOCEAN_TOKEN=doo_v1_...' > .env.local
echo 'OPENROUTER_API_KEY=sk-or-v1_...' >> .env.local
echo 'NODE_ENV=production' >> .env.local

docker compose up --build -d
```

For a stateless App Platform demo:

1. Push the repository to GitHub or GitLab.
2. Create an App in the DigitalOcean dashboard and select the repository.
3. Set the HTTP port to `3000`.
4. Add `DIGITALOCEAN_TOKEN`, `OPENROUTER_API_KEY`, and `NODE_ENV=production`.
5. Deploy.

Sessions are lost after redeploy or restart on the stateless option.

### 3. Fly.io

Fly.io supports a persistent volume for the `sessions` directory:

```bash
flyctl launch --image intake-agent:latest --port 3000
flyctl volumes create sessions_data --size 1 --region iad
flyctl secrets set DIGITALOCEAN_TOKEN=doo_v1_... OPENROUTER_API_KEY=sk-or-v1_... NODE_ENV=production
flyctl deploy
```

Add a volume mount from `sessions_data` to `/app/sessions` in `fly.toml`.

### 4. Render

Configure a Docker web service on port `3000`, set `DIGITALOCEAN_TOKEN`, `OPENROUTER_API_KEY`, and `NODE_ENV=production`, and mount a Render Disk at `/app/sessions`.

### 5. Hugging Face Spaces

Use the Docker runtime, set both provider keys in Space Settings → Secrets, and treat the deployment as a demo. There is no persistent volume by default, so sessions can disappear after restart.

### 6. Railway

Deploy the Dockerfile, set both provider keys and `NODE_ENV=production`, and attach a volume at `/app/sessions` when persistent file sessions are required.

## Persistence Choices

| Backend | Persistence | Configuration |
|---|---|---|
| File | Mounted `sessions/` directory | `STORAGE_BACKEND=file` or unset |
| Supabase | Existing `sessions` table and JSONB columns | `STORAGE_BACKEND=supabase`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` |

Product and business sessions share the namespace safely because each session ID is a UUID and each backend validates the selected schema before returning a session.

## Post-Deployment Verification

1. Visit `https://<your-domain>/` and confirm the chooser shows both AI guides.
2. Open `/discovery`, submit product context, and confirm a `/session/{id}` link is returned.
3. Open `/business-idea`, submit business context, and confirm a `/business-idea/session/{id}` link is returned.
4. Send one follow-up in each session. Product responses require `DIGITALOCEAN_TOKEN`; business responses require `OPENROUTER_API_KEY`.
5. Approve a generated brief and verify the corresponding Markdown download.
6. Inspect the mounted sessions directory or Supabase `sessions` table to confirm persistence.

## Troubleshooting

| Symptom | Likely Cause |
|---|---|
| 500/502 on Product Discovery chat | `DIGITALOCEAN_TOKEN` is missing or invalid |
| 503 on Business Idea creation or chat | `OPENROUTER_API_KEY` is missing; the endpoint intentionally does not call the provider |
| OpenRouter rejects the model | The application uses `openai/gpt-5.6-sol` literally; configure a future model change explicitly rather than silently substituting one |
| Sessions disappear after restart | No persistent volume is mounted for `/app/sessions`, or the deployment is stateless |
| Build fails in Cloud Run | Image too large or build-time environment configuration is incorrect |
| Cold start is slow on Render | Free tier services sleep after inactivity |
| Port binding errors | The `PORT` value does not match the platform's configured port |
