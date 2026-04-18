"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!isSupabaseConfigured()) {
      setError(
        "Supabase is not configured yet. Configure env vars to enable password recovery.",
      );
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
      window.location.origin;

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${siteUrl}/reset-password`,
      },
    );

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
      return;
    }

    setMessage("Password reset link sent. Check your inbox and spam folder.");
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Forgot password</h2>
        <p className="mt-1 text-sm text-gray-600">
          Enter your email and we&apos;ll send you a secure reset link.
        </p>
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email address
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 sm:text-sm"
          placeholder="operator@kaptrix.com"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="flex w-full justify-center rounded-md bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 disabled:opacity-60"
      >
        {loading ? "Sending..." : "Send reset link"}
      </button>

      {message && <p className="text-center text-sm text-emerald-700">{message}</p>}
      {error && <p className="text-center text-sm text-rose-700">{error}</p>}

      <p className="text-center text-sm text-gray-600">
        Remembered your password?{" "}
        <Link href="/login" className="font-medium text-gray-900 hover:underline">
          Back to log in
        </Link>
      </p>
    </form>
  );
}
