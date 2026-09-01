import { useCallback, useEffect, useMemo, useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../shared/ui/Card";
import { Button } from "../../shared/ui/Button";
import { cn } from "../../shared/ui/cn";
import { useAuth } from "../../shared/security/useAuth";
import { apiRequest } from "../../shared/api/client";
import type { ApplicationDto } from "../../shared/api/types";

type Slot = { start: string; end: string };

function toDateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function overlaps(a: Slot, b: Slot) {
  return a.start < b.end && b.start < a.end;
}

export function RecruiterSchedulingPage() {
  const { token } = useAuth();
  const [day, setDay] = useState<Date | undefined>(new Date());
  const [applications, setApplications] = useState<ApplicationDto[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<Record<number, Record<string, boolean>>>({});
  const [savingAppId, setSavingAppId] = useState<number | null>(null);

  const dateKey = useMemo(() => (day ? toDateKey(day) : null), [day]);
  const actionableApps = useMemo(
    () => applications.filter((a) => a.status === "APPLIED" || a.status === "SHORTLISTED" || a.status === "SLOT_ASSIGNED"),
    [applications]
  );
  const finalized = useMemo(
    () => applications.filter((a) => a.status === "SLOT_SELECTED"),
    [applications]
  );

  const refreshPreferences = useCallback(async () => {
    if (!token) return;
    const rows = await apiRequest<ApplicationDto[]>("/recruiter/candidate-preferences", {
      token
    });
    setApplications(rows);
  }, [token]);

  useEffect(() => {
    refreshPreferences().catch(() => toast.error("Failed to load candidate preferences."));
  }, [refreshPreferences]);

  function isConflict(date: string, slot: Slot) {
    return finalized.some((f) => {
      const selected = (f.slotOffers || []).find((s) => s.status === "SELECTED");
      if (!selected) return false;
      const d = new Date(selected.scheduled_time);
      const selectedDate = d.toISOString().slice(0, 10);
      const start = d.toISOString().slice(11, 16);
      const endDate = new Date(d.getTime() + 30 * 60 * 1000);
      const end = endDate.toISOString().slice(11, 16);
      return selectedDate === date && overlaps({ start, end }, slot);
    });
  }

  async function shortlist(app: ApplicationDto) {
    if (!token) return;
    await apiRequest(`/recruiter/applications/${app.id}/shortlist`, {
      method: "POST",
      token
    });
    toast.success("Application shortlisted.");
    await refreshPreferences();
  }

  async function assign(app: ApplicationDto) {
    if (!token || !dateKey) return;
    const byApp = selectedSlots[app.id] || {};
    const picked = Object.keys(byApp).filter((k) => byApp[k]);
    if (picked.length === 0) {
      toast.error("Pick at least one slot first.");
      return;
    }
    const slotTimesIso = picked.map((start) => new Date(`${dateKey}T${start}:00.000Z`).toISOString());
    setSavingAppId(app.id);
    try {
      await apiRequest(`/recruiter/applications/${app.id}/slots`, {
        method: "POST",
        token,
        body: { slotTimesIso }
      });
      toast.success("Slots assigned to candidate.");
      await refreshPreferences();
    } finally {
      setSavingAppId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-semibold text-slate-900">
          Scheduling
        </div>
        <div className="mt-1 text-sm text-slate-600">
          View candidate preferences and finalize interview slots without conflicts.
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Select date</CardTitle>
            <CardDescription>Preferences are grouped by date.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-slate-200 bg-white p-2">
              <DayPicker mode="single" selected={day} onSelect={setDay} />
            </div>
            <div className="mt-3 text-sm text-slate-700">
              Selected: <span className="font-medium">{dateKey ?? "—"}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Candidate preferences</CardTitle>
            <CardDescription>
              First shortlist, then assign available slots to the shortlisted candidate.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => refreshPreferences()}>
                Refresh preferences
              </Button>
            </div>
            {actionableApps.map((app) => (
              <div key={app.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {app.candidate?.email || `Candidate ${app.candidate_id}`}
                    </div>
                    <div className="text-xs text-slate-600">
                      Application #{app.id} - {app.jobProfile?.title || `Job ${app.job_profile_id}`}
                    </div>
                  </div>
                  {app.status === "APPLIED" && (
                    <Button variant="secondary" onClick={() => shortlist(app)}>
                      Shortlist
                    </Button>
                  )}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {["09:00", "10:00", "11:00", "14:00", "15:00"].map((start) => {
                    const endDate = new Date(`2000-01-01T${start}:00.000Z`);
                    endDate.setMinutes(endDate.getMinutes() + 30);
                    const s = { start, end: endDate.toISOString().slice(11, 16) };
                    const conflict = dateKey ? isConflict(dateKey, s) : false;
                    const checked = Boolean(selectedSlots[app.id]?.[start]);
                    return (
                      <button
                        key={`${app.id}-${s.start}`}
                        type="button"
                        onClick={() =>
                          setSelectedSlots((prev) => ({
                            ...prev,
                            [app.id]: {
                              ...(prev[app.id] || {}),
                              [start]: !checked
                            }
                          }))
                        }
                        className={cn(
                          "rounded-md border px-3 py-2 text-left text-sm transition",
                          conflict
                            ? "cursor-not-allowed border-red-200 bg-red-50 text-red-700"
                            : checked
                              ? "border-slate-900 bg-slate-900 text-white"
                              : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
                        )}
                        disabled={conflict || !dateKey || app.status !== "SHORTLISTED"}
                        title={conflict ? "Conflicts with another interview" : "Toggle slot"}
                      >
                        <div className="font-medium">
                          {s.start}–{s.end}
                        </div>
                        <div className="text-xs">
                          {conflict ? "Conflict" : checked ? "Selected" : "Available"}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {app.status === "SHORTLISTED" && (
                  <div className="mt-3">
                    <Button onClick={() => assign(app)} disabled={savingAppId === app.id || !dateKey}>
                      {savingAppId === app.id ? "Assigning..." : "Assign selected slots"}
                    </Button>
                  </div>
                )}
              </div>
            ))}

            {actionableApps.length === 0 && (
              <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">
                No applications available for shortlisting/slot assignment.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Finalized interviews</CardTitle>
          <CardDescription>
            These are applications where candidate selected one offered slot.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-4 py-3 font-medium">Candidate</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Meeting link</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {finalized.map((f) => {
                  const selected = (f.slotOffers || []).find((s) => s.status === "SELECTED");
                  if (!selected) return null;
                  const d = new Date(selected.scheduled_time);
                  const date = d.toISOString().slice(0, 10);
                  const start = d.toISOString().slice(11, 16);
                  const endDate = new Date(d.getTime() + 30 * 60 * 1000);
                  const end = endDate.toISOString().slice(11, 16);
                  return (
                  <tr key={f.id} className="border-t border-slate-200">
                    <td className="px-4 py-3 text-slate-900">{f.candidate?.email || f.candidate_id}</td>
                    <td className="px-4 py-3 text-slate-700">{date}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {start}–{end}
                    </td>
                    <td className="px-4 py-3 text-slate-700">Set by candidate at selection</td>
                    <td className="px-4 py-3 text-slate-700">Locked</td>
                  </tr>
                );
                })}
                {finalized.length === 0 && (
                  <tr>
                    <td className="px-4 py-6 text-slate-600" colSpan={5}>
                      No finalized interviews yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="text-sm text-slate-600">Refresh to sync latest selections from candidates.</div>
        </CardContent>
      </Card>
    </div>
  );
}

