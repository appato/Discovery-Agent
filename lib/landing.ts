export type LandingStepIcon = 'document' | 'sparkles' | 'chat' | 'check';

export interface LandingStep {
  icon: LandingStepIcon;
  title: string;
  description: string;
}

export interface LandingField {
  key: string;
  multipartName: string;
  label: string;
  placeholder: string;
}

export interface LandingContextText {
  key: string;
  multipartName: string;
  placeholder: string;
}

export interface LandingContextFile {
  multipartName: string;
  accept: string;
  description: string;
}

export interface LandingConfig {
  agentType: 'discovery' | 'business_idea';
  agentTitle: string;
  intro: string;
  steps: readonly LandingStep[];
  fields: readonly LandingField[];
  contextText: LandingContextText;
  contextFile: LandingContextFile;
  endpoint: string;
  sessionPath: string;
  formTitle: string;
  formDescription: string;
  validationMessage: string;
  submitLabel: string;
}

const sharedSteps: readonly LandingStep[] = [
  {
    icon: 'document',
    title: 'Share requirements',
    description: 'Upload a brief or describe your project in a few sentences. Our AI extracts what matters.',
  },
  {
    icon: 'sparkles',
    title: 'AI structures the intake',
    description: 'Your requirements are parsed into a structured brief covering product, functional, and aesthetic domains.',
  },
  {
    icon: 'chat',
    title: 'Collaborative discovery',
    description: 'The agent asks thoughtful questions, fills gaps, and refines your vision through conversation.',
  },
  {
    icon: 'check',
    title: 'Comprehensive brief',
    description: 'Get a polished, developer-ready brief that captures the full scope of your project.',
  },
];

export const discoveryLandingConfig: LandingConfig = {
  agentType: 'discovery',
  agentTitle: 'Discovery Agent',
  intro: 'Welcome to Appato! You have taken the first step towards making your vision come to life. Our AI-powered Discovery Agent guides you through a natural conversation, capturing everything from product context and functional needs to aesthetic direction.',
  steps: sharedSteps,
  fields: [
    {
      key: 'clientName',
      multipartName: 'client_name',
      label: 'Client / Organization name',
      placeholder: 'Client / Organization name (optional)',
    },
    {
      key: 'projectName',
      multipartName: 'project_name',
      label: 'Project name',
      placeholder: 'Project name (optional)',
    },
  ],
  contextText: {
    key: 'textareaValue',
    multipartName: 'initial_text',
    placeholder: 'Paste or type your project requirements...',
  },
  contextFile: {
    multipartName: 'requirement_doc',
    accept: '.pdf,.txt,.md',
    description: 'PDF, TXT, or Markdown files supported',
  },
  endpoint: '/api/projects',
  sessionPath: '/session',
  formTitle: 'Start a Discovery Session',
  formDescription: 'Provide your project details and our AI will begin the discovery process.',
  validationMessage: 'Please provide either a file or some text describing the project requirements.',
  submitLabel: 'Start Discovery Session',
};

export const businessIdeaLandingConfig: LandingConfig = {
  agentType: 'business_idea',
  agentTitle: 'Business Idea Agent',
  intro: 'Bring a rough idea, notes, or context about your business. We’ll work through what your business does, who it serves, the problem the idea addresses, and what the resulting project should include.',
  steps: [
    {
      icon: 'document',
      title: 'Share your starting point',
      description: 'Describe your business and idea, or upload notes that give us a starting point.',
    },
    {
      icon: 'sparkles',
      title: 'Map the business context',
      description: 'Clarify what the business offers, who it serves, and the challenge behind the idea.',
    },
    {
      icon: 'chat',
      title: 'Shape the project',
      description: 'Turn the opportunity into a concrete goal, user journey, outcomes, and boundaries.',
    },
    {
      icon: 'check',
      title: 'Review your Business Idea Brief',
      description: 'Approve a shared understanding of the business and the project definition it supports.',
    },
  ],
  fields: [
    {
      key: 'businessName',
      multipartName: 'business_name',
      label: 'Business name',
      placeholder: 'Business name (optional)',
    },
    {
      key: 'ideaName',
      multipartName: 'idea_name',
      label: 'Idea / project name',
      placeholder: 'Idea / project name (optional)',
    },
  ],
  contextText: {
    key: 'textareaValue',
    multipartName: 'initial_context',
    placeholder: 'Describe your business, rough idea, or the context you want to clarify...',
  },
  contextFile: {
    multipartName: 'context_doc',
    accept: '.pdf,.txt,.md',
    description: 'PDF, TXT, or Markdown files supported',
  },
  endpoint: '/api/business-ideas',
  sessionPath: '/business-idea/session',
  formTitle: 'Start a Business Idea Session',
  formDescription: 'Share what you know so far and our AI will help turn it into a clear project definition.',
  validationMessage: 'Please provide a rough idea or context about your business.',
  submitLabel: 'Start Business Idea Session',
};
