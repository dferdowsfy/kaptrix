"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSelectedPreviewClient } from "@/hooks/use-selected-preview-client";
import { useNavVisibility, type NavTabId } from "@/hooks/use-nav-visibility";
import {
  isPreviewTabHidden,
  resolvePreviewTabFromPath,
} from "@/lib/preview-access";
import { formatDate } from "@/lib/utils";
import { ConnectionStatus } from "@/components/preview/connection-status";
import { ProfileMenu } from "@/components/preview/profile-menu";
import { TierPill } from "@/components/preview/tier-pill";
import { NavSettingsMenu } from "@/components/preview/nav-settings-menu";
import { useReportStore } from "@/lib/reports/report-store";
import { useScoreRunStore } from "@/lib/scoring/score-run-store";
import { useInsightsRunStore } from "@/lib/preview/insights-run-store";
import { usePositioningRunStore } from "@/lib/preview/positioning-run-store";
import { useChatPanel } from "@/components/preview/chat-panel-context";

export function PreviewShell({
  children,
  chatPanel,
  initialServerHidden,
  isDemo = false,
}: {
  children: React.ReactNode;
  chatPanel?: React.ReactNode;
  initialServerHidden?: NavTabId[];
  isDemo?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { client, ready, allClients, selectedId, setSelectedId } =
    useSelectedPreviewClient();
  const { visibleTabs, hidden } = useNavVisibility(initialServerHidden ?? []);

  // Enforce admin-hidden pages at the route level — a user can't reach a
  // hidden page by typing the URL directly. Redirect to the Home tab.
  useEffect(() => {
    if (!pathname || hidden.length === 0) return;
    const tabId = resolvePreviewTabFromPath(pathname);
    if (isPreviewTabHidden(tabId, hidden)) {
      router.replace("/app");
    }
  }, [pathname, hidden, router]);

  const chatCtx = useChatPanel();
  const hasClient = ready && Boolean(client.target);
  const headerVisible = useAutoHideOnScroll();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div
        className={`print-hide sticky top-0 z-40 transition-transform duration-300 ease-out will-change-transform ${
          headerVisible ? "translate-y-0" : "-translate-y-16 sm:-translate-y-[68px]"
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
              {hasClient && (
                <HeaderChip label="Tier" value={client.tier} tone="neutral" />
              )}
              <ConnectionStatus />
              <TierPill />
              <ProfileMenu />
            </div>
          </div>
        </header>

        <div className="border-b bg-white/95 shadow-sm backdrop-blur">
          <div className="relative">
            <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-2 sm:flex-row sm:items-center sm:gap-3 sm:px-6 sm:py-2.5">
              <nav className="min-w-0 flex-1">
                <ul className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  {visibleTabs.map((tab) => {
                    // Normalize /preview/* and /demo/* to /app/* so tab
                    // highlighting works regardless of which URL alias
                    // the user arrived from.
                    let normalized = pathname;
                    if (normalized.startsWith("/preview")) {
                      normalized = normalized.replace(/^\/preview/, "/app");
                    } else if (normalized.startsWith("/demo")) {
                      normalized = normalized.replace(/^\/demo/, "/app");
                    }
                    const isActive =
                      tab.href === "/app"
                        ? normalized === "/app"
                        : normalized.startsWith(tab.href);
                    // Demo users get /demo/* links; authenticated users get /app/*.
                    const href = isDemo
                      ? tab.href.replace(/^\/app/, "/demo")
                      : tab.href;
                    return (
                      <li key={tab.id}>
                        <Link
                          href={href}
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
                {isDemo && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                    </span>
                    Demo
                  </span>
                )}
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
                <NavSettingsMenu />
              </div>
            </div>
            <HeaderActivityRow isDemo={isDemo} />
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

function HeaderActivityRow({ isDemo }: { isDemo: boolean }) {
  const scoreRun = useScoreRunStore();
  const insightsRun = useInsightsRunStore();
  const positioningRun = usePositioningRunStore();
  const { activeCount, generating } = useReportStore();
  const baseHref = isDemo ? "/demo" : "/preview";

  const reportRecord = generating[0];
  const reportProgress =
    reportRecord?.sectionsTotal && reportRecord.sectionsTotal > 0
      ? Math.round(((reportRecord.sectionsDone ?? 0) / reportRecord.sectionsTotal) * 100)
      : undefined;

  const items = [
    scoreRun.status === "running"
      ? {
          href: `${baseHref}/scoring`,
          tone: "violet" as const,
          label: "Generating scores",
          detail: "Working through the knowledge base in the background",
          indeterminate: true,
        }
      : null,
    insightsRun.status === "running"
      ? {
          href: `${baseHref}/insights`,
          tone: "slate" as const,
          label: "Generating insights",
          detail: `${insightsRun.processed}/${insightsRun.total} documents processed`,
          progress:
            insightsRun.total > 0
              ? Math.round((insightsRun.processed / insightsRun.total) * 100)
              : 0,
        }
      : null,
    positioningRun.status === "running"
      ? {
          href: `${baseHref}/positioning`,
          tone: "amber" as const,
          label: "Generating positioning",
          detail: "Researching comparables and synthesizing the market read",
          indeterminate: true,
        }
      : null,
    activeCount > 0
      ? {
          href: `${baseHref}/report#on-demand-reports`,
          tone: "emerald" as const,
          label:
            activeCount === 1
              ? `Generating ${reportRecord?.title ?? "report"}`
              : `${activeCount} reports generating`,
          detail:
            activeCount === 1
              ? reportRecord?.sectionsTotal && reportRecord.sectionsTotal > 0
                ? `${reportRecord.sectionsDone ?? 0}/${reportRecord.sectionsTotal} sections complete${reportRecord.currentSection ? ` · ${reportRecord.currentSection}` : ""}`
                : "Running in the background"
              : "Multiple reports are running in the background",
          progress: activeCount === 1 ? reportProgress : undefined,
          indeterminate: activeCount > 1 || reportProgress === undefined,
        }
      : null,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));

  if (items.length === 0) return null;

  return (
    <div className="border-t border-slate-200/80 bg-slate-50/70">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-2 sm:px-6">
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
          Background activity
        </span>
        <span className="text-[11px] text-slate-500">
          Safe to switch pages while these finish.
        </span>
        <div className="flex flex-1 flex-wrap items-center gap-2 sm:justify-end">
          {items.map((item) => (
            <ActivityPill key={item.href + item.label} {...item} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ActivityPill({
  href,
  label,
  detail,
  progress,
  indeterminate = false,
  tone,
}: {
  href: string;
  label: string;
  detail?: string;
  progress?: number;
  indeterminate?: boolean;
  tone: "violet" | "emerald" | "slate" | "amber";
}) {
  const styles = {
    violet: {
      outer: "border-violet-200 bg-violet-50 text-violet-900 hover:border-violet-300 hover:bg-violet-100/80",
      spinner: "border-violet-300/50 border-t-violet-600",
      track: "bg-violet-100",
      fill: "bg-violet-500",
    },
    emerald: {
      outer: "border-emerald-200 bg-emerald-50 text-emerald-900 hover:border-emerald-300 hover:bg-emerald-100/80",
      spinner: "border-emerald-300/50 border-t-emerald-600",
      track: "bg-emerald-100",
      fill: "bg-emerald-500",
    },
    slate: {
      outer: "border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50",
      spinner: "border-slate-300/60 border-t-slate-700",
      track: "bg-slate-100",
      fill: "bg-slate-700",
    },
    amber: {
      outer: "border-amber-200 bg-amber-50 text-amber-900 hover:border-amber-300 hover:bg-amber-100/80",
      spinner: "border-amber-300/60 border-t-amber-600",
      track: "bg-amber-100",
      fill: "bg-amber-500",
    },
  }[tone];

  return (
    <Link
      href={href}
      className={`min-w-[220px] rounded-2xl border px-3 py-2 transition ${styles.outer}`}
      title={detail ?? label}
    >
      <div className="flex items-start gap-2">
        <span
          aria-hidden
          className={`mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 ${styles.spinner}`}
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-semibold">{label}</div>
          {detail ? (
            <div className="mt-0.5 truncate text-[11px] opacity-80">{detail}</div>
          ) : null}
        </div>
      </div>
      {(typeof progress === "number" || indeterminate) && (
        <div className={`mt-2 h-1.5 overflow-hidden rounded-full ${styles.track}`}>
          <div
            className={`h-full rounded-full ${styles.fill} ${indeterminate && typeof progress !== "number" ? "w-1/2 animate-pulse" : "transition-all duration-500"}`}
            style={
              typeof progress === "number"
                ? { width: `${Math.max(8, Math.min(100, progress))}%` }
                : undefined
            }
          />
        </div>
      )}
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
