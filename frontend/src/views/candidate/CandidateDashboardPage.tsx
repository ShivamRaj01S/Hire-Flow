import { ResumeUploadCard } from "./components/ResumeUploadCard";
import { AvailabilityPickerCard } from "./components/AvailabilityPickerCard";

export function CandidateDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-semibold text-slate-900">
          Candidate dashboard
        </div>
        <div className="mt-1 text-sm text-slate-600">
          Upload your resume and set preferred interview slots.
        </div>
      </div>

      <div className="grid gap-6">
        <ResumeUploadCard />
        <AvailabilityPickerCard />
      </div>
    </div>
  );
}

