import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { extractText, isImageFile, isSupportedFile } from '@/lib/files';
import {
  parseBusinessIdeaIntake,
  mergeBusinessIdeaIntake,
  generateBusinessIdeaInitialMessage,
} from '@/lib/business-idea/llm';
import { computeBusinessIdeaCoverage } from '@/lib/business-idea/coverage';
import { createDefaultBusinessIdeaBrief } from '@/lib/business-idea/schema';
import { BusinessIdeaSessionStore } from '@/lib/business-idea/store';

export async function POST(request: NextRequest) {
  if (!process.env.OPENROUTER_API_KEY?.trim()) {
    return NextResponse.json(
      { error: 'Business Idea Agent is not configured.' },
      { status: 503 },
    );
  }

  const formData = await request.formData();
  const businessName = formData.get('business_name') as string | null;
  const ideaName = formData.get('idea_name') as string | null;
  const initialContext = formData.get('initial_context') as string | null;
  const contextDoc = formData.get('context_doc') as File | null;

  let brief = createDefaultBusinessIdeaBrief();
  let parseError = false;
  let intakeText: string | null = null;

  if (contextDoc && contextDoc.size > 0) {
    if (!isSupportedFile(contextDoc.type) || isImageFile(contextDoc.type)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${contextDoc.name}` },
        { status: 400 },
      );
    }
    const buffer = Buffer.from(await contextDoc.arrayBuffer());
    intakeText = await extractText(buffer, contextDoc.name, contextDoc.type);
  } else if (initialContext && initialContext.trim().length > 0) {
    intakeText = initialContext;
  }

  if (intakeText) {
    try {
      const parsed = await parseBusinessIdeaIntake(intakeText);
      brief = mergeBusinessIdeaIntake(parsed, brief);
    } catch {
      parseError = true;
    }
  }

  if (businessName && businessName.trim()) {
    brief.business_context.business_name = businessName.trim();
  }

  const sessionId = randomUUID();
  const shareableUrl = `/business-idea/session/${sessionId}`;
  const coverage = computeBusinessIdeaCoverage(brief);
  const hasContent = coverage.businessContext > 0 || coverage.ideaOpportunity > 0 || coverage.projectDefinition > 0;

  let initialChatHistory: Array<{ role: string; content: string }> = [];
  if (hasContent) {
    const assistantMessage = await generateBusinessIdeaInitialMessage({
      businessName: businessName?.trim() || undefined,
      ideaName: ideaName?.trim() || undefined,
      brief,
      coverage,
    });
    if (assistantMessage) {
      initialChatHistory = [{ role: 'assistant', content: assistantMessage }];
    }
  }

  const store = new BusinessIdeaSessionStore();
  const session = await store.createSeededSession({
    businessName: businessName?.trim() || undefined,
    ideaName: ideaName?.trim() || undefined,
    businessIdeaBrief: brief,
    sessionId,
    shareableUrl,
    initialChatHistory,
  });

  return NextResponse.json({
    projectId: session.projectId,
    sessionId: session.sessionId,
    shareableUrl,
    initialState: session,
    ...(parseError && { parseError: true }),
  }, { status: 200 });
}
