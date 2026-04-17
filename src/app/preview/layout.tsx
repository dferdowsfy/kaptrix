import type { ReactNode } from "react";
import { FloatingKnowledgeChatbot } from "@/components/preview/floating-knowledge-chatbot";
import { PreviewShell } from "@/components/preview/preview-shell";

export default function PreviewLayout({ children }: { children: ReactNode }) {
  return (
    <PreviewShell>
      {children}
      <FloatingKnowledgeChatbot />
    </PreviewShell>
  );
}
