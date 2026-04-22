import type { ReactNode } from "react";
import { ChatPanelProvider } from "@/components/preview/chat-panel-context";
import { KnowledgeChatPanel } from "@/components/preview/floating-knowledge-chatbot";
import { PreviewShell } from "@/components/preview/preview-shell";
import { SystemSignalPill } from "@/components/preview/system-signal-pill";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Server-side admin hide enforcement.
//
// Reads the signed-in user's `hidden_menu_keys` on every render and passes
// it to PreviewShell so:
//   1. The nav hides admin-locked tabs on first paint (no client flash).
//   2. The PreviewShell route guard has the correct list immediately and
//      can redirect away from a hidden route without waiting for a client
//      fetch.
// ---------------------------------------------------------------------------
async function loadServerHidden(): Promise<string[]> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];
    const { data } = await supabase
      .from("users")
      .select("hidden_menu_keys")
      .eq("id", user.id)
      .maybeSingle();
    const keys = (data?.hidden_menu_keys as string[] | null) ?? [];
    return keys.filter((k): k is string => typeof k === "string");
  } catch {
    return [];
  }
}

export default async function PreviewLayout({
  children,
}: {
  children: ReactNode;
}) {
  const serverHidden = await loadServerHidden();

  return (
    <ChatPanelProvider>
      <PreviewShell
        chatPanel={<KnowledgeChatPanel />}
        initialServerHidden={serverHidden}
      >
        {children}
      </PreviewShell>
      <SystemSignalPill />
    </ChatPanelProvider>
  );
}
