"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";
import { useNavVisibility } from "@/hooks/use-nav-visibility";
import { PREVIEW_TABS } from "@/lib/preview-tabs";

export default function SettingsPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { hidden, toggleTab, resetAll, alwaysVisible } = useNavVisibility();

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      setLoading(false);
    });
  }, []);

  const handleSignOut = async () => {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-indigo-600">
              Account
            </p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Settings</h1>
          </div>
          <Link
            href="/preview"
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400"
          >
            Back to workspace
          </Link>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Profile
          </h2>
          <div className="mt-4 space-y-3">
            <div>
              <p className="text-xs font-medium text-slate-500">Signed in as</p>
              <p className="mt-1 text-sm text-slate-900">
                {loading ? "Loading…" : email ?? "Not signed in"}
              </p>
            </div>
            {email ? (
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
              >
                Sign out
              </button>
            ) : (
              <Link
                href="/login"
                className="inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Sign in
              </Link>
            )}
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Navigation
            </h2>
            {hidden.length > 0 && (
              <button
                type="button"
                onClick={resetAll}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
              >
                Reset
              </button>
            )}
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Hide tabs you don&rsquo;t need. Home and Overview stay visible.
          </p>
          <ul className="mt-4 divide-y divide-slate-100">
            {PREVIEW_TABS.map((tab) => {
              const locked = alwaysVisible.includes(tab.id);
              const isHidden = hidden.includes(tab.id);
              return (
                <li
                  key={tab.id}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {tab.label}
                    </p>
                    {locked && (
                      <p className="text-xs text-slate-400">Always visible</p>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => toggleTab(tab.id)}
                    role="switch"
                    aria-checked={!isHidden}
                    className={`relative h-6 w-11 rounded-full transition ${
                      locked
                        ? "cursor-not-allowed bg-slate-200"
                        : isHidden
                        ? "bg-slate-300"
                        : "bg-indigo-600"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 inline-block h-5 w-5 rounded-full bg-white shadow transition ${
                        isHidden ? "left-0.5" : "left-[22px]"
                      }`}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <p className="mt-8 text-center text-xs text-slate-400">
          <Link href="/how-it-works" className="hover:text-indigo-600">
            How Kaptrix scores
          </Link>
        </p>
      </div>
    </div>
  );
}
