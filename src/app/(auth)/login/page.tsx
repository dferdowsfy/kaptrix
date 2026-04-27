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
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [resendStatus, setResendStatus] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");
  const [resendError, setResendError] = useState("");
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
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/api/auth/callback`,
          data: {
            full_name: fullName.trim(),
            firm_name: firmName.trim(),
            job_title: jobTitle.trim(),
            phone: phone.trim(),
          },
        },
      });

      // Surface the raw response shape to the console so a customer
      // hitting "I never got the email" can paste the diagnostic to us
      // without exposing their password. Identifying fields only.
      console.info("[kaptrix] signUp response shape", {
        has_user: !!data?.user,
        has_session: !!data?.session,
        identities_count: data?.user?.identities?.length ?? null,
        email_confirmed_at: data?.user?.email_confirmed_at ?? null,
        confirmation_sent_at:
          (data?.user as { confirmation_sent_at?: string } | undefined)
            ?.confirmation_sent_at ?? null,
        error: error?.message ?? null,
      });

      if (error) {
        setMessage(error.message);
      } else if (
        data?.user &&
        (!data.user.identities || data.user.identities.length === 0)
      ) {
        // Supabase's user-enumeration prevention returns a "successful"
        // response with an empty `identities` array when the email is
        // already registered. Without this branch the form would say
        // "Check your email" even though no email was sent.
        setMessage(
          "An account with this email already exists. Use the Log in tab, or reset your password if you've forgotten it.",
        );
      } else if (data?.session) {
        // Email confirmations are DISABLED in this Supabase project — a
        // session was issued immediately and no confirmation email will
        // be sent. Send the user straight into the app instead of
        // making them wait for a non-existent email.
        router.push("/app");
        return;
      } else if (data?.user) {
        setConfirmationEmail(email);
        setConfirmationSent(true);
      } else {
        setMessage("Sign-up did not complete. Please try again.");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage(error.message);
      } else {
        router.push("/app");
        return;
      }
    }

    setLoading(false);
  }

  const inputClass =
    "mt-1 block w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white shadow-sm placeholder:text-white/40 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400/40";

  if (confirmationSent) {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/20 ring-1 ring-indigo-400/30">
          <svg className="h-8 w-8 text-indigo-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
          </svg>
        </div>

        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white">
            Check your email
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/60">
            We sent a confirmation link to<br />
            <span className="font-medium text-white/90">{confirmationEmail}</span>
          </p>
          <p className="mt-4 text-sm text-white/50">
            Click the link in the email to activate your account. It may take a minute to arrive.
          </p>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-left">
          <p className="text-xs text-white/60">
            Not seeing it? Check your spam folder, then resend the link.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={resendStatus === "sending"}
              onClick={async () => {
                setResendStatus("sending");
                setResendError("");
                const supabase = createClient();
                const { error } = await supabase.auth.resend({
                  type: "signup",
                  email: confirmationEmail,
                  options: {
                    emailRedirectTo: `${window.location.origin}/api/auth/callback`,
                  },
                });
                if (error) {
                  setResendStatus("error");
                  setResendError(error.message);
                } else {
                  setResendStatus("sent");
                }
              }}
              className="rounded-md border border-indigo-300/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-200 transition hover:border-indigo-300/60 hover:bg-indigo-500/20 disabled:opacity-50"
            >
              {resendStatus === "sending"
                ? "Resending…"
                : resendStatus === "sent"
                  ? "Resent ✓"
                  : "Resend confirmation email"}
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmationSent(false);
                setConfirmationEmail("");
                setMessage("");
                setResendStatus("idle");
                setResendError("");
              }}
              className="text-xs font-medium text-indigo-300 hover:text-indigo-200 hover:underline"
            >
              Use a different email
            </button>
          </div>
          {resendError && (
            <p className="mt-2 text-xs text-rose-300">{resendError}</p>
          )}
          {resendStatus === "sent" && (
            <p className="mt-2 text-xs text-emerald-300">
              Confirmation email resent to {confirmationEmail}.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            setConfirmationSent(false);
            setConfirmationEmail("");
            setIsSignUp(false);
            setMessage("");
            setPassword("");
          }}
          className="text-sm font-medium text-white/70 hover:text-white hover:underline"
        >
          Back to log in
        </button>
      </div>
    );
  }

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
