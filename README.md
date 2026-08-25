# Appato Client Requirement Intake Agent

Appato provides two AI-guided intake flows:

- **Product Discovery Agent** — turns rough product requirements into an approval-ready brief covering product context, functional requirements, and aesthetics & UX.
- **Business Idea Agent** — turns a business owner's rough idea and supporting context into a shared understanding of the business and a concrete project definition.

Both flows accept typed text, speech, uploaded documents, images during chat, and website links. They ask one clarification question at a time, track objective coverage, detect contradictions, recap the conversation, and export a Markdown brief.

The agents deliberately avoid budget, pricing, timeline, staffing, delivery, contracts, and commercial advice. Those topics are handled by the human team.

## Agent coverage

### Product Discovery Agent

- **Product Context** — problem, users, success criteria, boundaries
- **Functional Requirements** — workflows, features, integrations, roles, edge cases
- **Aesthetics & UX** — brand personality, visual style, tone, interactions, accessibility

### Business Idea Agent

- **Business Context** — offering, industry, customers, general business model, differentiators, current challenges
- **Idea Opportunity** — idea summary, customer problem, target users, desired outcomes, alternatives, value proposition
- **Project Definition** — project goal, proposed solution, primary journey, must-have and nice-to-have outcomes, boundaries, success criteria

Normal Business Idea Brief completion requires at least 70% coverage in all three business domains and the owner's confirmation. An explicit early stop is allowed but the exported brief carries an incomplete-information warning.

## Features

- Root chooser with independent `/discovery` and `/business-idea` entry points
- Shared conversational UI with agent-specific coverage, review, approval, and download copy
- Product Discovery Agent backed by DigitalOcean inference
- Business Idea Agent backed by OpenRouter model `openai/gpt-5.6-sol`
- Supabase persistence for session rows and uploaded images, using the `sessions` table and `client-uploads` bucket
- Staff pre-seeding APIs for both product and business intake
- Link-based access — clients and business owners do not authenticate; the session URL is the credential

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS |
| AI / LLM | Vercel AI SDK; DigitalOcean `deepseek-v4-pro` for product discovery; OpenRouter `openai/gpt-5.6-sol` for business ideas |
| Persistence | Supabase Postgres JSONB rows and Supabase Storage |
| Deployment | Vercel or Docker with Supabase |
| Testing | Vitest, Testing Library, jsdom |

## Getting Started

### Prerequisites

- Node.js 20+
- `DIGITALOCEAN_TOKEN` to use the Product Discovery Agent
- `OPENROUTER_API_KEY` to use the Business Idea Agent

### Environment

Create a `.env.local` file at the project root:

```bash
DIGITALOCEAN_TOKEN=doo_v1_...
OPENROUTER_API_KEY=sk-or-v1-...
```

Supabase is required for session and image persistence:

```bash
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_STORAGE_BUCKET=client-uploads
```

### Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The root page presents both AI guides.

### Docker

```bash
docker compose up --build
```

The container is stateless; configure the Supabase environment variables above rather than mounting a local data volume. The service listens on port 3000.

## Project Structure

```
app/
  page.tsx                         # AI guide chooser
  discovery/page.tsx               # Product Discovery landing
  business-idea/page.tsx           # Business Idea landing
  api/projects/                    # Product intake creation
  api/business-ideas/              # Business intake creation and session APIs
  api/session/[id]/                # Product session APIs
  session/[id]/                    # Product chat interface
  business-idea/session/[id]/      # Business Idea chat interface
components/
  session-chat.tsx                 # Shared product/business chat UI
lib/
  business-idea/                   # Business schema, coverage, LLM, export, storage
  llm/                             # DigitalOcean product orchestration and providers
  session/                         # Supabase-backed session state and chat-turn preparation
tests/                              # Vitest test suite
```

## API

### Product Discovery intake

`POST /api/projects` (`multipart/form-data`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `client_name` | string | no | Display name for the client |
| `project_name` | string | no | Project label |
| `requirement_doc` | file | no | `.txt`, `.md`, or `.pdf` to pre-load |
| `initial_text` | string | no | Free-text requirement to pre-load |

Returns `{ projectId, sessionId, shareableUrl, initialState, parseError? }`; the shareable URL is `/session/{id}`.

### Product Discovery session

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/session/{id}` | Fetch product session state |
| `PATCH` | `/api/session/{id}` | Approve or revise a product brief |
| `POST` | `/api/session/{id}/chat` | Send a text or multipart chat turn |
| `GET` | `/api/session/{id}/brief` | Download the product Markdown brief |

### Business Idea intake

`POST /api/business-ideas` (`multipart/form-data`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `business_name` | string | no | Business name |
| `idea_name` | string | no | Idea or project name |
| `context_doc` | file | one of these | `.txt`, `.md`, or `.pdf`; takes precedence over text |
| `initial_context` | string | one of these | Rough idea or business context |

`OPENROUTER_API_KEY` must be configured. Missing configuration returns `503 { error: "Business Idea Agent is not configured." }`. Returns `{ projectId, sessionId, shareableUrl, initialState, parseError? }`; the shareable URL is `/business-idea/session/{id}`.

### Business Idea session

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/business-ideas/session/{id}` | Fetch business session state and `businessIdeaBrief` |
| `PATCH` | `/api/business-ideas/session/{id}` | Approve or revise a Business Idea Brief |
| `POST` | `/api/business-ideas/session/{id}/chat` | Send a text or multipart chat turn |
| `GET` | `/api/business-ideas/session/{id}/brief` | Download `business-idea-brief-{id-prefix}.md` |

## Session Lifecycle

1. **Choose a guide** at `/`, then submit text or a document through `/discovery` or `/business-idea`.
2. **Intake** parses clear evidence into the selected structured artifact.
3. **Clarification** asks one question at a time and updates objective coverage.
4. **Recap** summarizes knowns, assumptions, open questions, and contradictions at natural boundaries.
5. **Review** generates a brief when the owner explicitly stops or the configured coverage and confirmation rules are satisfied.
6. **Approval** lets the owner approve or revise. Approved sessions are read-only and downloadable.

## Testing

```bash
npx vitest run tests/business-idea tests/components/agent-selector.test.tsx tests/session tests/llm
npm run build
```

## License

Private — internal use.
