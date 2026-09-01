import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "../../../shared/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../shared/ui/Card";
import { Input } from "../../../shared/ui/Input";
import { cn } from "../../../shared/ui/cn";

type RankedCandidate = {
  id: string;
  resumeId: string;
  name: string;
  email: string;
  matchPercentage: number;
  matchedSkills: string[];
  missingSkills: string[];
  resumeFileName?: string;
};

function Badge({ children, variant }: { children: string; variant: "ok" | "warn" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
        variant === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"
      )}
    >
      {children}
    </span>
  );
}

function Progress({ value }: { value: number }) {
  const safe = Math.max(0, Math.min(100, value));
  return (
    <div className="h-2 w-full rounded-full bg-slate-100">
      <div className="h-2 rounded-full bg-slate-900" style={{ width: `${safe}%` }} />
    </div>
  );
}

export function CandidateRankingTable({
  candidates,
  onRefresh,
  onDownloadResume
}: {
  candidates: RankedCandidate[];
  onRefresh?: () => Promise<void>;
  onDownloadResume?: (candidate: RankedCandidate) => Promise<void>;
}) {
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? candidates.filter((c) => `${c.name} ${c.email}`.toLowerCase().includes(q))
      : candidates;
    return [...filtered].sort((a, b) => b.matchPercentage - a.matchPercentage);
  }, [candidates, query]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Candidate ranking</CardTitle>
        <CardDescription>
          Transparent scoring: Skill Match %, Matched Skills, and Missing Skills.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search candidates..."
          />
          <Button
            variant="secondary"
            onClick={async () => {
              try {
                await onRefresh?.();
                toast.success("Ranking refreshed.");
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Refresh failed.");
              }
            }}
          >
            Refresh
          </Button>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-4 py-3 font-medium">Candidate</th>
                <th className="px-4 py-3 font-medium">Skill Match %</th>
                <th className="px-4 py-3 font-medium">Matched Skills</th>
                <th className="px-4 py-3 font-medium">Missing Skills</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-t border-slate-200">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{c.name}</div>
                    <div className="text-xs text-slate-600">{c.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-40">
                        <Progress value={c.matchPercentage} />
                      </div>
                      <div className="w-12 text-right font-medium text-slate-900">
                        {c.matchPercentage}%
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {c.matchedSkills.map((s) => (
                        <Badge key={s} variant="ok">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {c.missingSkills.map((s) => (
                        <Badge key={s} variant="warn">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        onClick={async () => {
                          try {
                            await onDownloadResume?.(c);
                          } catch (err) {
                            toast.error(err instanceof Error ? err.message : "Resume download failed.");
                          }
                        }}
                      >
                        Download resume
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}

              {rows.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-slate-600" colSpan={5}>
                    No candidates found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

