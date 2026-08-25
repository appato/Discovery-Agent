import { z } from 'zod';

const fetchedWebsiteSchema = z.object({
  url: z.string(),
  title: z.string(),
  metaDescription: z.string(),
  extractedText: z.string(),
  turnNumber: z.number(),
  fetchedAt: z.string().datetime({ offset: true }),
});

export const businessIdeaBriefSchema = z.object({
  business_context: z.object({
    business_name: z.string(),
    industry: z.string(),
    current_offering: z.string(),
    target_customers: z.string(),
    business_model: z.string(),
    differentiators: z.string(),
    current_challenges: z.string(),
  }),
  idea_opportunity: z.object({
    idea_summary: z.string(),
    customer_problem: z.string(),
    target_users: z.string(),
    desired_outcomes: z.string(),
    existing_alternatives: z.string(),
    value_proposition: z.string(),
  }),
  project_definition: z.object({
    project_goal: z.string(),
    proposed_solution: z.string(),
    primary_user_journey: z.string(),
    must_have_outcomes: z.string(),
    nice_to_have_outcomes: z.string(),
    scope_boundaries: z.string(),
    success_criteria: z.string(),
  }),
  assumptions: z.array(z.string()),
  open_questions: z.array(z.string()),
  approval_status: z.enum(['draft', 'reviewed', 'approved']),
});

export const businessIdeaSessionSchema = z.object({
  sessionId: z.string(),
  projectId: z.string(),
  status: z.enum(['in_discovery', 'brief_ready', 'approved']),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  shareableUrl: z.string(),
  metadata: z.object({
    businessName: z.string(),
    ideaName: z.string(),
    agentType: z.literal('business_idea'),
  }),
  chatHistory: z.array(z.any()),
  businessIdeaBrief: businessIdeaBriefSchema,
  coverage: z.object({
    businessContext: z.number(),
    ideaOpportunity: z.number(),
    projectDefinition: z.number(),
  }),
  contradictions: z.array(z.any()),
  assumptions: z.array(z.any()),
  openQuestions: z.array(z.any()),
  recapHistory: z.array(z.any()),
  lastRecapTurn: z.number(),
  outOfScopeTopics: z.array(z.any()),
  llmReasoning: z.string(),
  briefMarkdown: z.string(),
  uploadedImages: z.array(z.any()),
  fetchedWebsites: z.array(fetchedWebsiteSchema),
});

export type BusinessIdeaBrief = z.infer<typeof businessIdeaBriefSchema>;
export type BusinessIdeaSession = z.infer<typeof businessIdeaSessionSchema>;

export function createDefaultBusinessIdeaBrief(): BusinessIdeaBrief {
  return {
    business_context: {
      business_name: '',
      industry: '',
      current_offering: '',
      target_customers: '',
      business_model: '',
      differentiators: '',
      current_challenges: '',
    },
    idea_opportunity: {
      idea_summary: '',
      customer_problem: '',
      target_users: '',
      desired_outcomes: '',
      existing_alternatives: '',
      value_proposition: '',
    },
    project_definition: {
      project_goal: '',
      proposed_solution: '',
      primary_user_journey: '',
      must_have_outcomes: '',
      nice_to_have_outcomes: '',
      scope_boundaries: '',
      success_criteria: '',
    },
    assumptions: [],
    open_questions: [],
    approval_status: 'draft',
  };
}
