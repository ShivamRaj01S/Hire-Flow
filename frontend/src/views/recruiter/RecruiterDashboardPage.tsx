import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { JobRequirementsCard } from "./components/JobRequirementsCard";
import { CandidateRankingTable } from "./components/CandidateRankingTable";
import { useAuth } from "../../shared/security/useAuth";
import { API_BASE_URL, apiRequest } from "../../shared/api/client";
import type { ResumeDataDto } from "../../shared/api/types";

export function RecruiterDashboardPage() {
  const { token } = useAuth();
  const [ranked, setRanked] = useState<ResumeDataDto[]>([]);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const loadRanking = useCallback(async () => {
    if (!token) return;
    const data = await apiRequest<ResumeDataDto[]>("/recruiter/candidates/ranking", {
      token
    });
    setRanked(data);
  }, [token]);

  useEffect(() => {
    loadRanking().catch(() => {
      toast.error("Failed to load candidate rankings.");
    });
  }, [loadRanking]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      loadRanking().catch(() => undefined);
    }, 8000);
    return () => window.clearInterval(timer);
  }, [loadRanking]);

  const candidates = useMemo(
    () =>
      ranked.map((r) => ({
        id: String(r.mysql_user_id),
        resumeId: r._id,
        name: r.candidate?.email || `Candidate ${r.mysql_user_id}`,
        email: r.candidate?.email || "Email unavailable",
        matchPercentage: r.overall_match_percentage,
        matchedSkills: r.matched_skills || [],
        missingSkills: r.missing_skills || [],
        resumeFileName: r.original_file_name
      })),
    [ranked]
  );

  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-semibold text-slate-900">
          Recruiter dashboard
        </div>
        <div className="mt-1 text-sm text-slate-600">
          Create job profiles and transparently rank candidates.
        </div>
      </div>

      <div className="grid gap-6">
        <JobRequirementsCard
          isSaving={isSavingProfile}
          onSave={async ({ title, requiredSkills }) => {
            if (!token) throw new Error("Authentication required.");
            setIsSavingProfile(true);
            try {
              await apiRequest("/recruiter/job-profiles", {
                method: "POST",
                token,
                body: { title, requiredSkills }
              });
              await loadRanking();
            } finally {
              setIsSavingProfile(false);
            }
          }}
        />
        <CandidateRankingTable
          candidates={candidates}
          onRefresh={loadRanking}
          onDownloadResume={async (candidate) => {
            if (!token) throw new Error("Authentication required.");
            const response = await fetch(
              `${API_BASE_URL}/recruiter/resumes/${candidate.resumeId}/download`,
              {
                headers: {
                  Authorization: `Bearer ${token}`
                }
              }
            );
            if (!response.ok) throw new Error("Failed to download resume.");

            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = blobUrl;
            anchor.download = candidate.resumeFileName || `${candidate.id}-resume`;
            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);
            URL.revokeObjectURL(blobUrl);
            toast.success("Resume downloaded.");
          }}
        />
      </div>
    </div>
  );
}

