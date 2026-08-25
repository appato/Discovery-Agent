import { describe, expect, it } from 'vitest';
import { generateBusinessIdeaBriefMarkdown } from '@/lib/business-idea/brief-export';
import { createDefaultBusinessIdeaBrief } from '@/lib/business-idea/schema';

describe('generateBusinessIdeaBriefMarkdown', () => {
  it('renders populated fields under Business Idea Brief headings', () => {
    const brief = createDefaultBusinessIdeaBrief();
    brief.business_context.business_name = 'Petal & Stem';
    brief.business_context.current_offering = 'Local florist services';
    brief.idea_opportunity.idea_summary = 'Online bouquet planning';
    brief.project_definition.project_goal = 'Make wedding planning easier';
    brief.assumptions = ['Wedding customers can share inspiration'];
    brief.open_questions = ['Which consultation moments need human follow-up?'];

    const markdown = generateBusinessIdeaBriefMarkdown(brief);

    expect(markdown).toContain('# Business Idea Brief');
    expect(markdown).toContain('## Business Context');
    expect(markdown).toContain('Petal & Stem');
    expect(markdown).toContain('## Idea Opportunity');
    expect(markdown).toContain('Online bouquet planning');
    expect(markdown).toContain('## Project Definition');
    expect(markdown).toContain('Make wedding planning easier');
    expect(markdown).toContain('## Assumptions');
    expect(markdown).toContain('## Open Questions');
  });

  it('omits empty sections and adds the early completion warning', () => {
    const brief = createDefaultBusinessIdeaBrief();
    brief.business_context.industry = 'Retail';

    const markdown = generateBusinessIdeaBriefMarkdown(brief, { earlyStop: true });

    expect(markdown).toContain('> **Warning**');
    expect(markdown).toContain('incomplete');
    expect(markdown).toContain('## Business Context');
    expect(markdown).not.toContain('## Idea Opportunity');
    expect(markdown).not.toContain('## Project Definition');
    expect(markdown).not.toContain('## Assumptions');
    expect(markdown).not.toContain('## Open Questions');
  });
});
