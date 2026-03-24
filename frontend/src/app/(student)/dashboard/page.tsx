"use client"

import { useEffect, useState } from "react"
import { userService } from "@/services/userService"
import { enrollService } from "@/services/enrollService"
import type { GetMeResponse, TimetableResponse, TimetableCourse } from "@/types"
import ProtectedLayout from "@/components/layout/ProtectedLayout"
import { GraduationCap, BookOpen, TrendingUp } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"

// ── การตั้งค่าพื้นฐานของตาราง ─────────────────────────────────────
const DAY_ORDER = ["MON", "TUE", "WED", "THU", "FRI"] as const
type Day = (typeof DAY_ORDER)[number]
const DAY_SHORT: Record<Day, string> = {
  MON: "จ",
  TUE: "อ",
  WED: "พ",
  THU: "พฤ",
  FRI: "ศ",
}
const DAY_LABEL: Record<Day, string> = {
  MON: "จันทร์",
  TUE: "อังคาร",
  WED: "พุธ",
  THU: "พฤหัสบดี",
  FRI: "ศุกร์",
}

const START_HOUR = 8
const END_HOUR = 18
const HOURS = Array.from(
  { length: END_HOUR - START_HOUR },
  (_, i) => START_HOUR + i,
)
const COL_W = 56

const DAY_PALETTE: Record<
  Day,
  Array<{ grad: string; glow: string; border: string; shine: string }>
> = {
  MON: [
    {
      grad: "linear-gradient(135deg,#f59e0b,#fbbf24)",
      glow: "rgba(245,158,11,0.3)",
      border: "rgba(245,158,11,0.4)",
      shine: "rgba(252,211,77,0.25)",
    },
    {
      grad: "linear-gradient(135deg,#d97706,#f59e0b)",
      glow: "rgba(217,119,6,0.3)",
      border: "rgba(217,119,6,0.4)",
      shine: "rgba(245,158,11,0.2)",
    },
    {
      grad: "linear-gradient(135deg,#b45309,#d97706)",
      glow: "rgba(180,83,9,0.3)",
      border: "rgba(180,83,9,0.4)",
      shine: "rgba(217,119,6,0.2)",
    },
  ],
  TUE: [
    {
      grad: "linear-gradient(135deg,#ec4899,#f472b6)",
      glow: "rgba(236,72,153,0.3)",
      border: "rgba(236,72,153,0.4)",
      shine: "rgba(249,168,212,0.25)",
    },
    {
      grad: "linear-gradient(135deg,#db2777,#ec4899)",
      glow: "rgba(219,39,119,0.3)",
      border: "rgba(219,39,119,0.4)",
      shine: "rgba(236,72,153,0.2)",
    },
    {
      grad: "linear-gradient(135deg,#be185d,#db2777)",
      glow: "rgba(190,24,93,0.3)",
      border: "rgba(190,24,93,0.4)",
      shine: "rgba(219,39,119,0.2)",
    },
  ],
  WED: [
    {
      grad: "linear-gradient(135deg,#10b981,#34d399)",
      glow: "rgba(16,185,129,0.3)",
      border: "rgba(16,185,129,0.4)",
      shine: "rgba(110,231,183,0.25)",
    },
    {
      grad: "linear-gradient(135deg,#059669,#10b981)",
      glow: "rgba(5,150,105,0.3)",
      border: "rgba(5,150,105,0.4)",
      shine: "rgba(16,185,129,0.2)",
    },
    {
      grad: "linear-gradient(135deg,#047857,#059669)",
      glow: "rgba(4,120,87,0.3)",
      border: "rgba(4,120,87,0.4)",
      shine: "rgba(5,150,105,0.2)",
    },
  ],
  THU: [
    {
      grad: "linear-gradient(135deg,#f97316,#fb923c)",
      glow: "rgba(249,115,22,0.3)",
      border: "rgba(249,115,22,0.4)",
      shine: "rgba(253,186,116,0.25)",
    },
    {
      grad: "linear-gradient(135deg,#ea580c,#f97316)",
      glow: "rgba(234,88,12,0.3)",
      border: "rgba(234,88,12,0.4)",
      shine: "rgba(249,115,22,0.2)",
    },
    {
      grad: "linear-gradient(135deg,#c2410c,#ea580c)",
      glow: "rgba(194,65,12,0.3)",
      border: "rgba(194,65,12,0.4)",
      shine: "rgba(234,88,12,0.2)",
    },
  ],
  FRI: [
    {
      grad: "linear-gradient(135deg,#3b82f6,#60a5fa)",
      glow: "rgba(59,130,246,0.3)",
      border: "rgba(59,130,246,0.4)",
      shine: "rgba(147,197,253,0.25)",
    },
    {
      grad: "linear-gradient(135deg,#2563eb,#3b82f6)",
      glow: "rgba(37,99,235,0.3)",
      border: "rgba(37,99,235,0.4)",
      shine: "rgba(59,130,246,0.2)",
    },
    {
      grad: "linear-gradient(135deg,#1d4ed8,#2563eb)",
      glow: "rgba(29,78,216,0.3)",
      border: "rgba(29,78,216,0.4)",
      shine: "rgba(37,99,235,0.2)",
    },
  ],
}

interface SlotEntry {
  course: TimetableCourse
  startHour: number
  endHour: number
  day: Day
  courseIdx: number
  room: string
}
type Cell = SlotEntry | "SPAN" | null

function buildGrid(tt: TimetableResponse): Record<Day, Cell[]> {
  const grid = Object.fromEntries(
    DAY_ORDER.map((d) => [d, Array<Cell>(HOURS.length).fill(null)]),
  ) as Record<Day, Cell[]>

  const dayCount: Partial<Record<Day, number>> = {}

  tt.courses.forEach((course) => {
    course.schedules.forEach((sch) => {
      const day = sch.day.toUpperCase() as Day
      if (!grid[day]) return

      const siHour = parseInt(sch.start_time.split(":")[0], 10)
      let eiHour = parseInt(sch.end_time.split(":")[0], 10)
      const eiMin = parseInt(sch.end_time.split(":")[1] || "0", 10)

      // ปรับปรุงการคำนวณ Span: ถ้ามีนาทีเศษ ให้ปัดขึ้นเพื่อให้ครอบคลุมช่องในตาราง
      if (eiMin > 0) eiHour += 1
      if (eiHour <= siHour) eiHour = siHour + 1

      const si = siHour - START_HOUR
      const ei = eiHour - START_HOUR

      if (si < 0 || si >= HOURS.length) return

      const courseIdx = dayCount[day] ?? 0
      dayCount[day] = courseIdx + 1

      grid[day][si] = {
        course,
        startHour: siHour,
        endHour: eiHour,
        day,
        courseIdx,
        room: sch.room || "TBA",
      }

      for (let i = si + 1; i < ei && i < HOURS.length; i++) {
        grid[day][i] = "SPAN"
      }
    })
  })
  return grid
}

function InfoCard({
  icon,
  label,
  value,
  accent,
  delay = 0,
}: {
  icon: React.ReactNode
  label: string
  value: string
  accent: string
  delay?: number
}) {
  return (
    <div
      className="relative rounded-[20px] p-5 overflow-hidden fade-up"
      style={{
        animationDelay: `${delay}ms`,
        background: "var(--glass-bg)",
        backdropFilter: "blur(16px) saturate(160%)",
        WebkitBackdropFilter: "blur(16px) saturate(160%)",
        border: "1px solid var(--glass-border-subtle)",
        boxShadow: "var(--glass-shadow)",
        transition: "transform .2s, box-shadow .2s",
        cursor: "default",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement
        el.style.transform = "translateY(-2px)"
        el.style.boxShadow = "var(--glass-shadow-lg)"
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement
        el.style.transform = ""
        el.style.boxShadow = "var(--glass-shadow)"
      }}>
      <div
        className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-20 -translate-y-8 translate-x-8"
        style={{ background: accent, filter: "blur(24px)" }}
      />
      <div className="relative z-10 flex items-center gap-4">
        <div
          className="w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0"
          style={{
            background: `${accent}15`,
            border: `1px solid ${accent}25`,
          }}>
          {icon}
        </div>
        <div>
          <p
            className="text-[11px] font-semibold uppercase tracking-wider mb-0.5"
            style={{
              color: "var(--muted-foreground)",
              letterSpacing: "0.06em",
            }}>
            {label}
          </p>
          <p
            className="text-[20px] font-bold leading-tight"
            style={{
              fontFamily: "var(--font-dm-sans,'DM Sans',sans-serif)",
              letterSpacing: "-0.02em",
              color: "var(--foreground)",
            }}>
            {value}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function StudentDashboard() {
  const { accessToken, isLoading } = useAuth()
  const [me, setMe] = useState<GetMeResponse | null>(null)
  const [timetable, setTimetable] = useState<TimetableResponse | null>(null)

  useEffect(() => {
    if (isLoading || !accessToken) return
    const load = async () => {
      try {
        const [meData, period] = await Promise.all([
          userService.getMe(),
          enrollService.getActivePeriod(),
        ])
        setMe(meData)
        if (period)
          setTimetable(
            await enrollService.getSchedule(
              period.semester,
              period.academic_year,
            ),
          )
      } catch (err) {
        console.error(err)
      }
    }
    load()
  }, [isLoading, accessToken])

  const courses = timetable?.courses ?? []
  const totalCredits = courses.reduce((s, c) => s + c.credits, 0)
  const grid = timetable ? buildGrid(timetable) : null

  return (
    <ProtectedLayout
      title="Dashboard"
      subtitle={`ยินดีต้อนรับ, ${me?.name ?? "—"}`}
      allowedRoles={["student"]}>
      <main className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-thin">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <InfoCard
            icon={<GraduationCap size={20} style={{ color: "#AC3520" }} />}
            label="รหัสนักศึกษา"
            value={me?.student?.student_id ?? "—"}
            accent="#AC3520"
            delay={50}
          />
          <InfoCard
            icon={<BookOpen size={20} style={{ color: "#10b981" }} />}
            label="หน่วยกิตที่ลงทะเบียน"
            value={`${totalCredits} น.`}
            accent="#10b981"
            delay={100}
          />
          <InfoCard
            icon={<TrendingUp size={20} style={{ color: "#8b5cf6" }} />}
            label="GPAX"
            value={me?.student?.gpax?.toFixed(2) ?? "—"}
            accent="#8b5cf6"
            delay={150}
          />
        </div>

        <div
          className="rounded-[20px] overflow-hidden fade-up fade-up-3"
          style={{
            background: "var(--glass-bg)",
            backdropFilter: "blur(16px) saturate(160%)",
            WebkitBackdropFilter: "blur(16px) saturate(160%)",
            border: "1px solid var(--glass-border-subtle)",
            boxShadow: "var(--glass-shadow)",
          }}>
          <div
            className="px-5 py-4 flex items-center justify-between"
            style={{ borderBottom: "1px solid var(--glass-border-subtle)" }}>
            <div className="flex items-center gap-2.5">
              <div
                className="w-1 h-4 rounded-full"
                style={{
                  background: "linear-gradient(180deg,#AC3520,#c94030)",
                }}
              />
              <h2
                className="font-semibold text-[14px]"
                style={{
                  letterSpacing: "-0.01em",
                  color: "var(--foreground)",
                  fontFamily: "var(--font-dm-sans)",
                }}>
                ตารางเรียนประจำสัปดาห์
              </h2>
            </div>
            {timetable && (
              <span
                className="text-[11px] font-semibold px-3 py-1 rounded-full"
                style={{
                  background: "rgba(172,53,32,0.08)",
                  color: "#AC3520",
                }}>
                ภาค {timetable.semester}/{timetable.academic_year}
              </span>
            )}
          </div>

          <div className="overflow-x-auto scrollbar-thin p-4">
            {!grid || courses.length === 0 ? (
              <div
                className="flex flex-col items-center py-10 gap-2"
                style={{ color: "var(--muted-foreground)" }}>
                <BookOpen size={28} style={{ opacity: 0.2 }} />
                <p
                  className="text-[13px]"
                  style={{ fontFamily: "var(--font-sarabun)" }}>
                  ยังไม่มีวิชาในตารางเรียน
                </p>
              </div>
            ) : (
              <table
                style={{
                  borderCollapse: "separate",
                  borderSpacing: 4,
                  minWidth: HOURS.length * (COL_W + 4) + 90,
                }}>
                <thead>
                  <tr>
                    <th style={{ width: 84 }} />
                    {HOURS.map((h) => (
                      <th
                        key={h}
                        style={{
                          width: COL_W,
                          padding: 0,
                          textAlign: "center",
                        }}>
                        <div
                          style={{
                            paddingBottom: 6,
                            fontSize: 10,
                            fontWeight: 600,
                            color: "var(--muted-foreground)",
                            opacity: 0.5,
                            fontFamily:
                              "var(--font-dm-mono,'DM Mono',monospace)",
                          }}>
                          {String(h).padStart(2, "0")}:00
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DAY_ORDER.map((day) => (
                    <tr key={day}>
                      <td style={{ padding: 0, verticalAlign: "middle" }}>
                        <div
                          style={{
                            height: 52,
                            borderRadius: 10,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "rgba(172,53,32,0.06)",
                            border: "1px solid rgba(172,53,32,0.1)",
                            padding: "4px 6px",
                          }}>
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: "#AC3520",
                              fontFamily:
                                "var(--font-dm-sans,'DM Sans',sans-serif)",
                            }}>
                            {DAY_SHORT[day]}
                          </span>
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 500,
                              color: "rgba(172,53,32,0.55)",
                              fontFamily:
                                "var(--font-sarabun,'Sarabun',sans-serif)",
                            }}>
                            {DAY_LABEL[day]}
                          </span>
                        </div>
                      </td>
                      {HOURS.map((_, hIdx) => {
                        const cell = grid[day][hIdx]
                        if (cell === "SPAN") return null
                        const span =
                          cell !== null ? cell.endHour - cell.startHour : 1
                        const p =
                          cell !== null
                            ? DAY_PALETTE[cell.day][
                                cell.courseIdx % DAY_PALETTE[cell.day].length
                              ]
                            : null
                        return (
                          <td
                            key={hIdx}
                            colSpan={span}
                            style={{
                              padding: 0,
                              height: 52,
                              verticalAlign: "top",
                            }}>
                            {cell !== null && p ? (
                              <div
                                style={{
                                  height: "100%",
                                  borderRadius: 10,
                                  background: p.grad,
                                  border: `1px solid ${p.border}`,
                                  boxShadow: `0 2px 10px ${p.glow}, inset 0 1px 0 ${p.shine}`,
                                  padding: "5px 8px",
                                  display: "flex",
                                  flexDirection: "column",
                                  justifyContent: "center",
                                  overflow: "hidden",
                                  position: "relative",
                                  transition: "transform .15s",
                                  cursor: "default",
                                }}
                                onMouseEnter={(e) => {
                                  const el = e.currentTarget as HTMLDivElement
                                  el.style.transform =
                                    "scale(1.02) translateY(-1px)"
                                  el.style.zIndex = "10"
                                }}
                                onMouseLeave={(e) => {
                                  const el = e.currentTarget as HTMLDivElement
                                  el.style.transform = ""
                                  el.style.zIndex = ""
                                }}>
                                <div
                                  style={{
                                    position: "absolute",
                                    top: 0,
                                    left: "10%",
                                    right: "10%",
                                    height: "40%",
                                    background: `linear-gradient(180deg,${p.shine},transparent)`,
                                    borderRadius: "0 0 50% 50%",
                                    pointerEvents: "none",
                                  }}
                                />
                                <p
                                  style={{
                                    position: "relative",
                                    zIndex: 1,
                                    fontSize: 10,
                                    fontWeight: 700,
                                    color: "#fff",
                                    letterSpacing: "-0.01em",
                                    lineHeight: 1.1,
                                    fontFamily:
                                      "var(--font-dm-mono,'DM Mono',monospace)",
                                    textShadow: "0 1px 2px rgba(0,0,0,0.2)",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}>
                                  {cell.course.course_id}
                                </p>
                                <p
                                  style={{
                                    position: "relative",
                                    zIndex: 1,
                                    fontSize: 9,
                                    color: "#fff",
                                    marginTop: 1,
                                    fontFamily:
                                      "var(--font-sarabun,'Sarabun',sans-serif)",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    fontWeight: 500,
                                    opacity: 0.95,
                                  }}>
                                  {cell.course.course_name_en}
                                </p>
                                <p
                                  style={{
                                    position: "relative",
                                    zIndex: 1,
                                    fontSize: 8.5,
                                    color: "rgba(255,255,255,0.8)",
                                    marginTop: 1,
                                    fontFamily:
                                      "var(--font-sarabun,'Sarabun',sans-serif)",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}>
                                  Sec {cell.course.section_num} • {cell.room}
                                </p>
                              </div>
                            ) : (
                              <div
                                style={{
                                  height: "100%",
                                  borderRadius: 8,
                                  background:
                                    hIdx % 2 === 0
                                      ? "rgba(0,0,0,0.018)"
                                      : "transparent",
                                  border: "1px solid rgba(0,0,0,0.03)",
                                }}
                              />
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </ProtectedLayout>
  )
}
