import { describe, it, expect } from 'vitest';
import { rowToSession, sessionToRow } from '../../lib/session/supabase-backend';
import { SessionStore } from '../../lib/session/store';




describe('SessionStore chat support', () => {


  it('getSession returns a previously created session', async () => {
    const store = new SessionStore();
    const created = await store.createSession();

    const retrieved = await store.getSession(created.sessionId);
    expect(retrieved.sessionId).toBe(created.sessionId);
    expect(retrieved.projectId).toBe(created.projectId);
    expect(retrieved.chatHistory).toEqual([]);
    expect(retrieved.coverage).toEqual({
      productContext: 0.0,
      functional: 0.0,
      aesthetics: 0.0,
    });
  });

  it('getSession throws if session does not exist', async () => {
    const store = new SessionStore();
    await expect(store.getSession('non-existent-id')).rejects.toThrow();
  });

  it('updateSession persists changes in Supabase', async () => {
    const store = new SessionStore();
    const session = await store.createSession();

    const updated = {
      ...session,
      chatHistory: [
        {
          turnNumber: 1,
          role: 'user',
          content: 'Hello',
          contentType: 'text',
          timestamp: new Date().toISOString(),
        },
      ],
      coverage: {
        productContext: 0.2,
        functional: 0.1,
        aesthetics: 0.0,
      },
    };

    await store.updateSession(updated);

    const retrieved = await store.getSession(session.sessionId);
    expect(retrieved.chatHistory).toHaveLength(1);
    expect(retrieved.chatHistory[0].content).toBe('Hello');
    expect(retrieved.coverage).toEqual({
      productContext: 0.2,
      functional: 0.1,
      aesthetics: 0.0,
    });
  });
  it('loads PostgreSQL timestamptz offsets from Supabase rows', async () => {
    const store = new SessionStore();
    const created = await store.createSession();
    const row = sessionToRow(created);
    row.created_at = '2026-08-25T11:03:07.705+00:00';
    row.updated_at = '2026-08-25T11:03:07.705+00:00';

    const loaded = rowToSession(row);

    expect(loaded.createdAt).toBe(row.created_at);
    expect(loaded.updatedAt).toBe(row.updated_at);
  });
});
