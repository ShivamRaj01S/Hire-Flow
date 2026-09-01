import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../shared/ui/Card";
import { Input } from "../../shared/ui/Input";
import { Button } from "../../shared/ui/Button";
import { useAuth } from "../../shared/security/useAuth";
import { apiRequest } from "../../shared/api/client";
import type { AdminUserDto, AuditLogDto } from "../../shared/api/types";

function format(ts: string) {
  const d = new Date(ts);
  return d.toLocaleString();
}

export function AdminDashboardPage() {
  const { token } = useAuth();
  const [query, setQuery] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [deleteUserId, setDeleteUserId] = useState("");
  const [logs, setLogs] = useState<AuditLogDto[]>([]);
  const [users, setUsers] = useState<AdminUserDto[]>([]);

  const loadAuditLogs = useCallback(async () => {
    if (!token) return;
    const params = new URLSearchParams();
    if (userFilter.trim()) params.set("user", userFilter.trim());
    if (actionFilter.trim()) params.set("action", actionFilter.trim());
    const suffix = params.toString() ? `?${params.toString()}` : "";
    const data = await apiRequest<AuditLogDto[]>(`/admin/audit-logs${suffix}`, { token });
    setLogs(data);
  }, [token, userFilter, actionFilter]);

  useEffect(() => {
    loadAuditLogs().catch(() => toast.error("Failed to load audit logs."));
  }, [loadAuditLogs]);

  const loadUsers = useCallback(async () => {
    if (!token) return;
    const rows = await apiRequest<AdminUserDto[]>("/admin/users", { token });
    setUsers(rows);
    if (!deleteUserId && rows.length > 0) {
      setDeleteUserId(String(rows[0].id));
    }
  }, [token, deleteUserId]);

  useEffect(() => {
    loadUsers().catch(() => toast.error("Failed to load users."));
  }, [loadUsers]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? logs.filter((r) =>
          `${r.user_identity} ${r.action_performed} ${r.timestamp}`.toLowerCase().includes(q)
        )
      : logs;
    return [...base].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [logs, query]);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-semibold text-slate-900">
          Administrator dashboard
        </div>
        <div className="mt-1 text-sm text-slate-600">
          Review immutable audit history for authentication, resume processing, and scheduling actions.
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User management</CardTitle>
          <CardDescription>Delete users (candidate/recruiter/admin) with strict audit logging.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <select
              value={deleteUserId}
              onChange={(e) => setDeleteUserId(e.target.value)}
              className="h-10 rounded-md border border-slate-200 px-2 text-sm"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  #{u.id} - {u.email} ({u.role})
                </option>
              ))}
            </select>
            <Input
            value={deleteUserId}
            onChange={(e) => setDeleteUserId(e.target.value)}
            placeholder="User ID to delete"
            />
            <Button
              variant="secondary"
              onClick={async () => {
                if (!deleteUserId.trim()) {
                  toast.error("Enter a user id.");
                  return;
                }
                try {
                  await apiRequest(`/admin/users/${Number(deleteUserId)}`, {
                    method: "DELETE",
                    token
                  });
                  toast.success("User deleted.");
                  await Promise.all([loadUsers(), loadAuditLogs()]);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Failed to delete user.");
                }
              }}
            >
              Delete user
            </Button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-4 py-3 font-medium">ID</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-slate-200">
                    <td className="px-4 py-3 text-slate-900">{u.id}</td>
                    <td className="px-4 py-3 text-slate-700">{u.email}</td>
                    <td className="px-4 py-3 text-slate-700">{u.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Audit logs</CardTitle>
          <CardDescription>User identity, action performed, and timestamp.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search logs..."
            />
            <Input
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              placeholder="Filter by user..."
            />
            <Input
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              placeholder="Filter by action..."
            />
            <Button
              variant="secondary"
              onClick={async () => {
                await loadAuditLogs();
                toast.success("Audit logs refreshed.");
              }}
            >
              Refresh
            </Button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="px-4 py-3 font-medium">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-slate-200">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {r.user_identity}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{r.action_performed}</td>
                    <td className="px-4 py-3 text-slate-600">{format(r.timestamp)}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td className="px-4 py-6 text-slate-600" colSpan={3}>
                      No logs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

