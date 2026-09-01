import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../shared/ui/Card";
import { Button } from "../../../shared/ui/Button";
import { useAuth } from "../../../shared/security/useAuth";
import { apiRequest } from "../../../shared/api/client";
import type { ApplicationDto, InterviewDto, SlotOfferDto } from "../../../shared/api/types";

export function AvailabilityPickerCard() {
  const { token } = useAuth();
  const [offeredSlots, setOfferedSlots] = useState<SlotOfferDto[]>([]);
  const [applications, setApplications] = useState<ApplicationDto[]>([]);
  const [selectedApplicationId, setSelectedApplicationId] = useState<number | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  const refresh = useCallback(async () => {
    if (!token) return;
    const [apps, slots] = await Promise.all([
      apiRequest<ApplicationDto[]>("/candidate/applications", { token }),
      apiRequest<SlotOfferDto[]>("/candidate/slots/offered", { token })
    ]);
    setApplications(apps);
    setSelectedApplicationId((prev) => prev || (apps[0]?.id ?? null));
    setOfferedSlots(slots);
  }, [token]);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  const offeredForSelectedApp = useMemo(
    () =>
      selectedApplicationId
        ? offeredSlots.filter((s) => s.application_id === selectedApplicationId)
        : [],
    [offeredSlots, selectedApplicationId]
  );

  const grouped = useMemo(() => {
    const byDate: Record<string, SlotOfferDto[]> = {};
    for (const slot of offeredForSelectedApp) {
      const d = new Date(slot.scheduled_time);
      const key = d.toISOString().slice(0, 10);
      if (!byDate[key]) byDate[key] = [];
      byDate[key].push(slot);
    }
    return byDate;
  }, [offeredForSelectedApp]);

  const selectedApplication = useMemo(
    () => applications.find((a) => a.id === selectedApplicationId) || null,
    [applications, selectedApplicationId]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select recruiter-offered slot</CardTitle>
        <CardDescription>
          Workflow is locked: apply first, recruiter shortlists, recruiter assigns slots, then you select one.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          Current application status: <span className="font-semibold">{selectedApplication?.status || "Not selected"}</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-700" htmlFor="candidateApplication">
            Application
          </label>
          <select
            id="candidateApplication"
            value={selectedApplicationId || ""}
            onChange={(e) => setSelectedApplicationId(Number(e.target.value))}
            className="h-9 rounded-md border border-slate-200 px-2 text-sm"
          >
            {applications.map((a) => (
              <option key={a.id} value={a.id}>
                #{a.id} - {a.jobProfile?.title || `Job ${a.job_profile_id}`} ({a.status})
              </option>
            ))}
          </select>
        </div>

        {Object.keys(grouped).length === 0 && (
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
            No slots offered yet for selected application. Wait for recruiter to shortlist and assign slots.
          </div>
        )}

        {Object.entries(grouped).map(([date, slots]) => (
          <div key={date} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-2 text-sm font-semibold text-slate-900">{date}</div>
            <div className="space-y-2">
              {slots.map((slot) => {
                const start = new Date(slot.scheduled_time).toISOString().slice(11, 16);
                return (
                  <div
                    key={slot.id}
                    className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2"
                  >
                    <div className="text-sm text-slate-800">{start}</div>
                    <Button
                      onClick={async () => {
                        if (!token) return;
                        setIsSelecting(true);
                        try {
                          await apiRequest<InterviewDto>("/candidate/slots/select", {
                            method: "POST",
                            token,
                            body: {
                              slotOfferId: slot.id,
                              meetingLink: `https://meet.example.com/${crypto.randomUUID().slice(0, 8)}`
                            }
                          });
                          toast.success("Interview slot selected.");
                          await refresh();
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : "Failed to select slot.");
                        } finally {
                          setIsSelecting(false);
                        }
                      }}
                      disabled={isSelecting || selectedApplication?.status !== "SLOT_ASSIGNED"}
                    >
                      Select this slot
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

