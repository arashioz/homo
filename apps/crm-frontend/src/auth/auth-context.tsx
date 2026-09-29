import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { apiRequest } from "../lib/api";
import type { AuthSession } from "../types";

interface AuthContextValue {
  session: AuthSession | undefined;
  isRestoring: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const storageKey = "homo.crm.session";
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function restoreSession(): AuthSession | undefined {
  try {
    const raw = window.localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as AuthSession) : undefined;
  } catch {
    window.localStorage.removeItem(storageKey);
    return undefined;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | undefined>(restoreSession);

  const login = useCallback(async (username: string, password: string) => {
    const nextSession = await apiRequest<AuthSession>("/auth/login", {
      method: "POST",
      body: { username, password },
    });
    window.localStorage.setItem(storageKey, JSON.stringify(nextSession));
    setSession(nextSession);
  }, []);

  const logout = useCallback(() => {
    window.localStorage.removeItem(storageKey);
    setSession(undefined);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    isRestoring: false,
    login,
    logout,
  }), [login, logout, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth باید در AuthProvider استفاده شود.");
  return context;
}
