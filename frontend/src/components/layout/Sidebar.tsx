"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { cn } from "@/lib/utils"
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
  ChevronRight,
  CalendarClock,
} from "lucide-react"

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
}

const studentNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "ตารางเรียน", href: "/schedule", icon: CalendarDays },
  { label: "ผลการลงทะเบียน", href: "/grades", icon: GraduationCap },
  { label: "ลงทะเบียน", href: "/registration", icon: BookOpen },
  { label: "โปรไฟล์", href: "/profile", icon: User },
]

const professorNav: NavItem[] = [
  { label: "Dashboard", href: "/professor/dashboard", icon: LayoutDashboard },
  { label: "จัดการเกรด", href: "/professor/grades", icon: GraduationCap },
]

const adminNav: NavItem[] = [
  { label: "จัดการผู้ใช้", href: "/admin/users", icon: Users },
  { label: "จัดการวิชา", href: "/admin/courses", icon: BookMarked },
  { label: "จัดการกลุ่มเรียน", href: "/admin/sections", icon: Layers },
  { label: "ระบบลงทะเบียน", href: "/admin/periods", icon: CalendarClock },
]

const navMap = {
  student: studentNav,
  professor: professorNav,
  admin: adminNav,
} as const

const roleLabelMap = {
  student: "นักศึกษา",
  professor: "อาจารย์",
  admin: "ผู้ดูแลระบบ",
} as const

const roleColorMap = {
  student:
    "bg-blue-500/10 text-blue-600 dark:bg-blue-400/10 dark:text-blue-400",
  professor:
    "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400",
  admin:
    "bg-violet-500/10 text-violet-600 dark:bg-violet-400/10 dark:text-violet-400",
} as const

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { role, logout } = useAuth()

  const nav = navMap[role ?? "student"] ?? []

  const handleLogout = async () => {
    await logout()
    router.push("/login")
  }

  return (
    <aside
      className={cn(
        "flex flex-col w-[240px] shrink-0 min-h-screen relative",
        "border-r",
      )}
      style={{
        background: "var(--glass-bg)",
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        borderColor: "var(--glass-border-subtle)",
      }}>
      {/* Subtle gradient top accent */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(172,53,32,0.4), transparent)",
        }}
      />

      {/* ── Logo ── */}
      <div
        className="flex items-center gap-3 px-5 h-16 shrink-0"
        style={{ borderBottom: "1px solid var(--glass-border-subtle)" }}>
        {/* KMUTNB shield logo mark */}
        <div
          className="flex items-center justify-center w-9 h-9 rounded-[10px] shrink-0 relative overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, #AC3520 0%, #c94030 50%, #e05040 100%)",
            boxShadow:
              "0 2px 8px rgba(172,53,32,0.35), inset 0 1px 0 rgba(255,255,255,0.2)",
          }}>
          {/* Shield icon SVG */}
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg">
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
          <div className="absolute inset-0 shimmer rounded-[10px]" />
        </div>
        <div className="leading-tight">
          <p
            className="text-[15px] font-bold tracking-tight"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              letterSpacing: "-0.02em",
            }}>
            AllU
          </p>
          <p
            className="text-[10px] font-medium"
            style={{
              color: "var(--muted-foreground)",
              letterSpacing: "0.04em",
            }}>
            KMUTNB Academic
          </p>
        </div>
      </div>

      {/* ── Role badge ── */}
      <div className="px-4 pt-4 pb-2">
        <span className={cn("pill", roleColorMap[role ?? "student"])}>
          {roleLabelMap[role ?? "student"]}
        </span>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5 scrollbar-thin">
        {nav.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href + "/"))
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 px-3 py-2.5 rounded-[12px]",
                "text-[13px] font-medium transition-all duration-200 relative overflow-hidden",
                active
                  ? "text-white"
                  : "text-[var(--sidebar-foreground)] opacity-60 hover:opacity-100",
              )}
              style={
                active
                  ? {
                      background: "linear-gradient(135deg, #AC3520, #c94030)",
                      boxShadow:
                        "0 2px 12px rgba(172,53,32,0.3), inset 0 1px 0 rgba(255,255,255,0.15)",
                    }
                  : undefined
              }>
              {!active && (
                <span
                  className="absolute inset-0 rounded-[12px] opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  style={{ background: "var(--sidebar-accent)" }}
                />
              )}
              <Icon
                size={15}
                className={cn(
                  "shrink-0 relative z-10",
                  active ? "text-white" : "opacity-60 group-hover:opacity-100",
                )}
              />
              <span className="flex-1 truncate relative z-10">
                {item.label}
              </span>
              {active && (
                <ChevronRight
                  size={12}
                  className="shrink-0 text-white/50 relative z-10"
                />
              )}
            </Link>
          )
        })}
      </nav>

      {/* ── Logout ── */}
      <div
        className="px-3 pb-5 pt-2"
        style={{ borderTop: "1px solid var(--glass-border-subtle)" }}>
        <button
          onClick={handleLogout}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-[12px]",
            "text-[13px] font-medium opacity-50",
            "hover:opacity-80 transition-all duration-200 group relative overflow-hidden",
          )}>
          <span
            className="absolute inset-0 rounded-[12px] opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            style={{ background: "rgba(172,53,32,0.06)" }}
          />
          <LogOut
            size={15}
            className="shrink-0 relative z-10 transition-colors group-hover:text-[#AC3520]"
          />
          <span className="relative z-10 group-hover:text-[#AC3520] transition-colors">
            ออกจากระบบ
          </span>
        </button>
      </div>
    </aside>
  )
}
