import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BusinessIdeaSessionStore } from '@/lib/business-idea/store';


const { mockParse, mockInitial } = vi.hoisted(() => ({
  mockParse: vi.fn(),
  mockInitial: vi.fn(),
}));

vi.mock('@/lib/business-idea/llm', () => ({
  parseBusinessIdeaIntake: mockParse,
  mergeBusinessIdeaIntake: (parsed: Record<string, unknown>, defaults: Record<string, unknown>) => ({
    ...defaults,
    business_context: {
      ...(defaults.business_context as Record<string, unknown>),
      ...((parsed.business_context as Record<string, unknown> | undefined) || {}),
    },
    idea_opportunity: {
      ...(defaults.idea_opportunity as Record<string, unknown>),
      ...((parsed.idea_opportunity as Record<string, unknown> | undefined) || {}),
    },
    project_definition: {
      ...(defaults.project_definition as Record<string, unknown>),
      ...((parsed.project_definition as Record<string, unknown> | undefined) || {}),
    },
  }),
  generateBusinessIdeaInitialMessage: mockInitial,
}));


async function postBusinessIdea(formData: FormData) {
  const { NextRequest } = await import('next/server');
  const { POST } = await import('@/app/api/business-ideas/route');
  return POST(new NextRequest('http://localhost:3000/api/business-ideas', {
    method: 'POST',
    body: formData,
  }));
}

describe('POST /api/business-ideas', () => {
  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = 'test-key';
    mockParse.mockResolvedValue({});
    mockInitial.mockResolvedValue('Tell me more about the business.');
  });

  afterEach(() => {
    delete process.env.OPENROUTER_API_KEY;
    vi.clearAllMocks();
  });

  it('parses text into a business session and returns the business shareable route', async () => {
    mockParse.mockResolvedValue({
      business_context: {
        industry: 'Floristry',
        current_offering: 'Local flower arrangements',
        target_customers: 'Wedding customers',
      },
      idea_opportunity: {
        idea_summary: 'Online consultation and bouquet planning',
      },
    });
    const formData = new FormData();
    formData.append('business_name', 'Petal & Stem');
    formData.append('idea_name', 'Wedding bouquet planner');
    formData.append('initial_context', 'We run a local florist shop.');

    const response = await postBusinessIdea(formData);
    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.shareableUrl).toBe(`/business-idea/session/${body.sessionId}`);
    expect(body.initialState.metadata).toEqual({
      businessName: 'Petal & Stem',
      ideaName: 'Wedding bouquet planner',
      agentType: 'business_idea',
    });
    expect(body.initialState.businessIdeaBrief.business_context.industry).toBe('Floristry');
    expect(body.initialState.coverage.businessContext).toBeGreaterThan(0);
    const stored = await new BusinessIdeaSessionStore().getSession(body.sessionId);
    expect(stored.sessionId).toBe(body.sessionId);
  });

  it('gives context_doc precedence over initial_context', async () => {
    const formData = new FormData();
    formData.append('initial_context', 'This text should be ignored');
    formData.append('context_doc', new Blob(['File context wins'], { type: 'text/plain' }), 'context.txt');

    await postBusinessIdea(formData);

    expect(mockParse).toHaveBeenCalledWith('File context wins');
    expect(mockParse).not.toHaveBeenCalledWith('This text should be ignored');
  });

  it('returns parseError while still creating a default session when parsing fails', async () => {
    mockParse.mockRejectedValue(new Error('parser failure'));
    const formData = new FormData();
    formData.append('initial_context', 'A rough business idea');

    const response = await postBusinessIdea(formData);
    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.parseError).toBe(true);
    expect(body.initialState.businessIdeaBrief.approval_status).toBe('draft');
    expect(body.initialState.coverage).toEqual({
      businessContext: 0,
      ideaOpportunity: 0,
      projectDefinition: 0,
    });
  });

  it('returns the configuration error before attempting provider work', async () => {
    delete process.env.OPENROUTER_API_KEY;
    const formData = new FormData();
    formData.append('initial_context', 'A rough business idea');

    const response = await postBusinessIdea(formData);
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'Business Idea Agent is not configured.' });
    expect(mockParse).not.toHaveBeenCalled();
  });
});
