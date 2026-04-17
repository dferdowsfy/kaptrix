export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Platform configuration, prompt management, and user administration.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900">
            Prompt Library
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            Manage versioned prompts for pre-analysis, synthesis, and red-flag
            detection.
          </p>
        </div>

        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900">
            User Management
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            Add operators, client viewers, and manage roles.
          </p>
        </div>

        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900">
            Data Retention
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            Configure auto-purge policy (default: 90 days post-delivery).
          </p>
        </div>

        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900">
            Audit Log Export
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            Export engagement audit trails for compliance.
          </p>
        </div>
      </div>
    </div>
  );
}
