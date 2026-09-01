import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../../shared/security/useAuth";
import type { UserRole } from "../../shared/security/types";
import { Button } from "../../shared/ui/Button";
import { Input } from "../../shared/ui/Input";
import { Label } from "../../shared/ui/Label";
import { AuthCard } from "./AuthCard";
import { roleOptions } from "./roleOptions";

function roleLanding(role: UserRole) {
  if (role === "Candidate") return "/candidate";
  if (role === "Recruiter") return "/recruiter";
  return "/admin";
}

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [role, setRole] = useState<UserRole>("Candidate");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const emailOk = useMemo(() => /^\S+@\S+\.\S+$/.test(email), [email]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!emailOk) return toast.error("Please enter a valid email.");
    if (password.length < 10)
      return toast.error("Use a stronger password (10+ chars).");
    if (password !== confirm) return toast.error("Passwords do not match.");

    setIsSubmitting(true);
    try {
      await register({ email, password, role });
      toast.success("Account created.");
      navigate(roleLanding(role));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard
      title="Register"
      subtitle="Create an account with backend-secured credential storage."
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="you@company.com"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            placeholder="At least 10 characters"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirm">Confirm password</Label>
          <Input
            id="confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="role">Role</Label>
          <select
            id="role"
            className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-400"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
          >
            {roleOptions.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <Button className="w-full" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create account"}
        </Button>

        <div className="text-sm text-slate-600">
          Already have an account?{" "}
          <Link className="text-slate-900 underline" to="/auth/login">
            Login
          </Link>
        </div>
      </form>
    </AuthCard>
  );
}

