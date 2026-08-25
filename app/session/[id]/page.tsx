import { SessionChat } from '@/components/session-chat';
import { discoveryAgentUiConfig } from '@/lib/agent-ui';

export default function SessionChatPage({ params }: { params: Promise<{ id: string }> }) {
  return <SessionChat params={params} config={discoveryAgentUiConfig} />;
}
