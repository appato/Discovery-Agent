export interface CoverageSegment {
  key: string;
  label: string;
  colorClass: string;
  streamKey?: string;
}

export interface AgentUiConfig {
  agentName: string;
  welcomeCopy: string;
  artifactName: string;
  apiBasePath: string;
  browserSessionBasePath: string;
  coverageSegments: readonly CoverageSegment[];
  metadata: {
    primaryKey: string;
    secondaryKey: string;
    primaryLabel: string;
    secondaryLabel: string;
    primaryFallback: string;
    secondaryFallback: string;
  };
  coverageHeading: string;
  emptyState: {
    title: string;
    description: string;
  };
  reviewHeading: string;
  reviewDescription: string;
  approvedHeading: string;
  approvedDescription: string;
  downloadLabel: string;
}

export const discoveryAgentUiConfig: AgentUiConfig = {
  agentName: 'Discovery Agent',
  welcomeCopy: "Hello! I'll guide you through a structured conversation to define your project requirements across product context, functional needs, and aesthetic direction.",
  artifactName: 'Discovery Brief',
  apiBasePath: '/api/session',
  browserSessionBasePath: '/session',
  coverageSegments: [
    { key: 'productContext', streamKey: 'product_context', label: 'Product Context', colorClass: 'bg-blue-500' },
    { key: 'functional', label: 'Functional', colorClass: 'bg-green-500' },
    { key: 'aesthetics', label: 'Aesthetics', colorClass: 'bg-purple-500' },
  ],
  metadata: {
    primaryKey: 'projectName',
    secondaryKey: 'clientName',
    primaryLabel: 'Project',
    secondaryLabel: 'Client',
    primaryFallback: 'New Project',
    secondaryFallback: 'Client',
  },
  coverageHeading: 'Discovery Coverage',
  emptyState: {
    title: 'Type your first message to start the discovery session.',
    description: "I'll ask about your product context, functional needs, and aesthetic preferences.",
  },
  reviewHeading: 'Review Your Discovery Brief',
  reviewDescription: 'Below is the structured brief generated from our conversation. Please review it carefully before approving.',
  approvedHeading: 'Brief Approved',
  approvedDescription: 'This brief has been approved and is read-only. The project is now closed.',
  downloadLabel: 'Download Brief',
};

export const businessIdeaAgentUiConfig: AgentUiConfig = {
  agentName: 'Business Idea Agent',
  welcomeCopy: "Hello! I'll help you clarify what your business does, who it serves, the opportunity behind your idea, and the project it should become.",
  artifactName: 'Business Idea Brief',
  apiBasePath: '/api/business-ideas/session',
  browserSessionBasePath: '/business-idea/session',
  coverageSegments: [
    { key: 'businessContext', label: 'Business Context', colorClass: 'bg-blue-500' },
    { key: 'ideaOpportunity', label: 'Idea Opportunity', colorClass: 'bg-emerald-500' },
    { key: 'projectDefinition', label: 'Project Definition', colorClass: 'bg-purple-500' },
  ],
  metadata: {
    primaryKey: 'businessName',
    secondaryKey: 'ideaName',
    primaryLabel: 'Business',
    secondaryLabel: 'Idea / Project',
    primaryFallback: 'New Business',
    secondaryFallback: 'Business Idea',
  },
  coverageHeading: 'Business Idea Coverage',
  emptyState: {
    title: 'Describe your business and idea to start.',
    description: "I'll ask one question at a time to clarify the opportunity and shape the project definition.",
  },
  reviewHeading: 'Review Your Business Idea Brief',
  reviewDescription: 'Below is the Business Idea Brief generated from our conversation. Please review it carefully before approving.',
  approvedHeading: 'Business Idea Brief Approved',
  approvedDescription: 'This Business Idea Brief has been approved and is read-only. The project is now closed.',
  downloadLabel: 'Download Business Idea Brief',
};
