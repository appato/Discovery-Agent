import { describe, expect, it } from 'vitest';
import { computeBusinessIdeaCoverage } from '@/lib/business-idea/coverage';
import { createDefaultBusinessIdeaBrief } from '@/lib/business-idea/schema';

describe('computeBusinessIdeaCoverage', () => {
  it('returns zero for the default brief', () => {
    expect(computeBusinessIdeaCoverage(createDefaultBusinessIdeaBrief())).toEqual({
      businessContext: 0,
      ideaOpportunity: 0,
      projectDefinition: 0,
    });
  });

  it('calculates each domain independently from populated fields', () => {
    const brief = createDefaultBusinessIdeaBrief();
    brief.business_context.industry = 'Retail';
    brief.business_context.current_offering = 'Local florist services';
    brief.idea_opportunity.idea_summary = 'Online bouquet planning';
    brief.idea_opportunity.customer_problem = 'Wedding customers need guidance';
    brief.project_definition.project_goal = 'Help customers plan bouquets';
    brief.project_definition.proposed_solution = 'A guided consultation experience';
    brief.project_definition.primary_user_journey = 'Describe needs, review suggestions, book a consultation';

    expect(computeBusinessIdeaCoverage(brief)).toEqual({
      businessContext: 0.33,
      ideaOpportunity: 0.33,
      projectDefinition: 0.43,
    });
  });

  it('does not count the optional business name', () => {
    const brief = createDefaultBusinessIdeaBrief();
    brief.business_context.business_name = 'Petal & Stem';

    expect(computeBusinessIdeaCoverage(brief).businessContext).toBe(0);
  });
});
