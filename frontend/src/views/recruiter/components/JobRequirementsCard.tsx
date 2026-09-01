import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../shared/ui/Card";
import { Button } from "../../../shared/ui/Button";
import { Input } from "../../../shared/ui/Input";
import { Label } from "../../../shared/ui/Label";

type SkillWeight = { skill: string; weight: number };

export function JobRequirementsCard({
  onSave,
  isSaving
}: {
  onSave?: (payload: { title: string; requiredSkills: Record<string, number> }) => Promise<void>;
  isSaving?: boolean;
}) {
  const [title, setTitle] = useState("Frontend Engineer");
  const [skills, setSkills] = useState<SkillWeight[]>([
    { skill: "React", weight: 5 },
    { skill: "TypeScript", weight: 4 },
    { skill: "Node.js", weight: 3 }
  ]);
  const [newSkill, setNewSkill] = useState("");
  const [newWeight, setNewWeight] = useState(3);

  const totalWeight = useMemo(
    () => skills.reduce((sum, s) => sum + (Number.isFinite(s.weight) ? s.weight : 0), 0),
    [skills]
  );

  function addSkill() {
    const skill = newSkill.trim();
    if (!skill) return toast.error("Enter a skill name.");
    if (skills.some((s) => s.skill.toLowerCase() === skill.toLowerCase()))
      return toast.error("Skill already added.");
    if (newWeight < 1 || newWeight > 10)
      return toast.error("Weight must be 1–10.");

    setSkills((prev) => [...prev, { skill, weight: newWeight }]);
    setNewSkill("");
    setNewWeight(3);
    toast.success("Skill added.");
  }

  function updateWeight(idx: number, weight: number) {
    setSkills((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, weight } : s))
    );
  }

  function remove(idx: number) {
    setSkills((prev) => prev.filter((_, i) => i !== idx));
    toast.message("Skill removed.");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Job requirements</CardTitle>
        <CardDescription>
          Define a job profile and assign numeric weights to skills.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="title">Job title</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-slate-900">
              Required skills (weight 1–10)
            </div>
            <div className="text-xs text-slate-600">Total weight: {totalWeight}</div>
          </div>

          <div className="mt-3 space-y-2">
            {skills.map((s, idx) => (
              <div key={s.skill} className="flex items-center gap-2">
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-900">{s.skill}</div>
                </div>
                <Input
                  className="w-24"
                  type="number"
                  min={1}
                  max={10}
                  value={s.weight}
                  onChange={(e) => updateWeight(idx, Number(e.target.value))}
                />
                <Button variant="ghost" type="button" onClick={() => remove(idx)}>
                  Remove
                </Button>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-2 md:grid-cols-3">
            <div className="md:col-span-2">
              <Label htmlFor="new-skill">Add skill</Label>
              <Input
                id="new-skill"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                placeholder="e.g., Docker"
              />
            </div>
            <div>
              <Label htmlFor="new-weight">Weight</Label>
              <Input
                id="new-weight"
                type="number"
                min={1}
                max={10}
                value={newWeight}
                onChange={(e) => setNewWeight(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            <Button type="button" onClick={addSkill}>
              Add skill
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={async () => {
                const requiredSkills = Object.fromEntries(skills.map((s) => [s.skill, s.weight]));
                if (!onSave) {
                  toast.success("Job profile ready.", {
                    description: "No save handler connected."
                  });
                  return;
                }
                try {
                  await onSave({ title, requiredSkills });
                  toast.success("Job profile saved.");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Failed to save job profile.");
                }
              }}
              disabled={Boolean(isSaving)}
            >
              {isSaving ? "Saving..." : "Save job profile"}
            </Button>
          </div>
        </div>

        <div className="text-xs text-slate-600">
          Output shape matches the spec: a JSON mapping of skills → numeric weights.
        </div>
      </CardContent>
    </Card>
  );
}

