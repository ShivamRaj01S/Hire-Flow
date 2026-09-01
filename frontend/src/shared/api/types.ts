import type { UserRole } from "../security/types";

export type LoginResponse = {
  accessToken: string;
  user: { id: number; email: string; role: UserRole; created_at: string };
};

export type ResumeDataDto = {
  _id: string;
  mysql_user_id: number;
  job_profile_id?: number;
  file_url: string;
  original_file_name?: string;
  mime_type?: string;
  file_size_bytes?: number;
  raw_extracted_text: string;
  preprocessed_text: string;
  matched_skills: string[];
  missing_skills: string[];
  overall_match_percentage: number;
  createdAt?: string;
  candidate?: { id: number; email: string | null };
};

export type InterviewDto = {
  id: number;
  candidate_id: number;
  recruiter_id: number;
  scheduled_time: string;
  meeting_link: string;
  status: string;
  candidate?: { id: number; email: string };
  recruiter?: { id: number; email: string };
};

export type AuditLogDto = {
  id: number;
  user_identity: string;
  action_performed: string;
  timestamp: string;
};

export type JobProfileLiteDto = {
  id: number;
  title: string;
  recruiter_id: number;
};

export type RecruiterLiteDto = {
  id: number;
  email: string;
};

export type AdminUserDto = {
  id: number;
  email: string;
  role: UserRole;
  created_at: string;
};

export type ApplicationDto = {
  id: number;
  candidate_id: number;
  recruiter_id: number;
  job_profile_id: number;
  status: "APPLIED" | "SHORTLISTED" | "SLOT_ASSIGNED" | "SLOT_SELECTED" | "REJECTED";
  candidate?: { id: number; email: string };
  jobProfile?: { id: number; title: string; status: string };
  slotOffers?: SlotOfferDto[];
  created_at?: string;
};

export type SlotOfferDto = {
  id: number;
  application_id: number;
  candidate_id: number;
  recruiter_id: number;
  scheduled_time: string;
  status: "OFFERED" | "SELECTED" | "CANCELLED";
};
