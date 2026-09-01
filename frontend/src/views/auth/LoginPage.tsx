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
import { GoogleSignInButton } from "./GoogleSignInButton";

function roleLanding(role: UserRole) {
  if (role === "Candidate") return "/candidate";
  if (role === "Recruiter") return "/recruiter";
  return "/admin";
}

export function LoginPage() {
  const navigate = useNavigate();
  const { login, googleLogin } = useAuth();
  const [email, setEmail] = useState("candidate@example.com");
  const [password, setPassword] = useState("Password123!");
  const [role, setRole] = useState<UserRole>("Candidate");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const emailOk = useMemo(() => /^\S+@\S+\.\S+$/.test(email), [email]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!emailOk) return toast.error("Please enter a valid email.");
    if (password.length < 8) return toast.error("Password must be 8+ chars.");

    setIsSubmitting(true);
    try {
      await login({ email, password });
      toast.success("Logged in.");
      navigate(roleLanding(role));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard
      title="Login"
      subtitle="Hireflow - Let's Flow"
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
            autoComplete="current-password"
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

        <div className="flex gap-2">
          <Button className="flex-1" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign in"}
          </Button>
        </div>
        <div className="pt-1">
          <GoogleSignInButton
            onCredential={async (idToken) => {
              try {
                setIsSubmitting(true);
                await googleLogin({ idToken, role });
                toast.success("Google login success.");
                navigate(roleLanding(role));
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Google login failed.");
              } finally {
                setIsSubmitting(false);
              }
            }}
          />
        </div>

        <div className="text-sm text-slate-600">
          No account?{" "}
          <Link className="text-slate-900 underline" to="/auth/register">
            Register
          </Link>
        </div>
      </form>
    </AuthCard>
  );
}

