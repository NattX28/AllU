"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { courseService } from "@/services/courseService"
import { enrollService } from "@/services/enrollService"
import { userService } from "@/services/userService"
import type {
  CourseResponse,
  SectionResponse,
  CheckSeatsResponse,
  EnrollmentPeriodResponse,
  TimetableResponse,
  TimetableCourse,
  GetMeResponse,
} from "@/types"
import ProtectedLayout from "@/components/layout/ProtectedLayout"
import {
  Search,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  CalendarX,
  CheckCheck,
  X,
  BookOpen,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import dayjs from "dayjs"

const MAX_CREDITS = 22

interface CartItem {
  course: CourseResponse
  section: SectionResponse
}

const CART_PALETTE = [
  {
    glass: "rgba(59,130,246,0.13)",
    border: "rgba(59,130,246,0.4)",
    dot: "#3b82f6",
  },
  {
    glass: "rgba(16,185,129,0.13)",
    border: "rgba(16,185,129,0.4)",
    dot: "#10b981",
  },
  {
    glass: "rgba(139,92,246,0.13)",
    border: "rgba(139,92,246,0.4)",
    dot: "#8b5cf6",
  },
  {
    glass: "rgba(245,158,11,0.13)",
    border: "rgba(245,158,11,0.4)",
    dot: "#f59e0b",
  },
  {
    glass: "rgba(236,72,153,0.13)",
    border: "rgba(236,72,153,0.4)",
    dot: "#ec4899",
  },
  {
    glass: "rgba(6,182,212,0.13)",
    border: "rgba(6,182,212,0.4)",
    dot: "#06b6d4",
  },
]

const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number)
  return h * 60 + (m || 0)
}

// ── Section row ───────────────────────────────────────────────
function SectionRow({
  sec,
  course,
  inCart,
  courseInCart,
  isEnrolled,
  conflict,
  onAdd,
  colorIdx,
}: {
  sec: SectionResponse
  course: CourseResponse
  inCart: boolean
  courseInCart: boolean
  isEnrolled: boolean
  conflict: string | null
  onAdd: () => void
  colorIdx: number
}) {
  const pal = CART_PALETTE[colorIdx % CART_PALETTE.length]
  const isFull = sec.available === 0
  const disabled = inCart || courseInCart || isEnrolled || isFull || !!conflict
  const schedStr = sec.schedules
    .map(
      (s) => `${s.day} ${s.start_time.slice(0, 5)}–${s.end_time.slice(0, 5)}`,
    )
    .join("  ·  ")

  return (
    <div>
      <div
        className="flex items-center gap-3 px-3 py-2.5 rounded-[12px] transition-all duration-150"
        style={{
          background: inCart
            ? pal.glass
            : conflict
              ? "rgba(245,158,11,0.06)"
              : "rgba(0,0,0,0.025)",
          border: `1px solid ${inCart ? pal.border : conflict ? "rgba(245,158,11,0.2)" : "transparent"}`,
        }}>
        <span
          className="text-[11px] font-bold shrink-0 px-2 py-0.5 rounded-[6px] tabular-nums"
          style={{
            background: inCart ? pal.glass : "rgba(0,0,0,0.05)",
            color: inCart ? pal.dot : "var(--muted-foreground)",
            fontFamily: "var(--font-dm-mono,'DM Mono',monospace)",
            minWidth: 36,
            textAlign: "center",
          }}>
          {sec.section_num}
        </span>
        <span
          className="text-[12px] flex-1 truncate"
          style={{
            color: "var(--muted-foreground)",
            fontFamily: "var(--font-sarabun)",
          }}>
          {schedStr || "—"}
        </span>
        <span
          className="text-[11px] shrink-0 hidden sm:block truncate"
          style={{ color: "var(--muted-foreground)", maxWidth: 100 }}>
          {sec.professor_name}
        </span>
        <span
          className="text-[11px] font-semibold shrink-0 tabular-nums"
          style={{
            color: isFull ? "#ef4444" : "#10b981",
            minWidth: 44,
            textAlign: "right",
          }}>
          {sec.available}/{sec.capacity}
        </span>
        <button
          onClick={onAdd}
          disabled={disabled}
          className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-[8px] text-[11px] font-semibold transition-all duration-150"
          style={{
            background: inCart
              ? pal.glass
              : isEnrolled || courseInCart
                ? "rgba(0,0,0,0.04)"
                : conflict || isFull
                  ? "rgba(239,68,68,0.07)"
                  : "linear-gradient(135deg,#AC3520,#c94030)",
            color: inCart
              ? pal.dot
              : isEnrolled || courseInCart
                ? "var(--muted-foreground)"
                : conflict || isFull
                  ? "#ef4444"
                  : "white",
            border: "none",
            opacity: disabled && !inCart ? 0.7 : 1,
            cursor: disabled ? "default" : "pointer",
            boxShadow:
              !disabled && !inCart && !conflict && !isFull
                ? "0 2px 8px rgba(172,53,32,0.25)"
                : "none",
            minWidth: 66,
            justifyContent: "center",
          }}>
          {inCart ? (
            <>
              <CheckCircle2 size={11} />
              ในตะกร้า
            </>
          ) : isEnrolled ? (
            "ลงแล้ว"
          ) : courseInCart ? (
            "Sec อื่น"
          ) : conflict ? (
            "เวลาทับ"
          ) : isFull ? (
            "เต็ม"
          ) : (
            <>
              <Plus size={11} />
              เพิ่ม
            </>
          )}
        </button>
      </div>
      {conflict && (
        <p
          className="text-[10.5px] px-3 mt-0.5"
          style={{ color: "#d97706", fontFamily: "var(--font-sarabun)" }}>
          ⚠ {conflict}
        </p>
      )}
    </div>
  )
}

// ── Course card ───────────────────────────────────────────────
function CourseCard({
  course,
  period,
  cart,
  schedule,
  enrolledIds,
  enrolledSectionMap,
  hasTimeConflict,
  onAdd,
  onWithdraw,
  cartColorMap,
}: {
  course: CourseResponse
  period: EnrollmentPeriodResponse
  cart: CartItem[]
  schedule: TimetableResponse | null
  enrolledIds: Set<string>
  enrolledSectionMap: Map<string, TimetableCourse>
  hasTimeConflict: (sec: SectionResponse) => string | null
  onAdd: (course: CourseResponse, sec: SectionResponse) => void
  onWithdraw: (enrollmentId: string, courseId: string) => void
  cartColorMap: Map<string, number>
}) {
  const [expanded, setExpanded] = useState(false)
  const isEnrolled = enrolledIds.has(course.id)
  const enrolledEntry = enrolledSectionMap.get(course.id)
  const courseInCart = cart.some((c) => c.course.id === course.id)
  const colorIdx = cartColorMap.get(course.id) ?? 0
  const pal = CART_PALETTE[colorIdx % CART_PALETTE.length]
  const sections = (course.sections ?? []).filter(
    (s) =>
      s.semester === period.semester &&
      s.academic_year === period.academic_year,
  )
  const catLabel =
    course.category === "GENED_COURSE"
      ? "GenEd"
      : course.category === "ELECTIVE_COURSE"
        ? "Elective"
        : "Core"
  const catStyle =
    course.category === "GENED_COURSE"
      ? { bg: "rgba(139,92,246,0.1)", color: "#5b21b6" }
      : course.category === "ELECTIVE_COURSE"
        ? { bg: "rgba(6,182,212,0.1)", color: "#0e7490" }
        : { bg: "rgba(172,53,32,0.08)", color: "#AC3520" }

  return (
    <div
      className="rounded-[18px] overflow-hidden transition-all duration-200"
      style={{
        background: courseInCart
          ? pal.glass
          : isEnrolled
            ? "rgba(16,185,129,0.04)"
            : "var(--glass-bg)",
        border: `1px solid ${courseInCart ? pal.border : isEnrolled ? "rgba(16,185,129,0.2)" : "var(--glass-border-subtle)"}`,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}>
      <button
        className="w-full text-left px-4 pt-4 pb-3 flex items-start gap-3"
        onClick={() => setExpanded((e) => !e)}>
        <div
          className="mt-0.5 w-1 self-stretch rounded-full shrink-0"
          style={{
            minHeight: 16,
            background: isEnrolled
              ? "#10b981"
              : courseInCart
                ? pal.dot
                : "rgba(0,0,0,0.1)",
          }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span
              className="text-[14px] font-bold"
              style={{
                color: "var(--foreground)",
                fontFamily: "var(--font-dm-mono,'DM Mono',monospace)",
                letterSpacing: "-0.01em",
              }}>
              {course.id}
            </span>
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: catStyle.bg, color: catStyle.color }}>
              {catLabel}
            </span>
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{
                background: "rgba(0,0,0,0.05)",
                color: "var(--muted-foreground)",
              }}>
              {course.credits} น.
            </span>
            {isEnrolled && (
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{
                  background: "rgba(16,185,129,0.1)",
                  color: "#065f46",
                }}>
                ✓ ลงทะเบียนแล้ว
              </span>
            )}
            {courseInCart && !isEnrolled && (
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: pal.glass, color: pal.dot }}>
                + ในตะกร้า
              </span>
            )}
          </div>
          <p
            className="text-[12.5px] leading-tight truncate"
            style={{
              color: "var(--muted-foreground)",
              fontFamily: "var(--font-sarabun)",
            }}>
            {course.name_th}
          </p>
          <p
            className="text-[11px] leading-tight truncate mt-0.5"
            style={{ color: "var(--muted-foreground)", opacity: 0.6 }}>
            {course.name_en}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className="text-[11px]"
            style={{ color: "var(--muted-foreground)" }}>
            {sections.length} Sec
          </span>
          {expanded ? (
            <ChevronUp size={14} style={{ color: "var(--muted-foreground)" }} />
          ) : (
            <ChevronDown
              size={14}
              style={{ color: "var(--muted-foreground)" }}
            />
          )}
        </div>
      </button>

      {isEnrolled && enrolledEntry && (
        <div
          className="mx-4 mb-3 flex items-center justify-between px-3 py-2 rounded-[10px]"
          style={{
            background: "rgba(16,185,129,0.08)",
            border: "1px solid rgba(16,185,129,0.18)",
          }}>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={13} style={{ color: "#10b981" }} />
            <span
              className="text-[12px] font-medium"
              style={{ color: "#065f46", fontFamily: "var(--font-sarabun)" }}>
              Sec {enrolledEntry.section_num} — ลงทะเบียนอยู่แล้ว
            </span>
          </div>
          <button
            className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-[7px]"
            style={{
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.15)",
              color: "#dc2626",
              cursor: "pointer",
            }}
            onClick={(e) => {
              e.stopPropagation()
              onWithdraw(enrolledEntry.enrollment_id, course.id)
            }}>
            <Trash2 size={11} /> ถอนวิชา
          </button>
        </div>
      )}

      {expanded && (
        <div className="px-4 pb-4 space-y-1.5">
          <div
            className="grid text-[10px] font-semibold px-3 pb-1"
            style={{
              color: "var(--muted-foreground)",
              gridTemplateColumns: "36px 1fr auto auto auto",
              gap: 12,
              letterSpacing: "0.04em",
            }}>
            <span>SEC</span>
            <span>ตาราง</span>
            <span className="hidden sm:block">อาจารย์</span>
            <span>ที่นั่ง</span>
            <span style={{ minWidth: 66 }} />
          </div>
          {sections.map((sec) => {
            const inCart = cart.some((c) => c.section.id === sec.id)
            const thisCourseInCart =
              !inCart && cart.some((c) => c.course.id === course.id)
            const conflict =
              !inCart && !isEnrolled ? hasTimeConflict(sec) : null
            return (
              <SectionRow
                key={sec.id}
                sec={sec}
                course={course}
                inCart={inCart}
                courseInCart={thisCourseInCart}
                isEnrolled={isEnrolled}
                conflict={conflict}
                colorIdx={cartColorMap.get(course.id) ?? colorIdx}
                onAdd={() => onAdd(course, sec)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Closed period ─────────────────────────────────────────────
function ClosedPeriod() {
  return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <div
        className="w-16 h-16 rounded-[20px] flex items-center justify-center"
        style={{
          background: "rgba(172,53,32,0.08)",
          border: "1px solid rgba(172,53,32,0.12)",
        }}>
        <CalendarX size={28} style={{ color: "#AC3520", opacity: 0.6 }} />
      </div>
      <div className="text-center">
        <p
          className="text-[17px] font-semibold"
          style={{
            color: "var(--foreground)",
            fontFamily: "var(--font-dm-sans)",
          }}>
          ปิดรับลงทะเบียน
        </p>
        <p
          className="text-[13px] mt-2 leading-relaxed max-w-sm"
          style={{
            color: "var(--muted-foreground)",
            fontFamily: "var(--font-sarabun)",
          }}>
          ขณะนี้ไม่อยู่ในช่วงเวลาลงทะเบียนเรียน
          <br />
          กรุณาตรวจสอบปฏิทินการศึกษา
        </p>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────
export default function RegistrationPage() {
  const { accessToken, isLoading } = useAuth()
  const [periodLoading, setPeriodLoading] = useState(true)
  const [period, setPeriod] = useState<
    EnrollmentPeriodResponse | null | undefined
  >(undefined)
  const [me, setMe] = useState<GetMeResponse | null>(null)
  const [courses, setCourses] = useState<CourseResponse[]>([])
  const [schedule, setSchedule] = useState<TimetableResponse | null>(null)
  const [search, setSearch] = useState("")
  const [cart, setCart] = useState<CartItem[]>([])
  const [seats, setSeats] = useState<Record<string, CheckSeatsResponse>>({})
  const [confirming, setConfirming] = useState(false)
  const [confirmResult, setConfirmResult] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState("ALL")
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (isLoading || !accessToken) return
    const load = async () => {
      setPeriodLoading(true)
      try {
        setPeriod((await enrollService.getActivePeriod()) ?? null)
      } catch {
        setPeriod(null)
      } finally {
        setPeriodLoading(false)
      }
    }
    load()
  }, [isLoading, accessToken])

  const loadRegistrationData = useCallback(
    async (p: EnrollmentPeriodResponse) => {
      const [allCourses, currentSchedule, meData] = await Promise.all([
        courseService.getAll(),
        enrollService.getSchedule(p.semester, p.academic_year),
        userService.getMe(),
      ])
      setCourses(allCourses)
      setSchedule(currentSchedule)
      setMe(meData)
    },
    [],
  )

  useEffect(() => {
    if (period) loadRegistrationData(period).catch(console.error)
  }, [period, loadRegistrationData])

  const pollSeats = useCallback(async () => {
    if (cart.length === 0) return
    try {
      const res = await enrollService.checkSeats(cart.map((i) => i.section.id))
      const map: Record<string, CheckSeatsResponse> = {}
      res.forEach((r) => (map[r.section_id] = r))
      setSeats(map)
    } catch {
      /* ignore */
    }
  }, [cart])

  useEffect(() => {
    pollSeats()
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(pollSeats, 10_000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [pollSeats])

  const enrolledIds = new Set(schedule?.courses.map((c) => c.course_id) ?? [])
  const enrolledSectionMap = new Map(
    schedule?.courses.map((c) => [c.course_id, c]) ?? [],
  )
  const cartColorMap = new Map<string, number>()
  cart.forEach((item, i) => cartColorMap.set(item.course.id, i))

  const addToCart = (course: CourseResponse, section: SectionResponse) => {
    if (cart.find((c) => c.section.id === section.id)) return
    if (cart.find((c) => c.course.id === course.id)) return
    setCart((prev) => [...prev, { course, section }])
  }
  const removeFromCart = (sectionId: string) =>
    setCart((prev) => prev.filter((c) => c.section.id !== sectionId))
  const totalCredits = cart.reduce((sum, c) => sum + c.course.credits, 0)
  const isFirstTime = !schedule || schedule.courses.length === 0

  const hasTimeConflict = (sec: SectionResponse): string | null => {
    const active: Array<{
      day: string
      start: number
      end: number
      label: string
    }> = []
    cart.forEach((item) =>
      item.section.schedules.forEach((sch) =>
        active.push({
          day: sch.day,
          start: toMin(sch.start_time),
          end: toMin(sch.end_time),
          label: item.course.id,
        }),
      ),
    )
    schedule?.courses.forEach((c) =>
      c.schedules.forEach((sch) =>
        active.push({
          day: sch.day,
          start: toMin(sch.start_time),
          end: toMin(sch.end_time),
          label: c.course_id,
        }),
      ),
    )
    for (const ns of sec.schedules) {
      const ns_ = toMin(ns.start_time),
        ne = toMin(ns.end_time)
      for (const ex of active) {
        if (ex.day === ns.day && ns_ < ex.end && ne > ex.start)
          return `เวลาทับกับวิชา ${ex.label} (${ns.day} ${ns.start_time}–${ns.end_time})`
      }
    }
    return null
  }

  const handleWithdraw = async (enrollmentId: string, courseId: string) => {
    if (!confirm(`ถอนวิชา ${courseId} ออกจากตารางเรียน?`)) return
    try {
      await enrollService.withdraw(enrollmentId)
      if (period)
        setSchedule(
          await enrollService.getSchedule(
            period.semester,
            period.academic_year,
          ),
        )
    } catch {
      alert("เกิดข้อผิดพลาด กรุณาลองใหม่")
    }
  }

  const handleConfirm = async () => {
    setConfirming(true)
    setConfirmResult(null)
    try {
      if (isFirstTime) {
        const res = await enrollService.confirm(cart.map((c) => c.section.id))
        setConfirmResult(
          `ลงทะเบียนสำเร็จ ${res.enrolled_ids.length} วิชา (${res.total_credits} หน่วยกิต)`,
        )
      } else {
        const existing = (schedule?.courses ?? [])
          .filter((c) => c.status === "enrolled" || c.status === "graded")
          .map((c) => c.section_id)
        await enrollService.update([
          ...new Set([...existing, ...cart.map((c) => c.section.id)]),
        ])
        setConfirmResult("อัปเดตการลงทะเบียนสำเร็จ")
      }
      setCart([])
      if (period)
        setSchedule(
          await enrollService.getSchedule(
            period.semester,
            period.academic_year,
          ),
        )
    } catch {
      setConfirmResult("ERROR")
    } finally {
      setConfirming(false)
    }
  }

  const facultyDeptCode = me?.student?.student_id?.slice(2, 6) ?? ""
  const isCourseAllowed = (c: CourseResponse) => {
    const cat = c.category?.toUpperCase() ?? ""
    if (cat === "GENED_COURSE" || cat === "ELECTIVE_COURSE") return true
    if (!facultyDeptCode) return true
    return c.id.startsWith(facultyDeptCode)
  }
  const periodCourses = courses.filter(
    (c) =>
      isCourseAllowed(c) &&
      c.sections?.some(
        (s) =>
          s.semester === period?.semester &&
          s.academic_year === period?.academic_year,
      ),
  )
  const filtered = periodCourses.filter((c) => {
    const ms =
      c.id.toLowerCase().includes(search.toLowerCase()) ||
      c.name_en.toLowerCase().includes(search.toLowerCase()) ||
      c.name_th.includes(search)
    const mc =
      categoryFilter === "ALL" ||
      (categoryFilter === "CORE" &&
        c.category !== "GENED_COURSE" &&
        c.category !== "ELECTIVE_COURSE") ||
      (categoryFilter === "GENED" && c.category === "GENED_COURSE") ||
      (categoryFilter === "ELECTIVE" && c.category === "ELECTIVE_COURSE")
    return ms && mc
  })

  if (isLoading || periodLoading || period === undefined) {
    return (
      <ProtectedLayout
        title="ลงทะเบียนเรียน"
        subtitle="ตรวจสอบรอบการลงทะเบียน..."
        allowedRoles={["student"]}>
        <main className="flex-1 flex items-center justify-center">
          <div
            className="flex flex-col items-center gap-3"
            style={{ color: "var(--muted-foreground)" }}>
            <div
              className="w-8 h-8 rounded-full border-2 animate-spin"
              style={{
                borderColor: "var(--glass-border-subtle)",
                borderTopColor: "#AC3520",
              }}
            />
            <p
              className="text-[13px]"
              style={{ fontFamily: "var(--font-sarabun)" }}>
              กำลังโหลด...
            </p>
          </div>
        </main>
      </ProtectedLayout>
    )
  }
  if (period === null) {
    return (
      <ProtectedLayout
        title="ลงทะเบียนเรียน"
        subtitle="ไม่อยู่ในช่วงรับลงทะเบียน"
        allowedRoles={["student"]}>
        <main className="flex-1 overflow-y-auto p-6">
          <ClosedPeriod />
        </main>
      </ProtectedLayout>
    )
  }

  const endDate = dayjs(period.end_date).format("DD/MM/YYYY")
  const hasSeatFull = cart.some((c) => seats[c.section.id]?.is_full)

  return (
    <ProtectedLayout
      title="ลงทะเบียนเรียน"
      subtitle={`ภาค ${period.semester}/${period.academic_year} · ปิดรับ ${endDate}`}
      allowedRoles={["student"]}>
      <main className="flex-1 overflow-hidden flex flex-col p-5 gap-4">
        {/* Banner */}
        <div
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-[14px] text-[13px] shrink-0"
          style={{
            background: "rgba(16,185,129,0.07)",
            border: "1px solid rgba(16,185,129,0.18)",
            color: "#065f46",
            fontFamily: "var(--font-sarabun)",
          }}>
          <CheckCheck size={14} className="shrink-0" />
          <span>
            เปิดรับลงทะเบียน ภาค {period.semester}/{period.academic_year} —
            ปิดรับ <strong>{endDate}</strong>
          </span>
        </div>

        <div className="flex-1 overflow-hidden flex gap-4 min-h-0">
          {/* ── LEFT: Course browser ── */}
          <div className="flex-1 flex flex-col gap-3 overflow-hidden">
            <div
              className="flex flex-col gap-2.5 p-3 rounded-[18px] shrink-0"
              style={{
                background: "var(--glass-bg)",
                border: "1px solid var(--glass-border-subtle)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
              }}>
              <div className="relative">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--muted-foreground)" }}
                />
                <input
                  placeholder="ค้นหารหัสวิชา หรือชื่อวิชา..."
                  className="w-full h-10 rounded-[12px] text-[13px] pl-9 pr-4 outline-none transition-all"
                  style={{
                    background: "rgba(0,0,0,0.04)",
                    border: "1px solid rgba(0,0,0,0.06)",
                    color: "var(--foreground)",
                    fontFamily: "var(--font-sarabun)",
                  }}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onFocus={(e) => {
                    e.currentTarget.style.border =
                      "1px solid rgba(172,53,32,0.35)"
                    e.currentTarget.style.boxShadow =
                      "0 0 0 3px rgba(172,53,32,0.08)"
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.border = "1px solid rgba(0,0,0,0.06)"
                    e.currentTarget.style.boxShadow = "none"
                  }}
                />
              </div>
              <div className="flex items-center gap-1.5">
                {[
                  { key: "ALL", label: "ทั้งหมด" },
                  { key: "CORE", label: "Core" },
                  { key: "GENED", label: "GenEd" },
                  { key: "ELECTIVE", label: "Elective" },
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setCategoryFilter(f.key)}
                    className="px-3 py-1 rounded-full text-[11px] font-semibold transition-all duration-150"
                    style={{
                      background:
                        categoryFilter === f.key
                          ? "linear-gradient(135deg,#AC3520,#c94030)"
                          : "rgba(0,0,0,0.05)",
                      color:
                        categoryFilter === f.key
                          ? "white"
                          : "var(--muted-foreground)",
                      border: "none",
                      boxShadow:
                        categoryFilter === f.key
                          ? "0 2px 8px rgba(172,53,32,0.25)"
                          : "none",
                    }}>
                    {f.label}
                  </button>
                ))}
                <span
                  className="ml-auto text-[11px]"
                  style={{ color: "var(--muted-foreground)" }}>
                  {filtered.length} วิชา
                </span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 scrollbar-thin pr-0.5">
              {filtered.length === 0 ? (
                <div
                  className="flex flex-col items-center py-20 gap-3"
                  style={{ color: "var(--muted-foreground)" }}>
                  <Search size={32} style={{ opacity: 0.2 }} />
                  <p
                    className="text-[13px]"
                    style={{ fontFamily: "var(--font-sarabun)" }}>
                    ไม่พบวิชาที่ค้นหา
                  </p>
                </div>
              ) : (
                filtered.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    period={period}
                    cart={cart}
                    schedule={schedule}
                    enrolledIds={enrolledIds}
                    enrolledSectionMap={enrolledSectionMap}
                    hasTimeConflict={hasTimeConflict}
                    onAdd={addToCart}
                    onWithdraw={handleWithdraw}
                    cartColorMap={cartColorMap}
                  />
                ))
              )}
            </div>
          </div>

          {/* ── RIGHT: Cart ── */}
          <div
            className="flex flex-col gap-3 overflow-y-auto scrollbar-thin"
            style={{ width: 280, flexShrink: 0 }}>
            {/* Cart */}
            <div
              className="rounded-[18px] overflow-hidden"
              style={{
                background: "var(--glass-bg)",
                border: "1px solid var(--glass-border-subtle)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                boxShadow: "var(--glass-shadow)",
              }}>
              <div
                className="px-4 py-3 flex items-center justify-between"
                style={{
                  borderBottom: "1px solid var(--glass-border-subtle)",
                }}>
                <div className="flex items-center gap-2">
                  <div
                    className="w-1 h-4 rounded-full"
                    style={{
                      background: "linear-gradient(180deg,#AC3520,#c94030)",
                    }}
                  />
                  <span
                    className="text-[13px] font-semibold"
                    style={{
                      color: "var(--foreground)",
                      letterSpacing: "-0.01em",
                    }}>
                    ตะกร้าลงทะเบียน
                  </span>
                </div>
                <span
                  className="text-[12px] font-semibold tabular-nums"
                  style={{
                    color:
                      totalCredits > MAX_CREDITS
                        ? "#ef4444"
                        : "var(--muted-foreground)",
                  }}>
                  {totalCredits}/{MAX_CREDITS} น.
                </span>
              </div>
              <div className="px-4 pt-3 pb-1">
                <div
                  className="w-full h-1.5 rounded-full overflow-hidden"
                  style={{ background: "rgba(0,0,0,0.06)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min((totalCredits / MAX_CREDITS) * 100, 100)}%`,
                      background:
                        totalCredits > MAX_CREDITS
                          ? "#ef4444"
                          : "linear-gradient(90deg,#AC3520,#c94030)",
                    }}
                  />
                </div>
              </div>
              <div className="p-3 space-y-2 min-h-[80px]">
                {cart.length === 0 ? (
                  <div
                    className="flex flex-col items-center py-6 gap-2"
                    style={{ color: "var(--muted-foreground)" }}>
                    <BookOpen size={22} style={{ opacity: 0.2 }} />
                    <p
                      className="text-[12px]"
                      style={{ fontFamily: "var(--font-sarabun)" }}>
                      ยังไม่มีวิชาในตะกร้า
                    </p>
                  </div>
                ) : (
                  cart.map((item, idx) => {
                    const seatInfo = seats[item.section.id]
                    const isFull = seatInfo?.is_full ?? false
                    const pal = CART_PALETTE[idx % CART_PALETTE.length]
                    return (
                      <div
                        key={item.section.id}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-[12px]"
                        style={{
                          background: isFull
                            ? "rgba(239,68,68,0.06)"
                            : pal.glass,
                          border: `1px solid ${isFull ? "rgba(239,68,68,0.2)" : pal.border}`,
                        }}>
                        <div
                          className="w-1.5 rounded-full shrink-0 self-stretch"
                          style={{
                            minHeight: 16,
                            background: isFull ? "#ef4444" : pal.dot,
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-[12px] font-semibold truncate"
                            style={{
                              color: isFull ? "#dc2626" : pal.dot,
                              fontFamily:
                                "var(--font-dm-mono,'DM Mono',monospace)",
                            }}>
                            {item.course.id}{" "}
                            <span
                              style={{
                                fontFamily: "var(--font-sarabun)",
                                fontWeight: 400,
                              }}>
                              Sec {item.section.section_num}
                            </span>
                          </p>
                          <p
                            className="text-[10.5px] truncate"
                            style={{
                              color: "var(--muted-foreground)",
                              fontFamily: "var(--font-sarabun)",
                            }}>
                            {item.course.name_th}
                          </p>
                          {isFull ? (
                            <p
                              className="text-[10px] flex items-center gap-1 mt-0.5"
                              style={{ color: "#dc2626" }}>
                              <AlertCircle size={10} /> ที่นั่งเต็ม
                            </p>
                          ) : seatInfo ? (
                            <p
                              className="text-[10px] flex items-center gap-1 mt-0.5"
                              style={{ color: "#10b981" }}>
                              <CheckCircle2 size={10} /> ว่าง{" "}
                              {seatInfo.available} ที่
                            </p>
                          ) : null}
                        </div>
                        <button
                          onClick={() => removeFromCart(item.section.id)}
                          className="shrink-0 p-1 rounded-[6px] transition-colors"
                          style={{ color: "var(--muted-foreground)" }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.color = "#ef4444")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.color =
                              "var(--muted-foreground)")
                          }>
                          <X size={13} />
                        </button>
                      </div>
                    )
                  })
                )}
              </div>
              <div
                className="p-3"
                style={{ borderTop: "1px solid var(--glass-border-subtle)" }}>
                {totalCredits > MAX_CREDITS && (
                  <p
                    className="text-[11px] text-center mb-2"
                    style={{
                      color: "#ef4444",
                      fontFamily: "var(--font-sarabun)",
                    }}>
                    ⚠ หน่วยกิตเกิน {MAX_CREDITS} หน่วยกิต
                  </p>
                )}
                <button
                  className="w-full h-11 rounded-[13px] text-[13px] font-semibold flex items-center justify-center gap-2 transition-all duration-200"
                  disabled={
                    cart.length === 0 ||
                    totalCredits > MAX_CREDITS ||
                    confirming ||
                    hasSeatFull
                  }
                  onClick={handleConfirm}
                  style={{
                    background:
                      cart.length === 0 ||
                      totalCredits > MAX_CREDITS ||
                      hasSeatFull
                        ? "rgba(0,0,0,0.06)"
                        : "linear-gradient(135deg,#AC3520,#c94030)",
                    color:
                      cart.length === 0 ||
                      totalCredits > MAX_CREDITS ||
                      hasSeatFull
                        ? "var(--muted-foreground)"
                        : "white",
                    border: "none",
                    boxShadow:
                      cart.length > 0 &&
                      totalCredits <= MAX_CREDITS &&
                      !hasSeatFull
                        ? "0 4px 16px rgba(172,53,32,0.3)"
                        : "none",
                    fontFamily: "var(--font-dm-sans)",
                    cursor:
                      cart.length === 0 || confirming
                        ? "not-allowed"
                        : "pointer",
                  }}>
                  {confirming ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />{" "}
                      กำลังยืนยัน...
                    </>
                  ) : isFirstTime ? (
                    `ยืนยันลงทะเบียน (${cart.length} วิชา)`
                  ) : (
                    `อัปเดตการลงทะเบียน (${cart.length} วิชา)`
                  )}
                </button>
              </div>
            </div>

            {/* Enrolled list */}
            {schedule && schedule.courses.length > 0 && (
              <div
                className="rounded-[18px] overflow-hidden"
                style={{
                  background: "var(--glass-bg)",
                  border: "1px solid var(--glass-border-subtle)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                }}>
                <div
                  className="px-4 py-3 flex items-center gap-2"
                  style={{
                    borderBottom: "1px solid var(--glass-border-subtle)",
                  }}>
                  <div
                    className="w-1 h-4 rounded-full"
                    style={{ background: "#10b981" }}
                  />
                  <span
                    className="text-[13px] font-semibold"
                    style={{
                      color: "var(--foreground)",
                      letterSpacing: "-0.01em",
                    }}>
                    วิชาที่ลงทะเบียนอยู่
                  </span>
                  <span
                    className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      background: "rgba(16,185,129,0.1)",
                      color: "#065f46",
                    }}>
                    {schedule.courses.length} วิชา
                  </span>
                </div>
                <div className="p-3 space-y-1.5">
                  {schedule.courses.map((c) => (
                    <div
                      key={c.enrollment_id}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-[10px]"
                      style={{
                        background: "rgba(16,185,129,0.05)",
                        border: "1px solid rgba(16,185,129,0.1)",
                      }}>
                      <div className="min-w-0">
                        <p
                          className="text-[12px] font-semibold truncate"
                          style={{
                            color: "#065f46",
                            fontFamily:
                              "var(--font-dm-mono,'DM Mono',monospace)",
                          }}>
                          {c.course_id}{" "}
                          <span
                            style={{
                              fontFamily: "var(--font-sarabun)",
                              fontWeight: 400,
                            }}>
                            Sec {c.section_num}
                          </span>
                        </p>
                        <p
                          className="text-[10.5px] truncate"
                          style={{
                            color: "var(--muted-foreground)",
                            maxWidth: 180,
                            fontFamily: "var(--font-sarabun)",
                          }}>
                          {c.course_name_th}
                        </p>
                      </div>
                      <button
                        className="shrink-0 p-1 rounded-[6px] transition-colors"
                        style={{ color: "var(--muted-foreground)" }}
                        onClick={() =>
                          handleWithdraw(c.enrollment_id, c.course_id)
                        }
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.color = "#ef4444")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.color =
                            "var(--muted-foreground)")
                        }>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Toast */}
            {confirmResult && (
              <div
                className="rounded-[14px] px-4 py-3 text-[13px] flex items-center gap-2"
                style={{
                  background:
                    confirmResult === "ERROR"
                      ? "rgba(239,68,68,0.08)"
                      : "rgba(16,185,129,0.08)",
                  border: `1px solid ${confirmResult === "ERROR" ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.2)"}`,
                  color: confirmResult === "ERROR" ? "#dc2626" : "#065f46",
                  fontFamily: "var(--font-sarabun)",
                }}>
                {confirmResult === "ERROR" ? (
                  <>
                    <AlertCircle size={14} /> เกิดข้อผิดพลาด กรุณาลองใหม่
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} /> {confirmResult}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </ProtectedLayout>
  )
}
