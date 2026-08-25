# ADR 0002: Flat JSON Files for Session Persistence

## Status

Superseded

## Context

The initial MVP used flat JSON files because the session state is deeply nested and did not require complex querying. Deployment now targets stateless runtimes such as Vercel, where local writes are unavailable and ephemeral.

## Decision

This file-based persistence decision is superseded. The application stores every session row in the Supabase `sessions` table, with nested artifacts in JSONB columns. Uploaded image objects are stored in the Supabase `client-uploads` bucket.

Session stores and image storage have no local-filesystem fallback or backend selector. A one-time migration utility remains available to import legacy `sessions/*.json` files into Supabase; it is not part of the application request path.

## Consequences

- **Stateless deployment**: Vercel functions can create and update sessions without a writable working directory.
- **Shared persistence**: Product and business sessions use the same Supabase table and retain their schema-specific JSONB artifacts.
- **Operational requirement**: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and the Supabase migrations are required before serving traffic.
- **Migration**: Existing JSON files must be imported once with the migration utility and can then be removed from deployment artifacts.

## Alternatives considered

- **Local JSON files**: Rejected because Vercel's filesystem is read-only or ephemeral.
- **SQLite with JSONB**: Rejected because it still requires local or attached volume persistence.

## Related

- ADR 0001: LLM-Driven Orchestration
- PRD: Data Model
