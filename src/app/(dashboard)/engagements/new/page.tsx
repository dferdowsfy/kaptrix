import { EngagementForm } from "@/components/engagements/engagement-form";

export default function NewEngagementPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">New Engagement</h1>
        <p className="mt-1 text-sm text-gray-500">
          Create a new diligence engagement for a target company.
        </p>
      </div>
      <EngagementForm />
    </div>
  );
}
