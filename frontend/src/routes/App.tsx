import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "../shared/layout/AppShell";
import { LoginPage } from "../views/auth/LoginPage";
import { RegisterPage } from "../views/auth/RegisterPage";
import { CandidateDashboardPage } from "../views/candidate/CandidateDashboardPage";
import { RecruiterDashboardPage } from "../views/recruiter/RecruiterDashboardPage";
import { AdminDashboardPage } from "../views/admin/AdminDashboardPage";
import { RecruiterSchedulingPage } from "../views/recruiter/RecruiterSchedulingPage";
import { RequireRole } from "../shared/security/RequireRole";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/auth/login" replace />} />
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/register" element={<RegisterPage />} />

        <Route
          path="/candidate"
          element={
            <RequireRole allowed={["Candidate"]}>
              <CandidateDashboardPage />
            </RequireRole>
          }
        />
        <Route
          path="/recruiter"
          element={
            <RequireRole allowed={["Recruiter"]}>
              <RecruiterDashboardPage />
            </RequireRole>
          }
        />
        <Route
          path="/recruiter/scheduling"
          element={
            <RequireRole allowed={["Recruiter"]}>
              <RecruiterSchedulingPage />
            </RequireRole>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireRole allowed={["Administrator"]}>
              <AdminDashboardPage />
            </RequireRole>
          }
        />

        <Route path="*" element={<Navigate to="/auth/login" replace />} />
      </Route>
    </Routes>
  );
}

