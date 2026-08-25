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
| `SUPABASE_URL` | Yes | — | Supabase project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Yes | — | Supabase publishable key used by server routes |
| `SUPABASE_STORAGE_BUCKET` | No | `client-uploads` | Supabase Storage bucket for uploaded images |
| `NODE_ENV` | No | — | Set to `production` for production deploys |
| `PORT` | No | `3000` | HTTP server port |

Session rows and uploaded image metadata are persisted in Supabase. The application does not read `STORAGE_BACKEND`, `SESSIONS_DIR`, or `UPLOADS_DIR`; no local persistence configuration is supported.

`OPENROUTER_API_KEY` is checked at the start of Business Idea session creation and chat. If it is absent, those endpoints return `503 { error: 'Business Idea Agent is not configured.' }` without calling OpenRouter. Product endpoints do not depend on this key. Both agents share the Supabase `sessions` table.

## Local Development

Create `.env.local` with the keys for the flows you intend to deploy:

```bash
DIGITALOCEAN_TOKEN=doo_v1_...
OPENROUTER_API_KEY=sk-or-v1_...
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_STORAGE_BUCKET=client-uploads
NODE_ENV=development
```

Run locally:

```bash
npm install
npm run dev
```

Open `http://localhost:3000/`. Verify `/discovery` and `/business-idea` independently if only one provider key is configured.

## Docker Self-Hosted

The container is stateless and does not mount a sessions or uploads directory. Set the Supabase and provider variables before starting it:

```bash
docker compose up --build -d
```

The same image can run on a DigitalOcean Droplet, Linode, Hetzner, AWS EC2, or another VPS. Add a reverse proxy for HTTPS, for example:

```caddyfile
intake.example.com {
    reverse_proxy localhost:3000
}
```

## Vercel

1. Import the repository into Vercel.
2. Set `DIGITALOCEAN_TOKEN`, `OPENROUTER_API_KEY`, `SUPABASE_URL`, and `SUPABASE_PUBLISHABLE_KEY` in the production environment. Set `SUPABASE_STORAGE_BUCKET` only when using a bucket name other than `client-uploads`.
3. Deploy with the default Next.js build settings.
4. Apply both SQL migrations in `supabase/migrations/` to the Supabase project before accepting traffic.

Vercel functions are stateless. Session rows, chat history, briefs, and uploaded image objects are all stored in Supabase; no function depends on a writable local directory.

## Platform Options

### 1. GCP Cloud Run

Cloud Run is stateless by default, which is compatible with this application because all application data is stored in Supabase.

```bash
gcloud builds submit --tag gcr.io/PROJECT_ID/intake-agent

gcloud run deploy intake-agent \
  --image gcr.io/PROJECT_ID/intake-agent \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 3000 \
  --set-env-vars DIGITALOCEAN_TOKEN=doo_v1_...,OPENROUTER_API_KEY=sk-or-v1_...,SUPABASE_URL=https://<project>.supabase.co,SUPABASE_PUBLISHABLE_KEY=sb_publishable_...,NODE_ENV=production \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 3
```

#### Compute Engine

A small VM with a persistent disk is optional; no application data is written to that disk. Set the provider and Supabase environment variables and run the stateless Docker deployment above.

### 2. DigitalOcean Droplet

DigitalOcean App Platform and Droplets can run the stateless container. Set `DIGITALOCEAN_TOKEN`, `OPENROUTER_API_KEY`, `SUPABASE_URL`, and `SUPABASE_PUBLISHABLE_KEY`; do not mount a sessions or uploads directory.
### 3. Fly.io

Set the same provider and Supabase secrets. No Fly volume is required.

### 4. Render

Configure a Docker web service on port `3000` and set the provider and Supabase environment variables. Do not attach a local data disk.

### 5. Hugging Face Spaces

Use the Docker runtime and set the provider and Supabase secrets in Space Settings.

### 6. Railway

Deploy the Dockerfile with the provider and Supabase secrets. No persistent volume is required.

## Persistence

| Resource | Supabase location |
|---|---|
| Session state, chat history, briefs, coverage | `public.sessions` table and JSONB columns |
| Uploaded image objects | `client-uploads` Storage bucket |

Product and business sessions share the namespace safely because each session ID is a UUID and each backend validates the selected schema before returning a session.

## Post-Deployment Verification

1. Visit `https://<your-domain>/` and confirm the chooser shows both AI guides.
2. Open `/discovery`, submit product context, and confirm a `/session/{id}` link is returned.
3. Open `/business-idea`, submit business context, and confirm a `/business-idea/session/{id}` link is returned.
4. Send one follow-up in each session. Product responses require `DIGITALOCEAN_TOKEN`; business responses require `OPENROUTER_API_KEY`.
5. Approve a generated brief and verify the corresponding Markdown download.
6. Inspect the Supabase `sessions` table and `client-uploads` bucket to confirm persistence.

## Troubleshooting

| Symptom | Likely Cause |
|---|---|
| 500/502 on Product Discovery chat | `DIGITALOCEAN_TOKEN` is missing or invalid |
| 503 on Business Idea creation or chat | `OPENROUTER_API_KEY` is missing; the endpoint intentionally does not call the provider |
| Sessions disappear after restart | Supabase environment variables are missing or the `sessions` table migration has not been applied |
| Build fails in Cloud Run | Image too large or build-time environment configuration is incorrect |
| Cold start is slow on Render | Free tier services sleep after inactivity |
| Port binding errors | The `PORT` value does not match the platform's configured port |
