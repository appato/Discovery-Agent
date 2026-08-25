import { generateObject, generateText, streamObject, type ModelMessage } from 'ai';
import { z } from 'zod';
import { withRetry } from '@/lib/llm/retry';
import { BUSINESS_IDEA_MODEL, openrouter } from '@/lib/llm/provider';
import { computeBusinessIdeaCoverage } from './coverage';
import {
  businessIdeaBriefSchema,
  createDefaultBusinessIdeaBrief,
  type BusinessIdeaBrief,
} from './schema';

const optionalString = z.string().optional();
const optionalStringArray = z.array(z.string()).optional();

export const businessIdeaParseSchema = z.object({
  business_context: z.object({
    business_name: optionalString,
    industry: optionalString,
    current_offering: optionalString,
    target_customers: optionalString,
    business_model: optionalString,
    differentiators: optionalString,
    current_challenges: optionalString,
  }).optional(),
  idea_opportunity: z.object({
    idea_summary: optionalString,
    customer_problem: optionalString,
    target_users: optionalString,
    desired_outcomes: optionalString,
    existing_alternatives: optionalString,
    value_proposition: optionalString,
  }).optional(),
  project_definition: z.object({
    project_goal: optionalString,
    proposed_solution: optionalString,
    primary_user_journey: optionalString,
    must_have_outcomes: optionalString,
    nice_to_have_outcomes: optionalString,
    scope_boundaries: optionalString,
    success_criteria: optionalString,
  }).optional(),
  assumptions: optionalStringArray,
  open_questions: optionalStringArray,
  out_of_scope_topics: optionalStringArray,
});

export const businessIdeaOutputSchema = z.object({
  message: z.string(),
  state_update: z.object({
    brief: businessIdeaBriefSchema,
    contradictions: z.array(z.string()),
    out_of_scope_topics: z.array(z.string()),
  }),
  reasoning: z.string(),
  is_recap: z.boolean(),
  is_final: z.boolean(),
});

export type BusinessIdeaOutput = z.infer<typeof businessIdeaOutputSchema>;
export type BusinessIdeaLlmMessage = {
  role: string;
  content: string | Array<{
    type: string;
    text?: string;
    image?: string;
    mimeType?: string;
  }>;
};

type BusinessIdeaParse = z.infer<typeof businessIdeaParseSchema>;

type Coverage = {
  businessContext: number;
  ideaOpportunity: number;
  projectDefinition: number;
};

function stripAnsi(text: string): string {
  return text.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
}

function formatDomain(
  label: string,
  fields: Array<{ name: string; value: string }>,
): string {
  const filled = fields.filter((field) => field.value.trim().length > 0);
  const missing = fields.filter((field) => field.value.trim().length === 0);
  const values = filled.length > 0
    ? filled.map((field) => `${field.name}="${field.value}"`).join(', ')
    : 'No data yet';
  const missingText = missing.length > 0
    ? ` Missing: ${missing.map((field) => field.name).join(', ')}.`
    : ' All fields have data.';
  return `${label} (${filled.length}/${fields.length} filled): ${values}.${missingText}`;
}

export function formatBusinessIdeaBriefForPrompt(brief: BusinessIdeaBrief): string {
  const business = brief.business_context;
  const opportunity = brief.idea_opportunity;
  const project = brief.project_definition;

  const lines = [
    'CURRENT BUSINESS IDEA BRIEF MATRIX:',
    '',
    formatDomain('Business Context', [
      { name: 'business_name', value: business.business_name },
      { name: 'industry', value: business.industry },
      { name: 'current_offering', value: business.current_offering },
      { name: 'target_customers', value: business.target_customers },
      { name: 'business_model', value: business.business_model },
      { name: 'differentiators', value: business.differentiators },
      { name: 'current_challenges', value: business.current_challenges },
    ]),
    formatDomain('Idea Opportunity', [
      { name: 'idea_summary', value: opportunity.idea_summary },
      { name: 'customer_problem', value: opportunity.customer_problem },
      { name: 'target_users', value: opportunity.target_users },
      { name: 'desired_outcomes', value: opportunity.desired_outcomes },
      { name: 'existing_alternatives', value: opportunity.existing_alternatives },
      { name: 'value_proposition', value: opportunity.value_proposition },
    ]),
    formatDomain('Project Definition', [
      { name: 'project_goal', value: project.project_goal },
      { name: 'proposed_solution', value: project.proposed_solution },
      { name: 'primary_user_journey', value: project.primary_user_journey },
      { name: 'must_have_outcomes', value: project.must_have_outcomes },
      { name: 'nice_to_have_outcomes', value: project.nice_to_have_outcomes },
      { name: 'scope_boundaries', value: project.scope_boundaries },
      { name: 'success_criteria', value: project.success_criteria },
    ]),
  ];

  if (brief.assumptions.length > 0) {
    lines.push('', `Assumptions: ${brief.assumptions.map((item) => `"${item}"`).join(', ')}`);
  }
  if (brief.open_questions.length > 0) {
    lines.push('', `Open Questions: ${brief.open_questions.map((item) => `"${item}"`).join(', ')}`);
  }

  return lines.join('\n');
}

export const businessIdeaSystemPrompt = `You are a senior business discovery and project-definition analyst helping a business owner turn a loose idea into a shared understanding and a concrete project definition.

Your conversation has three objective coverage domains:

BUSINESS CONTEXT
- What the business offers today
- Industry and current challenges
- Target customers
- General business model, without prices
- Differentiators

IDEA OPPORTUNITY
- Idea summary
- Customer problem
- Target users
- Desired outcomes
- Existing alternatives
- Value proposition

PROJECT DEFINITION
- Project goal
- Proposed solution
- Primary user journey
- Must-have outcomes
- Nice-to-have outcomes
- Scope boundaries
- Success criteria

Rules:
1. Ask exactly one relevant, non-leading question per turn. Do not bundle questions or ask a yes/no question when an open question would reveal more.
2. Start from the business owner's language. Establish business context before testing the idea, then shape the project definition.
3. Distinguish facts from assumptions and unresolved open questions. Preserve both in the brief rather than presenting assumptions as facts.
4. Challenge contradictions politely and record the contradiction for review.
5. Recap at natural topic boundaries. If seven or more turns have passed since the last recap, use the next natural break to recap knowns, assumptions, open questions, and contradictions.
6. Before declaring completion, reach at least 70% coverage in every business domain and obtain the owner's confirmation that the shared understanding is accurate and ready for a brief. You may set is_final true earlier only when the owner explicitly asks to stop; that brief must be marked as incomplete by the server.
7. Return the complete updated brief in state_update.brief on every structured turn. Never return only a partial patch.
8. Do not ask about or advise on budget, pricing, timelines, staffing, delivery, contracts, commercials, or technical implementation. If the owner volunteers one of these topics, acknowledge that it is handled by the human team, record the topic, and return to business or project clarification. business_model may describe only a general commercial model, never a price.
9. Keep the conversation about the business, its customers, the opportunity, and the resulting project. Do not design the technology.

Output the assistant message in Markdown. Keep the response useful and concise while asking only one question.`;

export function buildBusinessIdeaSystemPrompt(
  turnsSinceLastRecap: number,
  coverage: Coverage,
  brief?: BusinessIdeaBrief,
): string {
  let prompt = `${businessIdeaSystemPrompt}\n\nOBJECTIVE COVERAGE (calculated by the server): Business Context ${coverage.businessContext}, Idea Opportunity ${coverage.ideaOpportunity}, Project Definition ${coverage.projectDefinition}. Use the lowest-coverage relevant domain to choose the next question without ignoring the owner's latest answer.`;

  if (brief) {
    prompt += `\n\n${formatBusinessIdeaBriefForPrompt(brief)}`;
  }

  if (turnsSinceLastRecap >= 7) {
    prompt += `\n\nSeven-turn recap reminder: ${turnsSinceLastRecap} turns have passed since the last recap. Recap at the next natural topic boundary before asking one follow-up question.`;
  }

  return prompt;
}

export async function parseBusinessIdeaIntake(text: string): Promise<BusinessIdeaParse> {
  const { object } = await withRetry(
    () => generateObject({
      model: openrouter.chat(BUSINESS_IDEA_MODEL),
      schema: businessIdeaParseSchema,
      system: `${businessIdeaSystemPrompt}\n\nExtract only clear evidence from the supplied intake. Leave fields empty when the owner did not provide evidence. Do not invent business facts.`,
      prompt: text,
    }),
    {
      onRetry: (error, attempt) => {
        console.warn(`[BusinessIdeaParser] retry attempt ${attempt}:`, error instanceof Error ? error.message : String(error));
      },
    },
  );

  return object;
}

export function mergeBusinessIdeaIntake(
  parsed: BusinessIdeaParse,
  defaults: BusinessIdeaBrief,
): BusinessIdeaBrief {
  const brief = structuredClone(defaults);

  if (parsed.business_context) {
    for (const key of Object.keys(parsed.business_context) as Array<keyof typeof parsed.business_context>) {
      const value = parsed.business_context[key];
      if (value !== undefined) brief.business_context[key] = value;
    }
  }
  if (parsed.idea_opportunity) {
    for (const key of Object.keys(parsed.idea_opportunity) as Array<keyof typeof parsed.idea_opportunity>) {
      const value = parsed.idea_opportunity[key];
      if (value !== undefined) brief.idea_opportunity[key] = value;
    }
  }
  if (parsed.project_definition) {
    for (const key of Object.keys(parsed.project_definition) as Array<keyof typeof parsed.project_definition>) {
      const value = parsed.project_definition[key];
      if (value !== undefined) brief.project_definition[key] = value;
    }
  }
  if (parsed.assumptions) brief.assumptions = parsed.assumptions;
  if (parsed.open_questions) brief.open_questions = parsed.open_questions;

  return businessIdeaBriefSchema.parse(brief);
}

function normalizeMessages(messages: BusinessIdeaLlmMessage[]): Array<{
  role: 'user' | 'assistant';
  content: string | Array<{ type: 'text' | 'image'; text?: string; image?: string; mimeType?: string }>;
}> {
  return messages.map((message) => {
    if (typeof message.content === 'string') {
      return { role: message.role as 'user' | 'assistant', content: message.content };
    }

    return {
      role: message.role as 'user' | 'assistant',
      content: message.content.filter((part) => part.type === 'text' || (part.type === 'image' && part.image)).map((part) => {
        if (part.type === 'image') {
          return { type: 'image' as const, image: part.image!, mimeType: part.mimeType };
        }
        return { type: 'text' as const, text: part.text || '' };
      }),
    };
  });
}

export async function generateBusinessIdeaChatResponse(args: {
  sessionId: string;
  messages: BusinessIdeaLlmMessage[];
  currentBrief: BusinessIdeaBrief;
  currentCoverage?: Coverage;
  turnsSinceLastRecap?: number;
}): Promise<{
  partialObjectStream: AsyncIterable<unknown>;
  object: Promise<BusinessIdeaOutput>;
}> {
  const brief = businessIdeaBriefSchema.parse(args.currentBrief);
  const coverage = computeBusinessIdeaCoverage(brief);
  const system = buildBusinessIdeaSystemPrompt(args.turnsSinceLastRecap ?? 0, coverage, brief);
  const result = await withRetry(
    () => Promise.resolve(streamObject({
      model: openrouter.chat(BUSINESS_IDEA_MODEL),
      schema: businessIdeaOutputSchema,
      system,
      // The provider accepts multimodal content parts that are wider than the SDK's inferred union.
      messages: normalizeMessages(args.messages) as unknown as ModelMessage[],
    })),
    {
      onRetry: (error, attempt) => {
        console.warn(`[BusinessIdeaSession ${args.sessionId}] retry attempt ${attempt}:`, error instanceof Error ? error.message : String(error));
      },
    },
  );

  return {
    partialObjectStream: result.partialObjectStream,
    object: result.object.then((object) => ({
      ...object,
      message: stripAnsi(object.message),
    })),
  };
}

export async function generateBusinessIdeaInitialMessage(args: {
  businessName?: string;
  ideaName?: string;
  brief: BusinessIdeaBrief;
  coverage: Coverage;
}): Promise<string> {
  const hasContent = args.coverage.businessContext > 0 || args.coverage.ideaOpportunity > 0 || args.coverage.projectDefinition > 0;
  if (!hasContent) return '';

  const prompt = [
    'A business owner has shared an initial description for a new idea.',
    args.businessName ? `Business name: ${args.businessName}` : 'Business name: not provided',
    args.ideaName ? `Idea name: ${args.ideaName}` : 'Idea name: not provided',
    '',
    formatBusinessIdeaBriefForPrompt(args.brief),
    '',
    'Write a warm Markdown welcome in two or three short paragraphs. Acknowledge the specific context captured, invite corrections, and finish with exactly one open-ended business clarification question. Do not discuss implementation, pricing, or delivery.',
  ].join('\n');

  const { text } = await withRetry(
    () => generateText({
      model: openrouter.chat(BUSINESS_IDEA_MODEL),
      system: businessIdeaSystemPrompt,
      messages: [{ role: 'user' as const, content: prompt }],
    }),
    {
      onRetry: (error, attempt) => {
        console.warn(`[BusinessIdeaInitial] retry attempt ${attempt}:`, error instanceof Error ? error.message : String(error));
      },
    },
  );

  return stripAnsi(text);
}

export async function generateBusinessIdeaFallbackResponse(args: {
  messages: Array<{ role: string; content: string }>;
}): Promise<string> {
  const { text } = await withRetry(
    () => generateText({
      model: openrouter.chat(BUSINESS_IDEA_MODEL),
      system: businessIdeaSystemPrompt,
      messages: args.messages.map((message) => ({
        role: message.role as 'user' | 'assistant',
        content: message.content,
      })),
    }),
    {
      onRetry: (error, attempt) => {
        console.warn(`[BusinessIdeaFallback] retry attempt ${attempt}:`, error instanceof Error ? error.message : String(error));
      },
    },
  );

  return stripAnsi(text);
}
