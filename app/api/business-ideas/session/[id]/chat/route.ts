import { NextRequest } from 'next/server';
import { BusinessIdeaSessionStore } from '@/lib/business-idea/store';
import { businessIdeaBriefSchema } from '@/lib/business-idea/schema';
import {
  generateBusinessIdeaChatResponse,
  generateBusinessIdeaFallbackResponse,
  type BusinessIdeaOutput,
} from '@/lib/business-idea/llm';
import { computeBusinessIdeaCoverage } from '@/lib/business-idea/coverage';
import { generateBusinessIdeaBriefMarkdown } from '@/lib/business-idea/brief-export';
import { ChatTurnInputError, prepareChatTurn } from '@/lib/session/chat-turn';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!process.env.OPENROUTER_API_KEY?.trim()) {
    return new Response(
      JSON.stringify({ error: 'Business Idea Agent is not configured.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const { id } = await params;
  const store = new BusinessIdeaSessionStore();
  let session;
  try {
    session = await store.getSession(id);
  } catch {
    return new Response(
      JSON.stringify({ error: 'Session not found' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const turnNumber = session.chatHistory.length + 1;
  let preparedTurn;
  try {
    preparedTurn = await prepareChatTurn({
      request,
      sessionId: id,
      turnNumber,
      chatHistory: session.chatHistory.map((history) => ({
        role: history.role,
        content: history.content,
      })),
    });
  } catch (error) {
    if (error instanceof ChatTurnInputError) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }
    throw error;
  }

  const {
    userMessage,
    llmMessages,
    uploadedImageMeta,
    fetchedWebsitesData,
  } = preparedTurn;
  const turnsSinceLastRecap = turnNumber - session.lastRecapTurn;

  try {
    const result = await generateBusinessIdeaChatResponse({
      sessionId: id,
      messages: llmMessages,
      currentBrief: session.businessIdeaBrief,
      currentCoverage: session.coverage,
      turnsSinceLastRecap,
    });
    const partials: unknown[] = [];
    for await (const partial of result.partialObjectStream) {
      partials.push(partial);
    }
    const finalObject: BusinessIdeaOutput = await result.object;
    const updatedBrief = businessIdeaBriefSchema.parse(finalObject.state_update.brief);
    updatedBrief.assumptions = Array.from(new Set(updatedBrief.assumptions));
    updatedBrief.open_questions = Array.from(new Set(updatedBrief.open_questions));
    const updatedCoverage = computeBusinessIdeaCoverage(updatedBrief);
    const assistantMessage = {
      turnNumber: turnNumber + 1,
      role: 'assistant' as const,
      content: finalObject.message,
      contentType: 'text' as const,
      timestamp: new Date().toISOString(),
    };
    const assumptions = Array.from(new Set([
      ...session.assumptions,
      ...session.businessIdeaBrief.assumptions,
      ...updatedBrief.assumptions,
    ]));
    const openQuestions = Array.from(new Set([
      ...session.openQuestions,
      ...session.businessIdeaBrief.open_questions,
      ...updatedBrief.open_questions,
    ]));
    const contradictions = Array.from(new Set([
      ...session.contradictions,
      ...finalObject.state_update.contradictions,
    ]));
    const outOfScopeTopics = Array.from(new Set([
      ...session.outOfScopeTopics,
      ...finalObject.state_update.out_of_scope_topics,
    ]));

    const updatedSession = {
      ...session,
      chatHistory: [...session.chatHistory, userMessage, assistantMessage],
      status: finalObject.is_final ? 'brief_ready' as const : session.status,
      businessIdeaBrief: updatedBrief,
      coverage: updatedCoverage,
      contradictions,
      assumptions,
      openQuestions,
      outOfScopeTopics,
      llmReasoning: finalObject.reasoning,
      lastRecapTurn: finalObject.is_recap ? assistantMessage.turnNumber : session.lastRecapTurn,
      recapHistory: finalObject.is_recap
        ? [...session.recapHistory, { turnNumber: assistantMessage.turnNumber, content: finalObject.message }]
        : session.recapHistory,
      briefMarkdown: finalObject.is_final
        ? generateBusinessIdeaBriefMarkdown(updatedBrief, {
            earlyStop: updatedCoverage.businessContext < 0.7 ||
              updatedCoverage.ideaOpportunity < 0.7 ||
              updatedCoverage.projectDefinition < 0.7,
          })
        : session.briefMarkdown,
      uploadedImages: uploadedImageMeta
        ? [...session.uploadedImages, uploadedImageMeta]
        : session.uploadedImages,
      fetchedWebsites: [...session.fetchedWebsites, ...fetchedWebsitesData],
      updatedAt: new Date().toISOString(),
    };

    await store.updateSession(updatedSession);

    const streamedFinalObject = {
      ...finalObject,
      state_update: {
        ...finalObject.state_update,
        coverage: updatedCoverage,
      },
    };
    const encoder = new TextEncoder();
    const body = new ReadableStream({
      start(controller) {
        for (const partial of partials) {
          controller.enqueue(encoder.encode(JSON.stringify(partial) + '\n'));
        }
        controller.enqueue(encoder.encode(JSON.stringify(streamedFinalObject) + '\n'));
        controller.close();
      },
    });

    return new Response(body, {
      status: 200,
      headers: { 'Content-Type': 'application/x-ndjson' },
    });
  } catch {
    let fallbackMessage: string;
    try {
      fallbackMessage = await generateBusinessIdeaFallbackResponse({
        messages: llmMessages.map((message) => ({
          role: message.role,
          content: typeof message.content === 'string'
            ? message.content
            : message.content.find((part) => part.type === 'text')?.text || '[image]',
        })),
      });
    } catch {
      return new Response(
        JSON.stringify({ error: 'Business Idea Agent could not process that message.' }),
        { status: 502, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const assistantMessage = {
      turnNumber: turnNumber + 1,
      role: 'assistant' as const,
      content: fallbackMessage,
      contentType: 'text' as const,
      timestamp: new Date().toISOString(),
    };
    const updatedSession = {
      ...session,
      chatHistory: [...session.chatHistory, userMessage, assistantMessage],
      uploadedImages: uploadedImageMeta
        ? [...session.uploadedImages, uploadedImageMeta]
        : session.uploadedImages,
      fetchedWebsites: [...session.fetchedWebsites, ...fetchedWebsitesData],
      updatedAt: new Date().toISOString(),
    };

    await store.updateSession(updatedSession);

    return new Response(
      JSON.stringify({
        message: fallbackMessage,
        coverage: session.coverage,
        turnNumber: assistantMessage.turnNumber,
        fallback: true,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
