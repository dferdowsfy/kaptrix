"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";

interface SessionUser {
  email: string | null;
  id: string;
}

export function ProfileMenu() {
  const router = useRouter();
  const supabaseConfigured = isSupabaseConfigured();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!supabaseConfigured) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser({ email: data.user.email ?? null, id: data.user.id });
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(
        session?.user
          ? { email: session.user.email ?? null, id: session.user.id }
          : null,
      );
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, [supabaseConfigured]);

  useEffect(() => {
    if (!open) return;
    const onClickAway = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, [open]);

  const signOut = useCallback(async () => {
    if (!supabaseConfigured) return;
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setOpen(false);
    router.refresh();
  }, [supabaseConfigured, router]);

  // Unauthenticated: show a plain Sign in link.
  if (!user) {
    return (
      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
      >
        <UserIcon className="h-3.5 w-3.5" />
        Sign in
      </Link>
    );
  }

  const initials = (user.email ?? "?")
    .split("@")[0]
    .split(/[._-]/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("")
    .padEnd(1, "·");

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-xs font-bold text-white shadow-sm ring-1 ring-white/20 transition hover:ring-indigo-300"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Profile menu"
      >
        {initials}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-1 shadow-xl"
        >
          <div className="border-b border-slate-100 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Signed in as
            </p>
            <p className="mt-0.5 truncate text-sm font-medium text-slate-900">
              {user.email ?? "Unknown"}
            </p>
          </div>
          <MenuItem href="/settings" onClick={() => setOpen(false)}>
            <SettingsIcon className="h-4 w-4" />
            Account settings
          </MenuItem>
          <MenuItem href="/how-it-works" onClick={() => setOpen(false)}>
            <InfoIcon className="h-4 w-4" />
            How Kaptrix scores
          </MenuItem>
          <button
            type="button"
            role="menuitem"
            onClick={signOut}
            className="mt-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-rose-700 transition hover:bg-rose-50"
          >
            <SignOutIcon className="h-4 w-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onClick}
      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
    >
      {children}
    </Link>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden>
      <path d="M10 9a3 3 0 100-6 3 3 0 000 6zM3 17a7 7 0 0114 0H3z" />
    </svg>
  );
}
function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden>
      <path
        fillRule="evenodd"
        d="M10 2a1 1 0 01.96.73l.37 1.32a6 6 0 011.67.96l1.3-.44a1 1 0 011.22.43l1 1.73a1 1 0 01-.2 1.27l-1 .9a6 6 0 010 1.94l1 .9a1 1 0 01.2 1.27l-1 1.73a1 1 0 01-1.22.43l-1.3-.44a6 6 0 01-1.67.96l-.37 1.32a1 1 0 01-.96.73h-2a1 1 0 01-.96-.73l-.37-1.32a6 6 0 01-1.67-.96l-1.3.44a1 1 0 01-1.22-.43l-1-1.73a1 1 0 01.2-1.27l1-.9a6 6 0 010-1.94l-1-.9a1 1 0 01-.2-1.27l1-1.73a1 1 0 011.22-.43l1.3.44a6 6 0 011.67-.96l.37-1.32A1 1 0 018 2h2zm-1 5a3 3 0 100 6 3 3 0 000-6z"
        clipRule="evenodd"
      />
    </svg>
  );
}
function InfoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden>
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-9a1 1 0 012 0v4a1 1 0 11-2 0V9zm1-4a1 1 0 110 2 1 1 0 010-2z"
        clipRule="evenodd"
      />
    </svg>
  );
}
function SignOutIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden>
      <path
        fillRule="evenodd"
        d="M3 3a1 1 0 011-1h8a1 1 0 011 1v2a1 1 0 11-2 0V4H5v12h6v-1a1 1 0 112 0v2a1 1 0 01-1 1H4a1 1 0 01-1-1V3zm10.3 4.3a1 1 0 011.4 0l2 2a1 1 0 010 1.4l-2 2a1 1 0 01-1.4-1.4L14 10.5H8a1 1 0 110-2h6l-.7-.8a1 1 0 010-1.4z"
        clipRule="evenodd"
      />
    </svg>
  );
}
