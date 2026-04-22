import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ChatPanelProvider } from "@/components/preview/chat-panel-context";
import { KnowledgeChatPanel } from "@/components/preview/floating-knowledge-chatbot";
import { PreviewShell } from "@/components/preview/preview-shell";
import {
  isPreviewTabHidden,
  resolvePreviewTabFromPath,
  type PreviewTabId,
} from "@/lib/preview-access";
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
async function loadServerHidden(): Promise<PreviewTabId[]> {
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
    return keys.filter((k): k is PreviewTabId => typeof k === "string");
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

  // Server-side enforcement: if the current route maps to a hidden tab,
  // refuse to render the page tree at all. Middleware already redirects,
  // but this is a defense-in-depth stop that also covers any future code
  // path (RSC, direct internal navigation) that might skip middleware.
  if (serverHidden.length > 0) {
    const h = await headers();
    // next/headers exposes the original request pathname via x-invoke-path
    // or the `x-url`/`x-pathname` variants depending on runtime. Fall back
    // through the common ones.
    const rawPath =
      h.get("x-invoke-path") ??
      h.get("next-url") ??
      h.get("x-pathname") ??
      "";
    const tabId = resolvePreviewTabFromPath(rawPath);
    if (isPreviewTabHidden(tabId, serverHidden)) {
      redirect(rawPath.startsWith("/preview") ? "/preview" : "/app");
    }
  }

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
