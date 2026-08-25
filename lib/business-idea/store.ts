import { randomUUID } from 'crypto';
import { businessIdeaSessionSchema, createDefaultBusinessIdeaBrief, type BusinessIdeaBrief, type BusinessIdeaSession } from './schema';
import { computeBusinessIdeaCoverage } from './coverage';
import { type StorageBackend, FileSessionBackend } from '@/lib/session/backend';
import { SupabaseSessionBackend } from '@/lib/session/supabase-backend';
import { type SessionRow } from '@/lib/supabase/client';

export function businessIdeaSessionToRow(session: BusinessIdeaSession): SessionRow {
  return {
    id: session.sessionId,
    project_id: session.projectId,
    status: session.status,
    metadata: session.metadata,
    structured_brief: session.businessIdeaBrief,
    coverage: session.coverage,
    chat_history: session.chatHistory,
    contradictions: session.contradictions,
    assumptions: session.assumptions,
    open_questions: session.openQuestions,
    recap_history: session.recapHistory,
    out_of_scope_topics: session.outOfScopeTopics,
    brief_markdown: session.briefMarkdown,
    llm_reasoning: session.llmReasoning,
    uploaded_images: session.uploadedImages,
    fetched_websites: session.fetchedWebsites,
    last_recap_turn: session.lastRecapTurn,
    shareable_url: session.shareableUrl,
    created_at: session.createdAt,
    updated_at: session.updatedAt,
  };
}

export function rowToBusinessIdeaSession(row: SessionRow): BusinessIdeaSession {
  return businessIdeaSessionSchema.parse({
    sessionId: row.id,
    projectId: row.project_id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    shareableUrl: row.shareable_url,
    metadata: row.metadata,
    chatHistory: row.chat_history,
    businessIdeaBrief: row.structured_brief,
    coverage: row.coverage,
    contradictions: row.contradictions,
    assumptions: row.assumptions,
    openQuestions: row.open_questions,
    recapHistory: row.recap_history,
    lastRecapTurn: row.last_recap_turn,
    outOfScopeTopics: row.out_of_scope_topics,
    llmReasoning: row.llm_reasoning,
    briefMarkdown: row.brief_markdown,
    uploadedImages: row.uploaded_images,
    fetchedWebsites: row.fetched_websites,
  });
}

function createBusinessIdeaBackend(dir: string): StorageBackend<BusinessIdeaSession> {
  switch (process.env.STORAGE_BACKEND || 'file') {
    case 'file':
      return new FileSessionBackend(dir, businessIdeaSessionSchema);
    case 'supabase':
      return new SupabaseSessionBackend(businessIdeaSessionToRow, rowToBusinessIdeaSession);
    default:
      throw new Error(`Unknown STORAGE_BACKEND: ${process.env.STORAGE_BACKEND}`);
  }
}

export class BusinessIdeaSessionStore {
  private backend: StorageBackend<BusinessIdeaSession>;

  constructor(private dir: string = process.env.SESSIONS_DIR || 'sessions') {
    this.backend = createBusinessIdeaBackend(this.dir);
  }

  async createSession(): Promise<BusinessIdeaSession> {
    return this.createSeededSession();
  }

  async createSeededSession(opts?: {
    businessName?: string;
    ideaName?: string;
    businessIdeaBrief?: BusinessIdeaBrief;
    sessionId?: string;
    shareableUrl?: string;
    initialChatHistory?: Array<{ role: string; content: string; turnNumber?: number; contentType?: string; timestamp?: string }>;
  }): Promise<BusinessIdeaSession> {
    const sessionId = opts?.sessionId || randomUUID();
    const projectId = randomUUID();
    const now = new Date().toISOString();
    const brief = opts?.businessIdeaBrief || createDefaultBusinessIdeaBrief();
    const initialHistory = (opts?.initialChatHistory || []).map((message, index) => ({
      turnNumber: message.turnNumber ?? index + 1,
      role: message.role as 'user' | 'assistant',
      content: message.content,
      contentType: message.contentType || 'text',
      timestamp: message.timestamp || now,
    }));

    const session = businessIdeaSessionSchema.parse({
      sessionId,
      projectId,
      status: 'in_discovery',
      createdAt: now,
      updatedAt: now,
      shareableUrl: opts?.shareableUrl || '',
      metadata: {
        businessName: opts?.businessName || '',
        ideaName: opts?.ideaName || '',
        agentType: 'business_idea',
      },
      chatHistory: initialHistory,
      businessIdeaBrief: brief,
      coverage: computeBusinessIdeaCoverage(brief),
      contradictions: [],
      assumptions: [],
      openQuestions: [],
      recapHistory: [],
      lastRecapTurn: 0,
      outOfScopeTopics: [],
      llmReasoning: '',
      briefMarkdown: '',
      uploadedImages: [],
      fetchedWebsites: [],
    });

    await this.backend.createSession(session);
    return session;
  }

  async getSession(sessionId: string): Promise<BusinessIdeaSession> {
    return this.backend.getSession(sessionId);
  }

  async updateSession(session: BusinessIdeaSession): Promise<void> {
    await this.backend.updateSession(session);
  }
}
