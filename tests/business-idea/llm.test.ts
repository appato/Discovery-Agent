import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGenerateObject, mockGenerateText, mockStreamObject, mockChat } = vi.hoisted(() => ({
  mockGenerateObject: vi.fn(),
  mockGenerateText: vi.fn(),
  mockStreamObject: vi.fn(),
  mockChat: vi.fn((model: string) => `openrouter:chat:${model}`),
}));

vi.mock('ai', () => ({
  generateObject: mockGenerateObject,
  generateText: mockGenerateText,
  streamObject: mockStreamObject,
}));

vi.mock('@/lib/llm/provider', () => ({
  openrouter: { chat: mockChat },
  BUSINESS_IDEA_MODEL: 'openai/gpt-5.6-sol',
}));

import {
  businessIdeaSystemPrompt,
  generateBusinessIdeaChatResponse,
  generateBusinessIdeaFallbackResponse,
  generateBusinessIdeaInitialMessage,
  parseBusinessIdeaIntake,
} from '@/lib/business-idea/llm';
import { createDefaultBusinessIdeaBrief } from '@/lib/business-idea/schema';

describe('business idea LLM contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateObject.mockResolvedValue({ object: {} });
    mockGenerateText.mockResolvedValue({ text: 'A helpful response?' });
    mockStreamObject.mockReturnValue({
      partialObjectStream: (async function* () {
        yield { message: 'partial' };
      })(),
      object: Promise.resolve({
        message: 'What customer problem should this solve?',
        state_update: {
          brief: createDefaultBusinessIdeaBrief(),
          contradictions: [],
          out_of_scope_topics: [],
        },
        reasoning: 'Clarify the opportunity',
        is_recap: false,
        is_final: false,
      }),
    });
  });

  it('uses the selected OpenRouter model for parsing, structured, initial, and fallback calls', async () => {
    const brief = createDefaultBusinessIdeaBrief();
    await parseBusinessIdeaIntake('We run a local florist shop.');
    await generateBusinessIdeaChatResponse({
      sessionId: 'session-1',
      messages: [{ role: 'user', content: 'We serve wedding customers.' }],
      currentBrief: brief,
    });
    await generateBusinessIdeaInitialMessage({
      brief,
      coverage: { businessContext: 0.17, ideaOpportunity: 0, projectDefinition: 0 },
    });
    await generateBusinessIdeaFallbackResponse({
      messages: [{ role: 'user', content: 'Please continue.' }],
    });

    expect(mockChat).toHaveBeenCalledTimes(4);
    expect(mockChat.mock.calls.map(([model]) => model)).toEqual([
      'openai/gpt-5.6-sol',
      'openai/gpt-5.6-sol',
      'openai/gpt-5.6-sol',
      'openai/gpt-5.6-sol',
    ]);
  });

  it('states the business, one-question, recap, confirmation, and deflection rules', () => {
    expect(businessIdeaSystemPrompt).toContain('business owner');
    expect(businessIdeaSystemPrompt).toContain('BUSINESS CONTEXT');
    expect(businessIdeaSystemPrompt).toContain('Ask exactly one relevant, non-leading question per turn');
    expect(businessIdeaSystemPrompt).toContain('seven or more turns');
    expect(businessIdeaSystemPrompt).toContain('owner\'s confirmation');
    expect(businessIdeaSystemPrompt).toContain('handled by the human team');
    expect(businessIdeaSystemPrompt).toContain('technical implementation');
  });
});
