import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { BusinessIdeaSessionStore } from '@/lib/business-idea/store';
import { createDefaultBusinessIdeaBrief } from '@/lib/business-idea/schema';

const { mockChatResponse, mockFallback } = vi.hoisted(() => ({
  mockChatResponse: vi.fn(),
  mockFallback: vi.fn(),
}));

vi.mock('@/lib/business-idea/llm', () => ({
  generateBusinessIdeaChatResponse: mockChatResponse,
  generateBusinessIdeaFallbackResponse: mockFallback,
}));

const TEST_SESSIONS_DIR = path.join(process.cwd(), 'test-sessions-business-chat');

function makeOutput(overrides: Record<string, unknown> = {}) {
  const brief = createDefaultBusinessIdeaBrief();
  brief.business_context.industry = 'Floristry';
  brief.idea_opportunity.idea_summary = 'Online bouquet planning';
  brief.project_definition.project_goal = 'Help wedding customers plan bouquets';

  return {
    message: 'What do wedding customers need most from the planning experience?',
    state_update: {
      brief,
      contradictions: ['The owner described both local and national service areas.'],
      out_of_scope_topics: ['pricing'],
    },
    reasoning: 'Clarify the customer need next.',
    is_recap: false,
    is_final: false,
    ...overrides,
  };
}

async function postChat(sessionId: string, message: string) {
  const { NextRequest } = await import('next/server');
  const { POST } = await import('@/app/api/business-ideas/session/[id]/chat/route');
  return POST(new NextRequest(`http://localhost:3000/api/business-ideas/session/${sessionId}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  }), { params: Promise.resolve({ id: sessionId }) });
}

async function readNdjson(response: Response): Promise<Array<Record<string, unknown>>> {
  const body = await response.text();
  return body
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

describe('POST /api/business-ideas/session/[id]/chat', () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_SESSIONS_DIR)) fs.rmSync(TEST_SESSIONS_DIR, { recursive: true });
    process.env.SESSIONS_DIR = TEST_SESSIONS_DIR;
    process.env.STORAGE_BACKEND = 'file';
    process.env.OPENROUTER_API_KEY = 'test-key';
    mockChatResponse.mockResolvedValue({
      partialObjectStream: (async function* () {
        yield { message: 'partial' };
      })(),
      object: Promise.resolve(makeOutput()),
    });
    mockFallback.mockResolvedValue('Could you share more about the customer problem?');
  });

  afterEach(() => {
    if (fs.existsSync(TEST_SESSIONS_DIR)) fs.rmSync(TEST_SESSIONS_DIR, { recursive: true });
    delete process.env.SESSIONS_DIR;
    delete process.env.STORAGE_BACKEND;
    delete process.env.OPENROUTER_API_KEY;
    vi.clearAllMocks();
  });

  it('replaces the stored brief, recalculates coverage, and streams server coverage', async () => {
    const store = new BusinessIdeaSessionStore();
    const session = await store.createSession();
    session.businessIdeaBrief.assumptions = ['Existing assumption'];
    await store.updateSession(session);

    const response = await postChat(session.sessionId, 'We want to help wedding customers.');
    expect(response.status).toBe(200);
    const lines = await readNdjson(response);
    const finalLine = lines[lines.length - 1];

    expect(finalLine.state_update).toEqual(expect.objectContaining({
      coverage: {
        businessContext: 0.17,
        ideaOpportunity: 0.17,
        projectDefinition: 0.14,
      },
    }));

    const updated = await store.getSession(session.sessionId);
    expect(updated.businessIdeaBrief.business_context.industry).toBe('Floristry');
    expect(updated.coverage).toEqual({
      businessContext: 0.17,
      ideaOpportunity: 0.17,
      projectDefinition: 0.14,
    });
    expect(updated.assumptions).toContain('Existing assumption');
    expect(updated.contradictions).toEqual(['The owner described both local and national service areas.']);
    expect(updated.outOfScopeTopics).toEqual(['pricing']);
  });

  it('exports the updated brief and changes status on a final turn', async () => {
    const finalOutput = makeOutput({ is_final: true });
    mockChatResponse.mockResolvedValue({
      partialObjectStream: (async function* () {})(),
      object: Promise.resolve(finalOutput),
    });
    const store = new BusinessIdeaSessionStore();
    const session = await store.createSession();

    await postChat(session.sessionId, 'Please prepare the brief.');

    const updated = await store.getSession(session.sessionId);
    expect(updated.status).toBe('brief_ready');
    expect(updated.briefMarkdown).toContain('# Business Idea Brief');
    expect(updated.briefMarkdown).toContain('Online bouquet planning');
    expect(updated.briefMarkdown).toContain('**Warning**');
  });

  it('keeps the prior brief and coverage when structured output fails', async () => {
    const store = new BusinessIdeaSessionStore();
    const session = await store.createSession();
    session.businessIdeaBrief.business_context.industry = 'Retail';
    session.coverage.businessContext = 0.17;
    await store.updateSession(session);
    mockChatResponse.mockRejectedValue(new Error('structured output failure'));

    const response = await postChat(session.sessionId, 'The structured turn failed.');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(expect.objectContaining({ fallback: true }));

    const updated = await store.getSession(session.sessionId);
    expect(updated.businessIdeaBrief.business_context.industry).toBe('Retail');
    expect(updated.coverage).toEqual({
      businessContext: 0.17,
      ideaOpportunity: 0,
      projectDefinition: 0,
    });
    expect(updated.chatHistory).toHaveLength(2);
  });
});
