export type UserRole = "Candidate" | "Recruiter" | "Administrator";

export type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
};

