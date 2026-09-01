export type AuditLogRow = {
  id: string;
  user_identity: string;
  action_performed: string;
  timestamp: string; // ISO
};

export const mockAuditLogs: AuditLogRow[] = [
  {
    id: "a1",
    user_identity: "recruiter@example.com",
    action_performed: "Created JobProfile: Frontend Engineer",
    timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString()
  },
  {
    id: "a2",
    user_identity: "candidate@example.com",
    action_performed: "Uploaded resume",
    timestamp: new Date(Date.now() - 1000 * 60 * 18).toISOString()
  },
  {
    id: "a3",
    user_identity: "admin@example.com",
    action_performed: "Viewed audit logs",
    timestamp: new Date(Date.now() - 1000 * 60 * 4).toISOString()
  }
];

