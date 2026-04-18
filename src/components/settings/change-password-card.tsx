"use client";

import { useState } from "react";

export function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<
    | { kind: "idle" }
    | { kind: "saving" }
    | { kind: "success"; message: string }
    | { kind: "error"; message: string }
  >({ kind: "idle" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentPassword.trim()) {
      setStatus({ kind: "error", message: "Current password is required." });
      return;
    }
    if (newPassword.length < 8) {
      setStatus({ kind: "error", message: "New password must be at least 8 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatus({ kind: "error", message: "New password and confirmation do not match." });
      return;
    }
    if (newPassword === currentPassword) {
      setStatus({ kind: "error", message: "New password must be different from current password." });
      return;
    }

    setStatus({ kind: "saving" });

    const response = await fetch("/api/settings/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword,
        newPassword,
        confirmPassword,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { error?: string; ok?: boolean }
      | null;

    if (!response.ok) {
      setStatus({
        kind: "error",
        message: payload?.error ?? "Unable to update password. Please try again.",
      });
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setStatus({ kind: "success", message: "Password updated successfully." });
  }

  const saving = status.kind === "saving";

  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm sm:col-span-2">
      <h3 className="text-sm font-semibold text-gray-900">Change password</h3>
      <p className="mt-1 text-xs text-gray-500">
        Update the password used to sign in to Kaptrix. You&apos;ll need your
        current password to confirm the change.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-medium text-gray-700">
          <span className="block">Current password</span>
          <input
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            disabled={saving}
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50"
          />
        </label>
        <label className="text-xs font-medium text-gray-700">
          <span className="block">New password</span>
          <input
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={saving}
            required
            minLength={8}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50"
          />
        </label>
        <label className="text-xs font-medium text-gray-700">
          <span className="block">Confirm new password</span>
          <input
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={saving}
            required
            minLength={8}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50"
          />
        </label>

        <div className="sm:col-span-3 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Updating…" : "Update password"}
          </button>
          {status.kind === "success" && (
            <p className="text-xs font-medium text-emerald-700">{status.message}</p>
          )}
          {status.kind === "error" && (
            <p className="text-xs font-medium text-rose-700">{status.message}</p>
          )}
        </div>
      </form>
    </div>
  );
}
