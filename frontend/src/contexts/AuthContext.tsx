"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import axios from "axios";
import api, { setAccessToken } from "@/lib/axios"; // ← เพิ่ม api ตรงนี้
import type { LoginRequest, LoginResponse, Role } from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

// access token อายุ 30 นาที แจ้งเตือนก่อน 5 นาที
const WARN_AT_MS = 25 * 60 * 1000;

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
  const warnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function startWarnTimer() {
    if (warnTimer.current) clearTimeout(warnTimer.current);
    warnTimer.current = setTimeout(() => {
      const extend = window.confirm(
        "เซสชันจะหมดอายุใน 5 นาที\nต้องการใช้งานต่อหรือไม่?",
      );
      if (extend) {
        // ใช้ axios ตรงๆ ได้ตรงนี้ เพราะเป็นการ refresh (ไม่มี token แนบ)
        axios
          .post<{ token: string }>(
            `${BASE_URL}/auth/refresh`,
            {},
            { withCredentials: true },
          )
          .then(({ data }) => {
            const payload = JSON.parse(atob(data.token.split(".")[1]));
            applySession(
              data.token,
              payload.user_id,
              payload.role,
              payload.profile_id ?? "",
            );
          })
          .catch(() => {
            window.location.href = "/login";
          });
      }
    }, WARN_AT_MS);
  }

  useEffect(() => {
    (async () => {
      try {
        // ใช้ axios ตรงๆ ได้ตรงนี้ เพราะเป็นการ refresh ครั้งแรก (ยังไม่มี token)
        const { data } = await axios.post<{ token: string }>(
          `${BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true },
        );
        const payload = JSON.parse(atob(data.token.split(".")[1]));
        applySession(
          data.token,
          payload.user_id,
          payload.role,
          payload.profile_id ?? "",
        );
      } catch {
        // ไม่มี session → ต้อง login ใหม่
      } finally {
        setIsLoading(false);
      }
    })();

    return () => {
      if (warnTimer.current) clearTimeout(warnTimer.current);
    };
  }, []);

  function applySession(token: string, uid: string, r: Role, pid: string) {
    setAccessToken(token); // ← set ใน axios instance ก่อน (sync)
    document.cookie = `access_token_hint=${token}; path=/; SameSite=Lax`;
    startWarnTimer();
    // setState ทีหลัง (trigger re-render)
    setToken(token);
    setUserID(uid);
    setRole(r);
    setProfileID(pid);
  }

  const login = useCallback(
    async (req: LoginRequest): Promise<LoginResponse> => {
      const { data } = await axios.post<LoginResponse>(
        `${BASE_URL}/auth/login`,
        req,
        { withCredentials: true },
      );
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
      await api.post("/auth/logout"); // ← เปลี่ยนตรงนี้จุดเดียว ให้แนบ token ไปด้วย
    } finally {
      if (warnTimer.current) clearTimeout(warnTimer.current);
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
      value={{ userID, role, profileID, accessToken, isLoading, login, logout }}
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
