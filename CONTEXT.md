# Context: Client Requirement Intake Agent

## Domain

An AI-guided intake system with two entry points: the Product Discovery Agent turns rough product requirements into an approval-ready discovery brief, while the Business Idea Agent turns a business owner's loose idea and context into a shared understanding of the business and a concrete project definition.

## Ubiquitous language

| Term | Definition |
|------|------------|
| **Session** | A single conversation with either agent, from intake through recap and review. A session has one agent type, one structured artifact, objective coverage, and an approval state. |
| **Intake** | The initial client or business-owner input (upload, text, speech, or context) that starts a session. |
| **Turn** | A single back-and-forth exchange in the session: one client message and one agent response. |
| **Product discovery domain** | One of the Product Discovery Agent's three areas: Product Context, Functional Requirements, or Aesthetics and UX. |
| **Business idea domain** | One of the Business Idea Agent's three areas: Business Context, Idea Opportunity, or Project Definition. |
| **Coverage** | The objectively computed completeness ratio for a session domain, expressed as a percentage in the UI. |
| **Structured brief** | The final, validated, exportable artifact produced by a session: either a product discovery brief or a Business Idea Brief. |
| **Business Idea Brief** | The Business Idea Agent artifact covering the business context, idea opportunity, project definition, assumptions, and open questions. |
| **Recap** | A mid-session or end-of-session summary of knowns, assumptions, open questions, and contradictions. |
| **Out-of-scope topic** | Any topic the agents defer to the human team: budget, pricing, timeline, staffing, delivery, contracts, or commercials. |
| **Project** | A client engagement or business-idea definition for which exactly one Session is created. Once that session's brief is approved, the project is closed and new requirements require a new session. |

## Bounded contexts

- **Discovery Orchestration** (single context): Manages both agent conversations, objective coverage, recaps, structured brief generation, review, and Markdown export.

## Invariants

- Neither agent asks about budget, pricing, timeline, staffing, delivery, contracts, or commercials. Volunteered out-of-scope topics are acknowledged as handled by the human team and recorded before returning to the relevant discovery domain.
- Each agent asks only one relevant question per turn.
- An agent must not end a session while its domains remain critically incomplete unless the client explicitly asks to stop; an early brief carries an incomplete-information warning.
- The agent must produce a recap at natural topic boundaries. The seven-turn reminder is a prompt nudge, not a substitute for a natural recap.
- Coverage is computed objectively by the backend, but the LLM uses it as a guide rather than a rigid script.
- A Business Idea Brief is ready for normal completion only when every business domain reaches at least 70% coverage and the owner confirms the shared understanding.

## Glossary

- **Product Context** (20%): Product problem, user need, target audience, success definition, use environment, product boundaries, and must-have vs nice-to-have intent.
- **Functional Requirements** (40%): Product user segments, jobs to be done, workflows, features, system responses, integrations, data, roles/permissions, edge cases, and acceptance criteria.
- **Aesthetics and UX** (40%): Product brand personality, tone, emotions, visual style, references, likes/dislikes, color, typography, imagery, interaction, accessibility, and UI constraints.
- **Business Context**: What the business offers, its industry, customers, general business model, differentiators, and current challenges.
- **Idea Opportunity**: The idea summary, customer problem, target users, desired outcomes, existing alternatives, and value proposition.
- **Project Definition**: The project goal, proposed solution, primary user journey, must-have outcomes, nice-to-have outcomes, scope boundaries, and success criteria.

## Canonical scenarios

- **Product intake → discovery → recap → approval**: A client uploads a document, the Product Discovery Agent asks one follow-up question at a time, produces recaps, and generates a structured brief for review.
- **Business idea intake → clarification → project definition → approval**: A business owner submits a rough idea or context, the Business Idea Agent maps the business and opportunity, shapes the project definition, and produces a Business Idea Brief.
- **Pre-seeded session**: A staff member calls the appropriate intake API endpoint with optional initial context. The system returns a shareable link; the client or business owner does not authenticate, and the session URL is the credential.
- **Out-of-scope deflection**: An owner or client raises budget or another commercial topic; the agent acknowledges the human-team boundary and returns immediately to the relevant business or product clarification.

## Related docs

- PRD: `PRD.md`
- Architecture decisions: `docs/adr/`
