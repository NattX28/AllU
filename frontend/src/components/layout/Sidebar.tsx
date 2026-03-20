"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  BookOpen,
  CalendarDays,
  GraduationCap,
  User,
  Users,
  BookMarked,
  Layers,
  LogOut,
  School,
  ChevronRight,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const studentNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "ลงทะเบียน", href: "/registration", icon: BookOpen },
  { label: "ตารางเรียน", href: "/schedule", icon: CalendarDays },
  { label: "ผลการเรียน", href: "/grades", icon: GraduationCap },
  { label: "โปรไฟล์", href: "/profile", icon: User },
];

const professorNav: NavItem[] = [
  { label: "Dashboard", href: "/professor/dashboard", icon: LayoutDashboard },
  { label: "จัดการเกรด", href: "/professor/grades", icon: GraduationCap },
];

const adminNav: NavItem[] = [
  { label: "จัดการผู้ใช้", href: "/admin/users", icon: Users },
  { label: "จัดการวิชา", href: "/admin/courses", icon: BookMarked },
  { label: "จัดการกลุ่มเรียน", href: "/admin/sections", icon: Layers },
];

const navMap = {
  student: studentNav,
  professor: professorNav,
  admin: adminNav,
} as const;

const roleLabelMap = {
  student: "นักศึกษา",
  professor: "อาจารย์",
  admin: "ผู้ดูแลระบบ",
} as const;

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { role, logout } = useAuth();

  const nav = navMap[role ?? "student"] ?? [];

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <aside
      className={cn(
        "flex flex-col w-[240px] shrink-0 min-h-screen",
        "bg-[var(--sidebar)] text-[var(--sidebar-foreground)]",
        "border-r border-[var(--sidebar-border)]",
      )}
    >
      {/* ── Logo ── */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-[var(--sidebar-border)] shrink-0">
        <div
          className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
          style={{ backgroundColor: "var(--sidebar-primary)" }}
        >
          <School size={16} className="text-white" />
        </div>
        <div className="leading-tight">
          <p className="text-[14px] font-bold tracking-tight">AllU</p>
          <p className="text-[11px] opacity-40">KMUTNB Academic</p>
        </div>
      </div>

      {/* ── Role badge ── */}
      <div className="px-4 pt-4 pb-1">
        <span
          className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold"
          style={{
            backgroundColor:
              "color-mix(in oklch, var(--sidebar-primary) 14%, transparent)",
            color: "var(--sidebar-primary)",
          }}
        >
          {roleLabelMap[role ?? "student"]}
        </span>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
        {nav.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href + "/"));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 px-3 py-2.5 rounded-lg",
                "text-[13.5px] font-medium transition-all duration-150",
                active
                  ? "text-[var(--sidebar-primary-foreground)]"
                  : "text-[var(--sidebar-foreground)] opacity-65 hover:opacity-100 hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)]",
              )}
              style={
                active
                  ? { backgroundColor: "var(--sidebar-primary)" }
                  : undefined
              }
            >
              <Icon
                size={16}
                className={cn(
                  "shrink-0",
                  active ? "text-white" : "opacity-50 group-hover:opacity-80",
                )}
              />
              <span className="flex-1 truncate">{item.label}</span>
              {active && (
                <ChevronRight size={13} className="shrink-0 text-white/50" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Logout ── */}
      <div className="px-3 pb-4 pt-2 border-t border-[var(--sidebar-border)]">
        <button
          onClick={handleLogout}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg",
            "text-[13.5px] font-medium opacity-60",
            "hover:opacity-100 hover:bg-[var(--sidebar-accent)]",
            "transition-all duration-150 group",
          )}
        >
          <LogOut
            size={16}
            className="shrink-0 group-hover:text-[var(--color-cmu-red)] transition-colors"
          />
          ออกจากระบบ
        </button>
      </div>
    </aside>
  );
}
