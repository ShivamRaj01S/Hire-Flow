import type { UserRole } from "../../shared/security/types";

export const roleOptions: Array<{ value: UserRole; label: string }> = [
  { value: "Candidate", label: "Candidate" },
  { value: "Recruiter", label: "Recruiter" },
  { value: "Administrator", label: "Administrator" }
];

