import React from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "./useAuth";
import type { UserRole } from "./types";

export function RequireRole({
  allowed,
  children
}: {
  allowed: UserRole[];
  children: React.ReactNode;
}) {
  const { user } = useAuth();

  if (!user) {
    toast.error("Please log in to continue.");
    return <Navigate to="/auth/login" replace />;
  }

  if (!allowed.includes(user.role)) {
    toast.error("Access denied (RBAC).");
    return <Navigate to="/auth/login" replace />;
  }

  return <>{children}</>;
}

