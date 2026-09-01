import { useCallback, useEffect, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../shared/ui/Card";
import { Button } from "../../../shared/ui/Button";
import { cn } from "../../../shared/ui/cn";
import { useAuth } from "../../../shared/security/useAuth";
import { apiRequest } from "../../../shared/api/client";
import type { JobProfileLiteDto } from "../../../shared/api/types";

type UploadState = "Idle" | "Uploading" | "Processing" | "Success";

function fakeProgress(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export function ResumeUploadCard() {
  const { token } = useAuth();
  const [state, setState] = useState<UploadState>("Idle");
  const [fileName, setFileName] = useState<string | null>(null);
  const [jobProfiles, setJobProfiles] = useState<JobProfileLiteDto[]>([]);
  const [jobProfileId, setJobProfileId] = useState("");

  useEffect(() => {
    if (!token) return;
    apiRequest<JobProfileLiteDto[]>("/candidate/job-profiles", { token })
      .then((rows) => {
        setJobProfiles(rows);
        if (rows.length > 0) setJobProfileId(String(rows[0].id));
      })
      .catch(() => undefined);
  }, [token]);

  const accept = useMemo(
    () => ({
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"]
    }),
    []
  );

  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    setFileName(file.name);
    setState("Uploading");
    toast.message("Uploading resume...", { description: file.name });

    await fakeProgress(900);
    setState("Processing");
    toast.message("Processing resume...", {
      description: "Extracting + preprocessing + scoring."
    });

    if (!jobProfileId) {
      toast.error("Select a job profile first.");
      setState("Idle");
      return;
    }
    if (!token) {
      toast.error("Please log in again.");
      setState("Idle");
      return;
    }

    const formData = new FormData();
    formData.append("resume", file);
    formData.append("jobProfileId", String(jobProfileId));

    await apiRequest("/candidate/resume/analyze", {
      method: "POST",
      token,
      body: formData,
      isMultipart: true
    });
    await fakeProgress(300);
    setState("Success");
    toast.success("Resume processed.", {
      description: "Matched skills + score will appear in Recruiter view."
    });
  }, [token, jobProfileId]);

  const { getRootProps, getInputProps, isDragActive, fileRejections } =
    useDropzone({
      onDrop,
      multiple: false,
      accept,
      disabled: state === "Uploading" || state === "Processing",
      maxFiles: 1,
      maxSize: 8 * 1024 * 1024
    });

  if (fileRejections.length > 0) {
    const reason = fileRejections[0]?.errors?.[0]?.message ?? "Invalid file.";
    toast.error("Upload rejected.", { description: reason });
  }

  const hint =
    state === "Idle"
      ? "PDF or DOCX, up to 8MB"
      : state === "Uploading"
        ? "Uploading..."
        : state === "Processing"
          ? "Processing..."
          : "Done";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resume upload</CardTitle>
        <CardDescription>
          Drag & drop a resume and watch the interaction state machine.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div
          {...getRootProps()}
          className={cn(
            "cursor-pointer rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center transition hover:bg-slate-100",
            isDragActive && "border-slate-900 bg-slate-100",
            (state === "Uploading" || state === "Processing") &&
              "cursor-not-allowed opacity-70"
          )}
        >
          <input {...getInputProps()} />
          <div className="text-sm font-medium text-slate-900">
            {isDragActive ? "Drop the file here" : "Drop a PDF/DOCX here"}
          </div>
          <div className="mt-1 text-xs text-slate-600">{hint}</div>
          {fileName && (
            <div className="mt-3 text-xs text-slate-700">
              Selected: <span className="font-medium">{fileName}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-700" htmlFor="jobProfileId">
            Job profile
          </label>
          <select
            id="jobProfileId"
            value={jobProfileId}
            onChange={(e) => setJobProfileId(e.target.value)}
            className="h-9 rounded-md border border-slate-200 px-2 text-sm"
          >
            {jobProfiles.map((jp) => (
              <option key={jp.id} value={jp.id}>
                #{jp.id} - {jp.title}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-700">
            Status: <span className="font-medium">{state}</span>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              setState("Idle");
              setFileName(null);
              toast.message("Reset upload state.");
            }}
            disabled={state === "Uploading" || state === "Processing"}
          >
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

