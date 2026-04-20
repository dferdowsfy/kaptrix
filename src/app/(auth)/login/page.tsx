"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <div className="h-10 w-full animate-pulse rounded-md bg-white/10" />
      <div className="h-10 w-full animate-pulse rounded-md bg-white/10" />
      <div className="h-10 w-full animate-pulse rounded-md bg-white/20" />
    </div>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [firmName, setFirmName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const supabaseConfigured = isSupabaseConfigured();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const mode = searchParams.get("mode");
    setIsSignUp(mode === "signup");
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!supabaseConfigured) {
      setMessage(
        "Supabase is not configured yet. Use /preview to see the Kaptrix UI locally.",
      );
      return;
    }

    if (isSignUp && !agree) {
      setMessage("Please accept the terms to continue.");
      return;
    }

    setLoading(true);
    setMessage("");

    const supabase = createClient();

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            firm_name: firmName.trim(),
            job_title: jobTitle.trim(),
            phone: phone.trim(),
          },
        },
      });

      if (error) {
        setMessage(error.message);
      } else {
        setMessage(
          "Account created — if email confirmation is required, check your inbox. Otherwise, log in below.",
        );
        setIsSignUp(false);
        setPassword("");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage(error.message);
      } else {
        router.push("/preview");
        return;
      }
    }

    setLoading(false);
  }

  const inputClass =
    "mt-1 block w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white shadow-sm placeholder:text-white/40 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400/40";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-indigo-200/80">
          {isSignUp ? "Join Kaptrix" : "Welcome back"}
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
          {isSignUp ? "Create your account" : "Log in to Kaptrix"}
        </h2>
        <p className="mt-2 text-sm text-white/60">
          {isSignUp
            ? "Tell us who you are — we tailor the workspace to your firm."
            : "Pick up where you left off."}
        </p>
      </div>

      <div
        role="tablist"
        aria-label="Authentication mode"
        className="grid grid-cols-2 rounded-full border border-white/10 bg-white/5 p-1 text-sm font-semibold"
      >
        <button
          type="button"
          role="tab"
          aria-selected={!isSignUp}
          onClick={() => {
            setIsSignUp(false);
            setMessage("");
          }}
          className={`rounded-full px-4 py-2 transition ${
            !isSignUp
              ? "bg-white text-slate-900 shadow"
              : "text-white/70 hover:text-white"
          }`}
        >
          Log in
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={isSignUp}
          onClick={() => {
            setIsSignUp(true);
            setMessage("");
          }}
          className={`rounded-full px-4 py-2 transition ${
            isSignUp
              ? "bg-white text-slate-900 shadow"
              : "text-white/70 hover:text-white"
          }`}
        >
          Sign up
        </button>
      </div>

      {!supabaseConfigured && (
        <div className="rounded-md border border-amber-200/40 bg-amber-500/10 p-3 text-sm text-amber-100">
          Local preview mode is active. Configure Supabase env vars to enable
          real authentication.
        </div>
      )}

      {isSignUp && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="fullName" className="block text-sm font-medium text-white/80">
              Full name
            </label>
            <input
              id="fullName"
              type="text"
              required
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={inputClass}
              placeholder="Alex Morgan"
            />
          </div>
          <div>
            <label htmlFor="firmName" className="block text-sm font-medium text-white/80">
              Firm / company
            </label>
            <input
              id="firmName"
              type="text"
              required
              autoComplete="organization"
              value={firmName}
              onChange={(e) => setFirmName(e.target.value)}
              className={inputClass}
              placeholder="Meridian Capital"
            />
          </div>
          <div>
            <label htmlFor="jobTitle" className="block text-sm font-medium text-white/80">
              Job title
            </label>
            <input
              id="jobTitle"
              type="text"
              autoComplete="organization-title"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              className={inputClass}
              placeholder="Principal"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="phone" className="block text-sm font-medium text-white/80">
              Phone <span className="text-white/40">(optional)</span>
            </label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputClass}
              placeholder="+1 (555) 123-4567"
            />
          </div>
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-white/80">
          Work email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
          placeholder="you@yourfirm.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-white/80">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          autoComplete={isSignUp ? "new-password" : "current-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
          placeholder={isSignUp ? "At least 8 characters" : "••••••••"}
        />
        {isSignUp && (
          <p className="mt-1 text-xs text-white/50">
            Use at least 8 characters. Mix letters, numbers, and symbols for a stronger password.
          </p>
        )}
      </div>

      {isSignUp && (
        <label className="flex items-start gap-2 text-xs text-white/70">
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/10"
            required
          />
          <span>
            I agree that Kaptrix may process uploaded diligence materials to
            generate scores, reports, and an evidence index for my clients. No
            data is shared across firms.
          </span>
        </label>
      )}

      <button
        type="submit"
        disabled={loading || !supabaseConfigured}
        className="flex w-full justify-center rounded-lg bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-900/30 transition hover:from-indigo-400 hover:to-fuchsia-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 disabled:opacity-50"
      >
        {loading
          ? isSignUp
            ? "Creating account..."
            : "Logging in..."
          : isSignUp
            ? "Create account"
            : "Log in"}
      </button>

      {!isSignUp && (
        <p className="text-center text-sm text-white/60">
          <Link
            href="/forgot-password"
            className="font-medium text-white/90 hover:text-white hover:underline"
          >
            Forgot password?
          </Link>
        </p>
      )}

      {message && (
        <p className="text-center text-sm text-white/80">{message}</p>
      )}
    </form>
  );
}
