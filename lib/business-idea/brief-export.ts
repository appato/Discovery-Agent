import type { BusinessIdeaBrief } from './schema';

function bulletList(items: string[]): string {
  return items.map((item) => `- ${item}`).join('\n');
}

function populatedSection(
  heading: string,
  fields: Array<[label: string, value: string]>,
): string | null {
  const populated = fields.filter(([, value]) => value.trim().length > 0);
  if (populated.length === 0) return null;

  const lines: string[] = [heading];
  for (const [label, value] of populated) {
    lines.push('', `### ${label}`, '', value);
  }
  return lines.join('\n');
}

export function generateBusinessIdeaBriefMarkdown(
  brief: BusinessIdeaBrief,
  opts?: { earlyStop?: boolean },
): string {
  const sections: string[] = ['# Business Idea Brief'];

  if (opts?.earlyStop) {
    sections.push('', '> **Warning**: This brief was generated early before all discovery areas had sufficient coverage. Some sections may be incomplete. A human review is strongly recommended.');
  }

  const businessContext = populatedSection('## Business Context', [
    ['Business Name', brief.business_context.business_name],
    ['Industry', brief.business_context.industry],
    ['Current Offering', brief.business_context.current_offering],
    ['Target Customers', brief.business_context.target_customers],
    ['Business Model', brief.business_context.business_model],
    ['Differentiators', brief.business_context.differentiators],
    ['Current Challenges', brief.business_context.current_challenges],
  ]);
  if (businessContext) sections.push('', businessContext);

  const ideaOpportunity = populatedSection('## Idea Opportunity', [
    ['Idea Summary', brief.idea_opportunity.idea_summary],
    ['Customer Problem', brief.idea_opportunity.customer_problem],
    ['Target Users', brief.idea_opportunity.target_users],
    ['Desired Outcomes', brief.idea_opportunity.desired_outcomes],
    ['Existing Alternatives', brief.idea_opportunity.existing_alternatives],
    ['Value Proposition', brief.idea_opportunity.value_proposition],
  ]);
  if (ideaOpportunity) sections.push('', ideaOpportunity);

  const projectDefinition = populatedSection('## Project Definition', [
    ['Project Goal', brief.project_definition.project_goal],
    ['Proposed Solution', brief.project_definition.proposed_solution],
    ['Primary User Journey', brief.project_definition.primary_user_journey],
    ['Must-Have Outcomes', brief.project_definition.must_have_outcomes],
    ['Nice-to-Have Outcomes', brief.project_definition.nice_to_have_outcomes],
    ['Scope Boundaries', brief.project_definition.scope_boundaries],
    ['Success Criteria', brief.project_definition.success_criteria],
  ]);
  if (projectDefinition) sections.push('', projectDefinition);

  if (brief.assumptions.length > 0) {
    sections.push('', '## Assumptions', '', bulletList(brief.assumptions));
  }
  if (brief.open_questions.length > 0) {
    sections.push('', '## Open Questions', '', bulletList(brief.open_questions));
  }

  return sections.join('\n') + '\n';
}
