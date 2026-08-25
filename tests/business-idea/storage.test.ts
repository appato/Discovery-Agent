import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import { BusinessIdeaSessionStore } from '@/lib/business-idea/store';

const TEST_SESSIONS_DIR = path.join(process.cwd(), 'test-sessions-business-storage');

describe('BusinessIdeaSessionStore', () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_SESSIONS_DIR)) fs.rmSync(TEST_SESSIONS_DIR, { recursive: true });
    process.env.SESSIONS_DIR = TEST_SESSIONS_DIR;
    process.env.STORAGE_BACKEND = 'file';
  });

  afterEach(() => {
    if (fs.existsSync(TEST_SESSIONS_DIR)) fs.rmSync(TEST_SESSIONS_DIR, { recursive: true });
    delete process.env.SESSIONS_DIR;
    delete process.env.STORAGE_BACKEND;
  });

  it('persists business metadata, brief, and dynamic coverage', async () => {
    const store = new BusinessIdeaSessionStore();
    const created = await store.createSeededSession({
      businessName: 'Petal & Stem',
      ideaName: 'Wedding planning',
    });
    created.businessIdeaBrief.business_context.industry = 'Retail';
    created.coverage.businessContext = 0.17;
    await store.updateSession(created);

    const loaded = await store.getSession(created.sessionId);
    expect(loaded.metadata).toEqual({
      businessName: 'Petal & Stem',
      ideaName: 'Wedding planning',
      agentType: 'business_idea',
    });
    expect(loaded.businessIdeaBrief.business_context.industry).toBe('Retail');
    expect(loaded.coverage.businessContext).toBe(0.17);
  });
});
