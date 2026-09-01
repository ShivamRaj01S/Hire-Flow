import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../security/useAuth";
import { Button } from "../ui/Button";
import { cn } from "../ui/cn";

const navLinks: Array<{ to: string; label: string; roles: Array<string> }> = [
  { to: "/candidate", label: "Candidate", roles: ["Candidate"] },
  { to: "/recruiter", label: "Recruiter", roles: ["Recruiter"] },
  {
    to: "/recruiter/scheduling",
    label: "Scheduling",
    roles: ["Recruiter"]
  },
  { to: "/admin", label: "Admin", roles: ["Administrator"] }
];

export function AppShell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="min-h-full bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-4">
            <Link to="/" className="font-semibold text-slate-900">
              Hire Flow
            </Link>
            {user && (
              <nav className="hidden items-center gap-1 md:flex">
                {navLinks
                  .filter((l) => l.roles.includes(user.role))
                  .map((l) => (
                    <Link
                      key={l.to}
                      to={l.to}
                      className={cn(
                        "rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100",
                        location.pathname === l.to && "bg-slate-100 text-slate-900"
                      )}
                    >
                      {l.label}
                    </Link>
                  ))}
              </nav>
            )}
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <div className="hidden text-right text-sm md:block">
                  <div className="font-medium text-slate-900">{user.email}</div>
                  <div className="text-slate-600">{user.role}</div>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => {
                    logout();
                    navigate("/auth/login");
                  }}
                >
                  Logout
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={() => navigate("/auth/login")}
                >
                  Login
                </Button>
                <Button onClick={() => navigate("/auth/register")}>
                  Register
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}

