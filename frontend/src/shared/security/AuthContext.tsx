import React, { createContext, useCallback, useMemo, useState } from "react";
import type { AuthUser, UserRole } from "./types";
import { clearStoredAuth, getStoredAuth, setStoredAuth } from "./authStorage";
import { apiRequest } from "../api/client";
import type { LoginResponse } from "../api/types";

type AuthState = {
  user: AuthUser | null;
  token: string | null;
};

type AuthContextValue = AuthState & {
  login: (args: { email: string; password: string }) => Promise<void>;
  register: (args: { email: string; password: string; role: UserRole }) => Promise<void>;
  googleLogin: (args: { idToken: string; role?: UserRole }) => Promise<void>;
  refreshMe: () => Promise<void>;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const stored = getStoredAuth();
  const [state, setState] = useState<AuthState>(() => ({
    user: stored?.user ?? null,
    token: stored?.token ?? null
  }));

  const persistLogin = useCallback((payload: LoginResponse) => {
    const next = {
      user: {
        id: String(payload.user.id),
        email: payload.user.email,
        role: payload.user.role
      } as AuthUser,
      token: payload.accessToken
    };
    setState(next);
    setStoredAuth({ user: next.user, token: next.token });
  }, []);

  const login = useCallback(
    async (args: { email: string; password: string }) => {
      const data = await apiRequest<LoginResponse>("/auth/login", {
        method: "POST",
        body: args
      });
      persistLogin(data);
    },
    [persistLogin]
  );

  const register = useCallback(
    async (args: { email: string; password: string; role: UserRole }) => {
      await apiRequest<{ id: number; email: string; role: UserRole }>("/auth/register", {
        method: "POST",
        body: args
      });
      const data = await apiRequest<LoginResponse>("/auth/login", {
        method: "POST",
        body: { email: args.email, password: args.password }
      });
      persistLogin(data);
    },
    [persistLogin]
  );

  const googleLogin = useCallback(
    async (args: { idToken: string; role?: UserRole }) => {
      const data = await apiRequest<LoginResponse>("/auth/google", {
        method: "POST",
        body: args
      });
      persistLogin(data);
    },
    [persistLogin]
  );

  const refreshMe = useCallback(async () => {
    if (!state.token) return;
    const data = await apiRequest<{ user: { id: number; email: string; role: UserRole } }>("/auth/me", {
      token: state.token
    });
    const next = {
      user: { id: String(data.user.id), email: data.user.email, role: data.user.role },
      token: state.token
    };
    setState(next);
    setStoredAuth(next);
  }, [state.token]);

  const logout = useCallback(() => {
    setState({ user: null, token: null });
    clearStoredAuth();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, login, register, googleLogin, refreshMe, logout }),
    [state, login, register, googleLogin, refreshMe, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

