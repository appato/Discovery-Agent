import type { BusinessIdeaBrief } from './schema';

function ratio(filled: number, total: number): number {
  return Math.round((filled / total) * 100) / 100;
}

export function computeBusinessIdeaCoverage(brief: BusinessIdeaBrief): {
  businessContext: number;
  ideaOpportunity: number;
  projectDefinition: number;
} {
  const businessContextFields = [
    brief.business_context.industry,
    brief.business_context.current_offering,
    brief.business_context.target_customers,
    brief.business_context.business_model,
    brief.business_context.differentiators,
    brief.business_context.current_challenges,
  ];
  const opportunityFields = [
    brief.idea_opportunity.idea_summary,
    brief.idea_opportunity.customer_problem,
    brief.idea_opportunity.target_users,
    brief.idea_opportunity.desired_outcomes,
    brief.idea_opportunity.existing_alternatives,
    brief.idea_opportunity.value_proposition,
  ];
  const projectFields = [
    brief.project_definition.project_goal,
    brief.project_definition.proposed_solution,
    brief.project_definition.primary_user_journey,
    brief.project_definition.must_have_outcomes,
    brief.project_definition.nice_to_have_outcomes,
    brief.project_definition.scope_boundaries,
    brief.project_definition.success_criteria,
  ];

  return {
    businessContext: ratio(businessContextFields.filter((value) => value.trim().length > 0).length, 6),
    ideaOpportunity: ratio(opportunityFields.filter((value) => value.trim().length > 0).length, 6),
    projectDefinition: ratio(projectFields.filter((value) => value.trim().length > 0).length, 7),
  };
}
