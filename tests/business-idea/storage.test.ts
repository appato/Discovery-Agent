import { describe, it, expect } from 'vitest';
import { BusinessIdeaSessionStore } from '@/lib/business-idea/store';




describe('BusinessIdeaSessionStore', () => {


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
