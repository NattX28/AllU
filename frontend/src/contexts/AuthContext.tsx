"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import axios from "axios";
import { setAccessToken } from "@/lib/axios";
import type { LoginRequest, LoginResponse, Role } from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

interface AuthContextValue {
  userID: string | null;
  role: Role | null;
  profileID: string | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (req: LoginRequest) => Promise<LoginResponse>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userID, setUserID] = useState<string | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [profileID, setProfileID] = useState<string | null>(null);
  const [accessToken, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: try silent refresh to restore session from HttpOnly cookie
  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.post<{ token: string }>(
          `${BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true },
        );
        // Decode basic claims from JWT payload (no lib needed for non-sensitive info)
        const payload = JSON.parse(atob(data.token.split(".")[1]));
        applySession(
          data.token,
          payload.user_id,
          payload.role,
          payload.profile_id,
        );
      } catch {
        // No valid session — user needs to log in
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  function applySession(token: string, uid: string, r: Role, pid: string) {
    setToken(token);
    setUserID(uid);
    setRole(r);
    setProfileID(pid);
    setAccessToken(token); // sync to axios singleton
    document.cookie = `access_token_hint=${token}; path=/; SameSite=Lax`;
  }

  const login = useCallback(
    async (req: LoginRequest): Promise<LoginResponse> => {
      const { data } = await axios.post<LoginResponse>(
        `${BASE_URL}/auth/login`,
        req,
        { withCredentials: true },
      );
      // Decode profile_id from token
      const payload = JSON.parse(atob(data.token.split(".")[1]));
      applySession(
        data.token,
        data.user_id,
        data.role,
        payload.profile_id ?? "",
      );
      return data;
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await axios.post(
        `${BASE_URL}/auth/logout`,
        {},
        { withCredentials: true },
      );
    } finally {
      setToken(null);
      setUserID(null);
      setRole(null);
      setProfileID(null);
      setAccessToken(null);
      document.cookie = "access_token_hint=; path=/; max-age=0";
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        userID,
        role,
        profileID,
        accessToken,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
