"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

interface ProtectedLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  /** ถ้าระบุ จะเช็คว่า role ตรงไหม ถ้าไม่ตรง redirect กลับ home ของ role นั้น */
  allowedRoles?: string[];
}

const ROLE_HOME: Record<string, string> = {
  student: "/dashboard",
  professor: "/professor/dashboard",
  admin: "/admin/users",
};

export default function ProtectedLayout({
  children,
  title,
  subtitle,
  allowedRoles,
}: ProtectedLayoutProps) {
  const { role, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!role) {
      router.replace(
        `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`,
      );
      return;
    }
    if (allowedRoles && !allowedRoles.includes(role)) {
      router.replace(ROLE_HOME[role] ?? "/login");
    }
  }, [isLoading, role, allowedRoles, router]);

  // ── Loading state ──
  if (isLoading || !role) {
    return (
      <div className="flex min-h-screen items-center justify-center mesh-bg">
        <div className="flex flex-col items-center gap-4">
          {/* Animated shield logo */}
          <div
            className="relative flex items-center justify-center w-14 h-14 rounded-[16px]"
            style={{
              background: "linear-gradient(135deg, #AC3520, #c94030)",
              boxShadow: "0 4px 20px rgba(172,53,32,0.35)",
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V7L12 2z"
                fill="rgba(255,255,255,0.9)"
              />
              <path
                d="M9 12l2 2 4-4"
                stroke="#AC3520"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {/* Spinning ring */}
            <div
              className="absolute inset-0 rounded-[16px] border-2 border-transparent animate-spin"
              style={{
                borderTopColor: "rgba(255,255,255,0.5)",
                animationDuration: "1.2s",
              }}
            />
          </div>
          <p
            className="text-[13px] font-medium"
            style={{
              color: "var(--muted-foreground)",
              fontFamily: "'Sarabun', sans-serif",
            }}
          >
            กำลังโหลด...
          </p>
        </div>
      </div>
    );
  }

  // ── Role ไม่ตรง ──
  if (allowedRoles && !allowedRoles.includes(role)) {
    return null;
  }

  return (
    <div className="flex min-h-screen mesh-bg">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={title} subtitle={subtitle} />
        {children}
      </div>
    </div>
  );
}
