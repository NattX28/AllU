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

    // ไม่มี role = ยังไม่ login
    if (!role) {
      router.replace("/login");
      return;
    }

    // role ไม่ตรงกับที่ page นี้อนุญาต
    if (allowedRoles && !allowedRoles.includes(role)) {
      router.replace(ROLE_HOME[role] ?? "/login");
    }
  }, [isLoading, role, allowedRoles, router]);

  // ── Loading state: รอ auth เสร็จก่อน render ──
  if (isLoading || !role) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="w-8 h-8 border-2 border-slate-200 border-t-[#AC3520] rounded-full animate-spin" />
          <p className="text-[13px]">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  // ── Role ไม่ตรง: ไม่ render อะไรเลย (useEffect จะ redirect) ──
  if (allowedRoles && !allowedRoles.includes(role)) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={title} subtitle={subtitle} />
        {children}
      </div>
    </div>
  );
}
