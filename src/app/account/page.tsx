"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";

export default function SettingsPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile fields
  const [fullName, setFullName] = useState("");
  const [firmName, setFirmName] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Password reset
  const [resetSending, setResetSending] = useState(false);
  const [resetMsg, setResetMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    // Load current user profile
    Promise.all([
      createClient().auth.getUser(),
      fetch("/api/user/profile", { cache: "no-store" }).then((r) =>
        r.ok ? r.json() : null,
      ),
    ]).then(([{ data }, profile]) => {
      setEmail(data.user?.email ?? null);
      if (profile) {
        setFullName(profile.full_name ?? "");
        setFirmName(profile.firm_name ?? "");
      }
      setLoading(false);
    });
  }, []);

  const handleSignOut = async () => {
    if (!isSupabaseConfigured()) return;
    await createClient().auth.signOut();
    router.refresh();
    router.push("/login");
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName, firm_name: firmName }),
      });
      if (res.ok) {
        setProfileMsg({ ok: true, text: "Profile saved." });
      } else {
        const json = await res.json().catch(() => ({}));
        setProfileMsg({ ok: false, text: (json as { error?: string }).error ?? "Save failed." });
      }
    } catch {
      setProfileMsg({ ok: false, text: "Network error." });
    } finally {
      setProfileSaving(false);
      setTimeout(() => setProfileMsg(null), 4000);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) return;
    setResetSending(true);
    setResetMsg(null);
    try {
      const { error } = await createClient().auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/account/reset-password`,
      });
      if (error) {
        setResetMsg({ ok: false, text: error.message });
      } else {
        setResetMsg({ ok: true, text: `Password reset email sent to ${email}.` });
      }
    } catch {
      setResetMsg({ ok: false, text: "Failed to send reset email." });
    } finally {
      setResetSending(false);
      setTimeout(() => setResetMsg(null), 6000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-indigo-600">
              Account
            </p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Settings</h1>
          </div>
          <Link
            href="/app"
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400"
          >
            Back to workspace
          </Link>
        </div>

        {/* ── Signed-in as ───────────────────────────────── */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Account
          </h2>
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-xs font-medium text-slate-500">Email</p>
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

        {/* ── Profile ────────────────────────────────────── */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Profile
          </h2>
          <form onSubmit={handleSaveProfile} className="mt-4 space-y-4">
            <div>
              <label
                htmlFor="full_name"
                className="block text-xs font-medium text-slate-700"
              >
                Full name
              </label>
              <input
                id="full_name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Smith"
                className="mt-1.5 block w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div>
              <label
                htmlFor="firm_name"
                className="block text-xs font-medium text-slate-700"
              >
                Firm / organisation
              </label>
              <input
                id="firm_name"
                type="text"
                value={firmName}
                onChange={(e) => setFirmName(e.target.value)}
                placeholder="Acme Capital"
                className="mt-1.5 block w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={profileSaving || loading}
                className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
              >
                {profileSaving ? "Saving…" : "Save profile"}
              </button>
              {profileMsg && (
                <p
                  className={`text-xs font-medium ${
                    profileMsg.ok ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {profileMsg.text}
                </p>
              )}
            </div>
          </form>
        </section>

        {/* ── Password ───────────────────────────────────── */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Password
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            We&apos;ll send a secure reset link to your email address.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              disabled={!email || resetSending}
              onClick={handlePasswordReset}
              className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50"
            >
              {resetSending ? "Sending…" : "Send password reset email"}
            </button>
            {resetMsg && (
              <p
                className={`text-xs font-medium ${
                  resetMsg.ok ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {resetMsg.text}
              </p>
            )}
          </div>
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
