"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PREVIEW_TABS } from "@/lib/preview-tabs";

interface AdminUserRow {
  id: string;
  email: string;
  role: string;
  approved: boolean;
  hidden_menu_keys: string[];
  created_at: string;
  last_login_at: string | null;
}

const ROLE_OPTIONS = ["admin", "operator", "analyst", "reviewer", "client_viewer"];
// Home + overview are "always visible" to every user by design.
const TOGGLEABLE_TABS = PREVIEW_TABS.filter(
  (t) => t.id !== "home" && t.id !== "overview",
);

export function AdminPanel() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      setUsers(data.users ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const patchUser = useCallback(
    async (id: string, patch: Partial<Pick<AdminUserRow, "role" | "approved" | "hidden_menu_keys">>) => {
      setBusyUserId(id);
      try {
        const res = await fetch(`/api/admin/users/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
        setUsers((rows) =>
          rows.map((r) => (r.id === id ? { ...r, ...patch } as AdminUserRow : r)),
        );
        setToast("Saved");
      } catch (e) {
        setToast(e instanceof Error ? e.message : "Update failed");
      } finally {
        setBusyUserId(null);
        setTimeout(() => setToast(null), 2500);
      }
    },
    [],
  );

  const deleteUser = useCallback(async (id: string, email: string) => {
    if (
      !confirm(
        `Delete ${email}? This permanently removes the account, its saved reports, and its access. This cannot be undone.`,
      )
    )
      return;
    setBusyUserId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      setUsers((rows) => rows.filter((r) => r.id !== id));
      setToast(`Deleted ${email}`);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusyUserId(null);
      setTimeout(() => setToast(null), 3500);
    }
  }, []);

  const sendReset = useCallback(async (id: string, email: string) => {
    if (!confirm(`Send password reset email to ${email}?`)) return;
    setBusyUserId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}/send-reset`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      setToast(`Reset link sent to ${email}`);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Send failed");
    } finally {
      setBusyUserId(null);
      setTimeout(() => setToast(null), 3500);
    }
  }, []);

  const toggleMenuKey = useCallback(
    (user: AdminUserRow, key: string) => {
      const next = user.hidden_menu_keys.includes(key)
        ? user.hidden_menu_keys.filter((k) => k !== key)
        : [...user.hidden_menu_keys, key];
      patchUser(user.id, { hidden_menu_keys: next });
    },
    [patchUser],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-indigo-600">
            Admin panel
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Users & access
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            View every Kaptrix user, change their role, toggle menu
            visibility, or trigger a password reset email.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/preview"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            ← Back to platform
          </Link>
          <button
            type="button"
            onClick={load}
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Refresh
          </button>
        </div>
      </div>

      {toast && (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-800">
          {toast}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Approved</th>
                <th className="px-4 py-3">Hidden menu tabs</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    Loading users…
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No users yet.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="align-top">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {u.email}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={u.role}
                        disabled={busyUserId === u.id}
                        onChange={(e) =>
                          patchUser(u.id, { role: e.target.value })
                        }
                        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={u.approved}
                          disabled={busyUserId === u.id}
                          onChange={(e) =>
                            patchUser(u.id, { approved: e.target.checked })
                          }
                        />
                        <span className="text-sm text-slate-700">
                          {u.approved ? "Yes" : "No"}
                        </span>
                      </label>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {TOGGLEABLE_TABS.map((tab) => {
                          const hidden = u.hidden_menu_keys.includes(tab.id);
                          return (
                            <button
                              key={tab.id}
                              type="button"
                              disabled={busyUserId === u.id}
                              onClick={() => toggleMenuKey(u, tab.id)}
                              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                                hidden
                                  ? "border-rose-200 bg-rose-50 text-rose-700 line-through"
                                  : "border-emerald-200 bg-emerald-50 text-emerald-800"
                              }`}
                              title={
                                hidden
                                  ? "Hidden — click to show"
                                  : "Visible — click to hide"
                              }
                            >
                              {tab.label}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          disabled={busyUserId === u.id}
                          onClick={() => sendReset(u.id, u.email)}
                          className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                        >
                          Send reset email
                        </button>
                        <button
                          type="button"
                          disabled={busyUserId === u.id}
                          onClick={() => deleteUser(u.id, u.email)}
                          className="rounded-md border border-rose-200 bg-white px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Hidden-tab changes apply the next time the user loads any preview page.
        &quot;Home&quot; and &quot;Overview&quot; are always visible by design.
      </p>
    </div>
  );
}
