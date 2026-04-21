import type { ReactNode } from "react";
import { ChatPanelProvider } from "@/components/preview/chat-panel-context";
import { KnowledgeChatPanel } from "@/components/preview/floating-knowledge-chatbot";
import { PreviewShell } from "@/components/preview/preview-shell";
import { SystemSignalPill } from "@/components/preview/system-signal-pill";

export default function PreviewLayout({ children }: { children: ReactNode }) {
  return (
    <ChatPanelProvider>
      <PreviewShell chatPanel={<KnowledgeChatPanel />}>
        {children}
      </PreviewShell>
      <SystemSignalPill />
    </ChatPanelProvider>
  );
}
