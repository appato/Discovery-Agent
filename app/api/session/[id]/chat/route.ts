import { NextRequest } from 'next/server';
import { SessionStore } from '@/lib/session/store';
import { generateChatResponse, generateFallbackResponse, type DiscoveryOutput } from '@/lib/llm/chat';
import { ChatTurnInputError, prepareChatTurn } from '@/lib/session/chat-turn';
import { generateBriefMarkdown } from '@/lib/brief-export';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const store = new SessionStore();
  const session = await store.getSession(id);
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

  let partialObjectStream: AsyncIterable<unknown>;
  let object: Promise<DiscoveryOutput>;

  try {
    const result = await generateChatResponse({
      sessionId: id,
      messages: llmMessages,
      currentBrief: session.structuredBrief,
      currentCoverage: session.coverage,
      turnsSinceLastRecap,
    });
    partialObjectStream = result.partialObjectStream;
    object = result.object;
  } catch {
    const fallbackMessage = await generateFallbackResponse({
      messages: llmMessages.map((message) => ({
        role: message.role,
        content: typeof message.content === 'string'
          ? message.content
          : message.content.find((part) => part.type === 'text')?.text || '[image]',
      })),
    });

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
      coverage: {
        productContext: session.coverage.productContext,
        functional: session.coverage.functional,
        aesthetics: session.coverage.aesthetics,
      },
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
        coverage: updatedSession.coverage,
        turnNumber: assistantMessage.turnNumber,
        fallback: true,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const partials: unknown[] = [];
  for await (const partial of partialObjectStream) {
    partials.push(partial);
  }

  const finalObject = await object;
  const assistantMessage = {
    turnNumber: turnNumber + 1,
    role: 'assistant' as const,
    content: finalObject.message,
    contentType: 'text' as const,
    timestamp: new Date().toISOString(),
  };

  const updatedSession = {
    ...session,
    chatHistory: [...session.chatHistory, userMessage, assistantMessage],
    status: finalObject.is_final ? 'brief_ready' as const : session.status,
    coverage: {
      productContext: finalObject.state_update.coverage.product_context,
      functional: finalObject.state_update.coverage.functional,
      aesthetics: finalObject.state_update.coverage.aesthetics,
    },
    contradictions: [
      ...session.contradictions,
      ...finalObject.state_update.contradictions.filter(
        (contradiction: string) => !session.contradictions.includes(contradiction),
      ),
    ],
    assumptions: [
      ...session.assumptions,
      ...finalObject.state_update.assumptions.filter(
        (assumption: string) => !session.assumptions.includes(assumption),
      ),
    ],
    openQuestions: [
      ...session.openQuestions,
      ...finalObject.state_update.open_questions.filter(
        (question: string) => !session.openQuestions.includes(question),
      ),
    ],
    outOfScopeTopics: [
      ...session.outOfScopeTopics,
      ...finalObject.state_update.out_of_scope_topics,
    ],
    lastRecapTurn: finalObject.is_recap ? assistantMessage.turnNumber : session.lastRecapTurn,
    recapHistory: finalObject.is_recap
      ? [...session.recapHistory, { turnNumber: assistantMessage.turnNumber, content: finalObject.message }]
      : session.recapHistory,
    briefMarkdown: finalObject.is_final
      ? generateBriefMarkdown(session.structuredBrief, {
          earlyStop: session.coverage.productContext < 0.5 ||
            session.coverage.functional < 0.5 ||
            session.coverage.aesthetics < 0.5,
        })
      : session.briefMarkdown,
    uploadedImages: uploadedImageMeta
      ? [...session.uploadedImages, uploadedImageMeta]
      : session.uploadedImages,
    fetchedWebsites: [...session.fetchedWebsites, ...fetchedWebsitesData],
    updatedAt: new Date().toISOString(),
  };

  await store.updateSession(updatedSession);

  const encoder = new TextEncoder();
  const body = new ReadableStream({
    start(controller) {
      for (const partial of partials) {
        controller.enqueue(encoder.encode(JSON.stringify(partial) + '\n'));
      }
      controller.enqueue(encoder.encode(JSON.stringify(finalObject) + '\n'));
      controller.close();
    },
  });

  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'application/x-ndjson' },
  });
}
