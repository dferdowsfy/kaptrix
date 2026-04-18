"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const supabaseConfigured = isSupabaseConfigured();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!supabaseConfigured) {
      setMessage(
        "Supabase is not configured yet. Use /preview to see the Kaptrix UI locally.",
      );
      return;
    }

    setLoading(true);
    setMessage("");

    const supabase = createClient();

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setMessage(error.message);
      } else {
        setMessage("Account created! You can now sign in.");
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {!supabaseConfigured && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Local preview mode is active. Configure Supabase env vars to enable
          real authentication.
        </div>
      )}

      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700"
        >
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

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-700"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 sm:text-sm"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={loading || !supabaseConfigured}
        className="flex w-full justify-center rounded-md bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 disabled:opacity-50"
      >
        {loading
          ? isSignUp
            ? "Creating account..."
            : "Signing in..."
          : isSignUp
            ? "Create Account"
            : "Sign In"}
      </button>

      <p className="text-center text-sm text-gray-600">
        {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
        <button
          type="button"
          onClick={() => {
            setIsSignUp(!isSignUp);
            setMessage("");
          }}
          className="font-medium text-gray-900 hover:underline"
        >
          {isSignUp ? "Sign in" : "Sign up"}
        </button>
      </p>

      {message && (
        <p className="text-center text-sm text-gray-600">{message}</p>
      )}
    </form>
  );
}
