import { SessionChat } from '@/components/session-chat';
import { businessIdeaAgentUiConfig } from '@/lib/agent-ui';

export default function BusinessIdeaSessionPage({ params }: { params: Promise<{ id: string }> }) {
  return <SessionChat params={params} config={businessIdeaAgentUiConfig} />;
}
