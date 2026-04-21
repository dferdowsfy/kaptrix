"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSelectedPreviewClient } from "@/hooks/use-selected-preview-client";
import { useNavVisibility } from "@/hooks/use-nav-visibility";
import { formatDate } from "@/lib/utils";
import { ConnectionStatus } from "@/components/preview/connection-status";
import { ProfileMenu } from "@/components/preview/profile-menu";
import { NavSettingsMenu } from "@/components/preview/nav-settings-menu";
import { useReportStore } from "@/lib/reports/report-store";
import { useChatPanel } from "@/components/preview/chat-panel-context";

export function PreviewShell({
  children,
  chatPanel,
}: {
  children: React.ReactNode;
  chatPanel?: React.ReactNode;
}) {
  const pathname = usePathname();
  const { client, ready, allClients, selectedId, setSelectedId } =
    useSelectedPreviewClient();
  const { visibleTabs } = useNavVisibility();
  const chatCtx = useChatPanel();
  const hasClient = ready && Boolean(client.target);
  const headerVisible = useAutoHideOnScroll();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="print-hide sticky top-0 z-40">
        <div
          aria-hidden={!headerVisible}
          className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-out ${
            headerVisible
              ? "max-h-20 opacity-100"
              : "pointer-events-none max-h-0 opacity-0"
          }`}
        >
        <header className="border-b border-white/10 bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 text-white shadow-sm">
          <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:h-[68px] sm:gap-4 sm:px-6">
            <Link
              href="/preview"
              className="hidden shrink-0 items-center md:flex"
              aria-label="Kaptrix home"
            >
              <span className="text-[10px] font-semibold uppercase tracking-[0.32em] text-indigo-300">
                Kaptrix
              </span>
            </Link>

            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                {hasClient ? (
                  <ClientSwitcher
                    allClients={allClients}
                    selectedId={selectedId}
                    onChange={setSelectedId}
                    currentLabel={client.target}
                  />
                ) : (
                  <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">
                    Operator Workspace
                  </h1>
                )}
              </div>
              {hasClient && (
                <p className="mt-0.5 truncate text-[11px] text-slate-300 sm:text-xs">
                  {client.client}
                  {client.industry ? ` · ${client.industry}` : ""}
                  {client.deal_stage
                    ? ` · ${client.deal_stage.replace(/_/g, " ")}`
                    : ""}
                  {client.deadline ? ` · Due ${formatDate(client.deadline)}` : ""}
                </p>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <HeaderReportStatus />
              {hasClient && (
                <HeaderChip label="Tier" value={client.tier} tone="neutral" />
              )}
              <ConnectionStatus />
              <ProfileMenu />
            </div>
          </div>
        </header>
        </div>

        <div className="border-b bg-white/95 shadow-sm backdrop-blur">
          <div className="relative">
            <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-2 sm:flex-row sm:items-center sm:gap-3 sm:px-6 sm:py-2.5">
              <nav className="min-w-0 flex-1">
                <ul className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  {visibleTabs.map((tab) => {
                    const isActive =
                      tab.href === "/preview"
                        ? pathname === "/preview"
                        : pathname.startsWith(tab.href);
                    return (
                      <li key={tab.id}>
                        <Link
                          href={tab.href}
                          className={`inline-flex whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition ${
                            isActive
                              ? "bg-slate-900 text-white shadow-sm"
                              : "border border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900"
                          }`}
                        >
                          {tab.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => chatCtx.setOpen((o) => !o)}
                  className={`group relative inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                    chatCtx.open
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "border border-indigo-200 bg-indigo-50 text-indigo-700 hover:border-indigo-400 hover:bg-indigo-100"
                  }`}
                  aria-label={
                    chatCtx.open ? "Close Kaptrix AI" : "Open Kaptrix AI"
                  }
                >
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  Ask AI
                </button>
                <Link
                  href="/how-it-works"
                  className="group relative hidden items-center rounded-full px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-indigo-700 transition sm:inline-flex"
                >
                  <span
                    aria-hidden
                    className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-100/60 via-white to-indigo-100/60 opacity-0 blur-sm transition group-hover:opacity-100"
                  />
                  <span
                    aria-hidden
                    className="absolute inset-0 rounded-full ring-1 ring-inset ring-indigo-200/70 transition group-hover:ring-indigo-400/80"
                  />
                  <span className="relative">How it works</span>
                </Link>
                <NavSettingsMenu />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <main
          className={`min-w-0 flex-1 px-4 py-6 pb-28 transition-all duration-300 sm:px-6 sm:py-8 sm:pb-24 ${
            chatCtx.open && chatPanel ? "md:pr-[440px]" : ""
          }`}
        >
          <div
            className={`mx-auto transition-all duration-300 ${
              chatCtx.open && chatPanel ? "max-w-5xl" : "max-w-7xl"
            }`}
          >
            {children}
          </div>
        </main>

        {chatPanel && (
          <aside
            className={`print-hide fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-slate-200 bg-slate-900 shadow-xl transition-transform duration-300 md:w-[420px] ${
              chatCtx.open
                ? "translate-x-0"
                : "pointer-events-none translate-x-full"
            }`}
          >
            {chatPanel}
          </aside>
        )}
      </div>
    </div>
  );
}

// Hide the sticky header when scrolling down, reveal when scrolling up.
function useAutoHideOnScroll(threshold = 72) {
  const [visible, setVisible] = useState(true);
  const lastY = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    lastY.current = window.scrollY;
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        const y = window.scrollY;
        const dy = y - lastY.current;
        if (y < threshold) {
          setVisible(true);
        } else if (dy > 6) {
          setVisible(false);
        } else if (dy < -6) {
          setVisible(true);
        }
        lastY.current = y;
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return visible;
}

function HeaderChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "neutral" | "accent";
}) {
  return (
    <div
      className={`hidden rounded-full px-2.5 py-1 backdrop-blur sm:inline-flex sm:items-center sm:gap-1.5 ${
        tone === "accent"
          ? "bg-indigo-500/20 ring-1 ring-indigo-300/40"
          : "bg-white/10 ring-1 ring-white/20"
      }`}
    >
      <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-indigo-200">
        {label}
      </span>
      <span className="text-[11px] font-semibold capitalize text-white">
        {value}
      </span>
    </div>
  );
}

function ClientSwitcher({
  allClients,
  selectedId,
  onChange,
  currentLabel,
}: {
  allClients: { id: string; target: string; client?: string }[];
  selectedId: string;
  onChange: (id: string) => void;
  currentLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleDocClick = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleDocClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleDocClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const switchable = allClients.length > 1;

  return (
    <div ref={wrapRef} className="relative min-w-0">
      <button
        type="button"
        onClick={() => switchable && setOpen((o) => !o)}
        disabled={!switchable}
        className={`group inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-md px-1 py-0.5 text-left transition hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
          switchable ? "cursor-pointer" : "cursor-default"
        }`}
        aria-haspopup={switchable ? "listbox" : undefined}
        aria-expanded={open}
      >
        <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">
          {currentLabel}
        </h1>
        {switchable && (
          <svg
            aria-hidden
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`h-3.5 w-3.5 shrink-0 text-white/50 transition group-hover:text-white/80 ${
              open ? "rotate-180" : ""
            }`}
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.06l3.71-3.83a.75.75 0 0 1 1.08 1.04l-4.25 4.39a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </button>

      {open && switchable && (
        <div
          role="listbox"
          className="absolute left-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-xl border border-white/10 bg-slate-900/95 shadow-2xl ring-1 ring-black/20 backdrop-blur"
        >
          <div className="border-b border-white/5 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-indigo-300/80">
            Switch client
          </div>
          <ul className="max-h-80 overflow-y-auto py-1">
            {allClients.map((c) => {
              const isActive = c.id === selectedId;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => {
                      onChange(c.id);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition ${
                      isActive
                        ? "bg-indigo-500/15 text-white"
                        : "text-slate-200 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                        isActive ? "bg-emerald-400" : "bg-white/20"
                      }`}
                    />
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {c.target || c.id}
                    </span>
                    {c.client && (
                      <span className="shrink-0 truncate text-[11px] text-slate-400">
                        {c.client}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="border-t border-white/5 p-2">
            <Link
              href="/preview"
              onClick={() => setOpen(false)}
              className="block rounded-md px-2.5 py-1.5 text-center text-[11px] font-medium text-indigo-200 transition hover:bg-white/5 hover:text-white"
            >
              View full roster
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function HeaderReportStatus() {
  const { activeCount, generating } = useReportStore();
  if (activeCount === 0) return null;
  const first = generating[0]?.title;
  const label =
    activeCount === 1 && first
      ? `Updating ${first}…`
      : activeCount === 1
        ? "Updating report…"
        : `${activeCount} reports updating…`;
  return (
    <Link
      href="/preview/report#on-demand-reports"
      title={label}
      className="inline-flex max-w-[220px] items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[11px] font-medium text-emerald-100 transition hover:border-emerald-300/60 hover:bg-emerald-400/15 sm:max-w-[260px]"
    >
      <span
        aria-hidden
        className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-emerald-300/30 border-t-emerald-200"
      />
      <span className="truncate">{label}</span>
    </Link>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-indigo-600 sm:text-xs">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        {title}
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
        {description}
      </p>
    </div>
  );
}
