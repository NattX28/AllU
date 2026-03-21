"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { enrollService } from "@/services/enrollService";
import type { TimetableResponse, TimetableCourse } from "@/types";
import ProtectedLayout from "@/components/layout/ProtectedLayout";
import { CalendarDays } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Constants ───────────────────────────────────────────────
const DAY_ORDER = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;
type Day = (typeof DAY_ORDER)[number];

const DAY_LABEL: Record<Day, string> = {
  MON: "จันทร์",
  TUE: "อังคาร",
  WED: "พุธ",
  THU: "พฤหัสบดี",
  FRI: "ศุกร์",
  SAT: "เสาร์",
  SUN: "อาทิตย์",
};

const START_HOUR = 7;
const END_HOUR = 20;
const HOURS = Array.from(
  { length: END_HOUR - START_HOUR },
  (_, i) => START_HOUR + i,
);

const PALETTE = [
  {
    grad: "linear-gradient(145deg,#3b82f6,#60a5fa)",
    glow: "rgba(59,130,246,0.32)",
    glass: "rgba(59,130,246,0.13)",
    border: "rgba(59,130,246,0.4)",
    shine: "rgba(147,197,253,0.28)",
  },
  {
    grad: "linear-gradient(145deg,#10b981,#34d399)",
    glow: "rgba(16,185,129,0.32)",
    glass: "rgba(16,185,129,0.13)",
    border: "rgba(16,185,129,0.4)",
    shine: "rgba(110,231,183,0.28)",
  },
  {
    grad: "linear-gradient(145deg,#8b5cf6,#a78bfa)",
    glow: "rgba(139,92,246,0.32)",
    glass: "rgba(139,92,246,0.13)",
    border: "rgba(139,92,246,0.4)",
    shine: "rgba(196,181,253,0.28)",
  },
  {
    grad: "linear-gradient(145deg,#f59e0b,#fbbf24)",
    glow: "rgba(245,158,11,0.32)",
    glass: "rgba(245,158,11,0.13)",
    border: "rgba(245,158,11,0.4)",
    shine: "rgba(252,211,77,0.28)",
  },
  {
    grad: "linear-gradient(145deg,#ec4899,#f472b6)",
    glow: "rgba(236,72,153,0.32)",
    glass: "rgba(236,72,153,0.13)",
    border: "rgba(236,72,153,0.4)",
    shine: "rgba(249,168,212,0.28)",
  },
  {
    grad: "linear-gradient(145deg,#06b6d4,#22d3ee)",
    glow: "rgba(6,182,212,0.32)",
    glass: "rgba(6,182,212,0.13)",
    border: "rgba(6,182,212,0.4)",
    shine: "rgba(103,232,249,0.28)",
  },
  {
    grad: "linear-gradient(145deg,#f97316,#fb923c)",
    glow: "rgba(249,115,22,0.32)",
    glass: "rgba(249,115,22,0.13)",
    border: "rgba(249,115,22,0.4)",
    shine: "rgba(253,186,116,0.28)",
  },
  {
    grad: "linear-gradient(145deg,#14b8a6,#2dd4bf)",
    glow: "rgba(20,184,166,0.32)",
    glass: "rgba(20,184,166,0.13)",
    border: "rgba(20,184,166,0.4)",
    shine: "rgba(94,234,212,0.28)",
  },
];

const CURRENT_YEAR = new Date().getFullYear() + 543;
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - 2 + i);
const COL_W = 64; // px per hour column

// ─── Types ────────────────────────────────────────────────────
interface SlotEntry {
  course: TimetableCourse;
  startHour: number;
  endHour: number;
  room: string;
  colorIdx: number;
}
// For each day row: index by hour → slot or "SPAN" or null
type Cell = SlotEntry | "SPAN" | null;
type Grid = Record<Day, Cell[]>;

function buildGrid(timetable: TimetableResponse): Grid {
  const grid = Object.fromEntries(
    DAY_ORDER.map((d) => [d, Array<Cell>(HOURS.length).fill(null)]),
  ) as Grid;

  timetable.courses.forEach((course, courseIdx) => {
    course.schedules.forEach((sch) => {
      const day = sch.day as Day;
      if (!grid[day]) return;
      const startH = parseInt(sch.start_time.split(":")[0], 10);
      const endH = parseInt(sch.end_time.split(":")[0], 10);
      const si = startH - START_HOUR;
      const ei = endH - START_HOUR;
      if (si < 0 || si >= HOURS.length) return;
      grid[day][si] = {
        course,
        startHour: startH,
        endHour: endH,
        room: sch.room,
        colorIdx: courseIdx,
      };
      for (let i = si + 1; i < ei && i < HOURS.length; i++)
        grid[day][i] = "SPAN";
    });
  });
  return grid;
}

// ─── Slot card ────────────────────────────────────────────────
function SlotCard({ entry, span }: { entry: SlotEntry; span: number }) {
  const p = PALETTE[entry.colorIdx % PALETTE.length];
  const wide = span >= 2;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: 12,
        background: p.grad,
        border: `1px solid ${p.border}`,
        boxShadow: `0 3px 12px ${p.glow}, inset 0 1px 0 ${p.shine}`,
        padding: wide ? "8px 10px" : "5px 7px",
        display: "flex",
        flexDirection: "column",
        justifyContent: span >= 3 ? "space-between" : "flex-start",
        overflow: "hidden",
        position: "relative",
        transition: "transform .15s, box-shadow .15s",
        cursor: "default",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = "scale(1.03) translateY(-1px)";
        el.style.boxShadow = `0 8px 22px ${p.glow}, inset 0 1px 0 ${p.shine}`;
        el.style.zIndex = "10";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = "";
        el.style.boxShadow = `0 3px 12px ${p.glow}, inset 0 1px 0 ${p.shine}`;
        el.style.zIndex = "";
      }}
    >
      {/* specular streak */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "15%",
          right: "15%",
          height: "45%",
          background: `linear-gradient(180deg,${p.shine},transparent)`,
          borderRadius: "0 0 50% 50%",
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "relative", zIndex: 1 }}>
        <p
          style={{
            fontSize: wide ? 11 : 9.5,
            fontWeight: 700,
            color: "#fff",
            letterSpacing: "-0.01em",
            lineHeight: 1.2,
            fontFamily: "var(--font-dm-mono,'DM Mono',monospace)",
            textShadow: "0 1px 2px rgba(0,0,0,0.2)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {entry.course.course_id}
        </p>
        {wide && (
          <p
            style={{
              fontSize: 9.5,
              color: "rgba(255,255,255,0.78)",
              marginTop: 2,
              lineHeight: 1.3,
              fontFamily: "var(--font-sarabun,'Sarabun',sans-serif)",
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {entry.course.course_name_th}
          </p>
        )}
      </div>
      {span >= 3 && (
        <p
          style={{
            position: "relative",
            zIndex: 1,
            fontSize: 9,
            color: "rgba(255,255,255,0.65)",
            fontFamily: "var(--font-dm-sans,'DM Sans',sans-serif)",
          }}
        >
          {entry.room} · Sec.{entry.course.section_num}
        </p>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────
export default function SchedulePage() {
  const { accessToken, isLoading } = useAuth();
  const [year, setYear] = useState<number | null>(null);
  const [semester, setSemester] = useState<number | null>(null);
  const [timetable, setTimetable] = useState<TimetableResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoading || !accessToken) return;
    const init = async () => {
      try {
        const p = await enrollService.getActivePeriod();
        if (p) {
          setSemester(p.semester);
          setYear(p.academic_year);
        } else {
          setSemester(1);
          setYear(CURRENT_YEAR);
        }
      } catch {
        setSemester(1);
        setYear(CURRENT_YEAR);
      }
    };
    init();
  }, [isLoading, accessToken]);

  useEffect(() => {
    if (!accessToken || semester === null || year === null) return;
    const load = async () => {
      setLoading(true);
      try {
        setTimetable(await enrollService.getSchedule(semester, year));
      } catch {
        setTimetable(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [accessToken, semester, year]);

  const grid = useMemo(
    () => (timetable ? buildGrid(timetable) : null),
    [timetable],
  );
  const isEmpty = !timetable || timetable.courses.length === 0;

  // Show all 7 days always
  const displayDays: Day[] = [...DAY_ORDER];

  const currentHour = new Date().getHours();

  return (
    <ProtectedLayout
      title="ตารางเรียน"
      subtitle="ตารางเรียนประจำภาคการศึกษา"
      allowedRoles={["student"]}
    >
      <main className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin">
        {/* Controls */}
        <div className="flex items-center gap-3 flex-wrap fade-up">
          <Select
            value={year !== null ? String(year) : ""}
            onValueChange={(v) => setYear(Number(v))}
          >
            <SelectTrigger
              className="w-44 h-10 rounded-[12px] text-[13px] font-medium border-0"
              style={{
                background: "var(--glass-bg)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: "1px solid var(--glass-border-subtle)",
                boxShadow: "var(--glass-shadow)",
              }}
            >
              <SelectValue placeholder="ปีการศึกษา" />
            </SelectTrigger>
            <SelectContent className="rounded-[16px]">
              {YEAR_OPTIONS.map((y) => (
                <SelectItem key={y} value={String(y)} className="text-[13px]">
                  ปีการศึกษา {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div
            className="flex items-center gap-1 p-1 rounded-[12px]"
            style={{
              background: "var(--glass-bg)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: "1px solid var(--glass-border-subtle)",
              boxShadow: "var(--glass-shadow)",
            }}
          >
            {[1, 2, 3].map((s) => (
              <button
                key={s}
                onClick={() => setSemester(s)}
                className="px-4 py-1.5 rounded-[9px] text-[13px] font-medium transition-all duration-200"
                style={
                  semester === s
                    ? {
                        background: "linear-gradient(135deg,#AC3520,#c94030)",
                        color: "white",
                        boxShadow: "0 1px 4px rgba(172,53,32,.3)",
                        border: "none",
                      }
                    : {
                        color: "var(--muted-foreground)",
                        background: "transparent",
                        border: "none",
                      }
                }
              >
                ภาค {s}
              </button>
            ))}
          </div>
        </div>

        {/* States */}
        {loading ? (
          <div
            className="flex flex-col items-center justify-center py-32 gap-3"
            style={{ color: "var(--muted-foreground)" }}
          >
            <div
              className="w-8 h-8 rounded-full border-2 animate-spin"
              style={{
                borderColor: "var(--glass-border-subtle)",
                borderTopColor: "#AC3520",
              }}
            />
            <p
              className="text-[13px]"
              style={{ fontFamily: "var(--font-sarabun)" }}
            >
              กำลังโหลดตารางเรียน...
            </p>
          </div>
        ) : isEmpty ? (
          <div
            className="flex flex-col items-center justify-center py-32 gap-4"
            style={{ color: "var(--muted-foreground)" }}
          >
            <div
              className="w-16 h-16 rounded-[20px] flex items-center justify-center"
              style={{
                background: "rgba(172,53,32,0.07)",
                border: "1px solid rgba(172,53,32,0.1)",
              }}
            >
              <CalendarDays
                size={28}
                style={{ color: "#AC3520", opacity: 0.5 }}
              />
            </div>
            <div className="text-center">
              <p
                className="text-[15px] font-semibold"
                style={{
                  color: "var(--foreground)",
                  fontFamily: "var(--font-dm-sans)",
                }}
              >
                ไม่มีวิชาในตารางเรียน
              </p>
              <p
                className="text-[12px] mt-1"
                style={{
                  color: "var(--muted-foreground)",
                  fontFamily: "var(--font-sarabun)",
                }}
              >
                ภาค {semester} ปีการศึกษา {year}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 fade-up fade-up-2">
            {/* ── Grid card ── */}
            <div
              className="rounded-[22px] overflow-hidden"
              style={{
                background: "var(--glass-bg)",
                backdropFilter: "blur(20px) saturate(160%)",
                WebkitBackdropFilter: "blur(20px) saturate(160%)",
                border: "1px solid var(--glass-border-subtle)",
                boxShadow: "var(--glass-shadow-lg)",
              }}
            >
              <div
                className="flex items-center justify-between px-5 py-3"
                style={{ borderBottom: "1px solid var(--glass-border-subtle)" }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-1 h-4 rounded-full"
                    style={{
                      background: "linear-gradient(180deg,#AC3520,#c94030)",
                    }}
                  />
                  <span
                    className="text-[14px] font-semibold"
                    style={{
                      color: "var(--foreground)",
                      letterSpacing: "-0.01em",
                      fontFamily: "var(--font-dm-sans)",
                    }}
                  >
                    ตารางเรียนประจำสัปดาห์
                  </span>
                </div>
                {timetable && (
                  <span
                    className="text-[11px] font-semibold px-3 py-1 rounded-full"
                    style={{
                      background: "rgba(172,53,32,0.08)",
                      color: "#AC3520",
                    }}
                  >
                    ภาค {timetable.semester}/{timetable.academic_year}
                  </span>
                )}
              </div>

              {/*
                ── THE GRID ──
                Layout: row = day, col = time
                Using <table> with colSpan for multi-hour slots
              */}
              <div className="overflow-x-auto scrollbar-thin p-4">
                <table
                  style={{
                    borderCollapse: "separate",
                    borderSpacing: 5,
                    minWidth: HOURS.length * (COL_W + 5) + 120,
                    width: "100%",
                  }}
                >
                  <thead>
                    <tr>
                      {/* Day label col */}
                      <th style={{ width: 100, padding: 0 }} />
                      {/* Hour cols */}
                      {HOURS.map((hour) => (
                        <th
                          key={hour}
                          style={{
                            width: COL_W,
                            padding: 0,
                            textAlign: "center",
                          }}
                        >
                          <div
                            style={{
                              padding: "5px 0",
                              fontSize: 10.5,
                              fontWeight: 600,
                              color:
                                currentHour === hour
                                  ? "#AC3520"
                                  : "var(--muted-foreground)",
                              opacity: currentHour === hour ? 1 : 0.55,
                              fontFamily:
                                "var(--font-dm-mono,'DM Mono',monospace)",
                            }}
                          >
                            {String(hour).padStart(2, "0")}:00
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {displayDays.map((day) => (
                      <tr key={day}>
                        {/* Day header cell */}
                        <td style={{ padding: 0, verticalAlign: "middle" }}>
                          <div
                            style={{
                              height: 56,
                              borderRadius: 12,
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              background: "rgba(172,53,32,0.06)",
                              border: "1px solid rgba(172,53,32,0.1)",
                              padding: "4px 8px",
                            }}
                          >
                            <span
                              style={{
                                fontSize: 13,
                                fontWeight: 700,
                                color: "#AC3520",
                                fontFamily:
                                  "var(--font-dm-sans,'DM Sans',sans-serif)",
                                letterSpacing: "-0.01em",
                              }}
                            >
                              {/* Short day label */}
                              {
                                {
                                  MON: "จ",
                                  TUE: "อ",
                                  WED: "พ",
                                  THU: "พฤ",
                                  FRI: "ศ",
                                  SAT: "ส",
                                  SUN: "อา",
                                }[day]
                              }
                            </span>
                            <span
                              style={{
                                fontSize: 9.5,
                                fontWeight: 500,
                                marginTop: 1,
                                color: "rgba(172,53,32,0.6)",
                                fontFamily:
                                  "var(--font-sarabun,'Sarabun',sans-serif)",
                              }}
                            >
                              {DAY_LABEL[day]}
                            </span>
                          </div>
                        </td>

                        {/* Hour cells for this day */}
                        {HOURS.map((_, hIdx) => {
                          const cell = grid![day][hIdx];
                          if (cell === "SPAN") return null; // covered by colSpan above

                          const span =
                            cell !== null ? cell.endHour - cell.startHour : 1;

                          return (
                            <td
                              key={hIdx}
                              colSpan={span}
                              style={{
                                padding: 0,
                                height: 56,
                                verticalAlign: "top",
                              }}
                            >
                              {cell !== null ? (
                                <SlotCard entry={cell} span={span} />
                              ) : (
                                <div
                                  style={{
                                    height: 56,
                                    borderRadius: 9,
                                    background:
                                      hIdx % 2 === 0
                                        ? "rgba(0,0,0,0.018)"
                                        : "transparent",
                                    border: "1px solid rgba(0,0,0,0.03)",
                                  }}
                                />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Legend chips */}
            <div
              className="rounded-[18px] p-4 fade-up fade-up-3"
              style={{
                background: "var(--glass-bg)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                border: "1px solid var(--glass-border-subtle)",
                boxShadow: "var(--glass-shadow)",
              }}
            >
              <p
                className="text-[11px] font-semibold uppercase mb-3"
                style={{
                  color: "var(--muted-foreground)",
                  letterSpacing: "0.06em",
                }}
              >
                รายวิชาในตาราง ({timetable?.courses.length} วิชา)
              </p>
              <div className="flex flex-wrap gap-2">
                {timetable?.courses.map((course, idx) => {
                  const p = PALETTE[idx % PALETTE.length];
                  return (
                    <div
                      key={course.enrollment_id}
                      className="flex items-center gap-2 px-3 py-2 rounded-[12px]"
                      style={{
                        background: p.glass,
                        border: `1px solid ${p.border}`,
                        boxShadow: `0 2px 8px ${p.glow}`,
                      }}
                    >
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: p.grad,
                          boxShadow: `0 0 6px ${p.glow}`,
                          flexShrink: 0,
                        }}
                      />
                      <span
                        className="text-[12px] font-bold"
                        style={{
                          color: "var(--foreground)",
                          fontFamily: "var(--font-dm-mono,'DM Mono',monospace)",
                        }}
                      >
                        {course.course_id}
                      </span>
                      <span
                        className="text-[11px] opacity-70"
                        style={{
                          color: "var(--foreground)",
                          fontFamily: "var(--font-sarabun)",
                        }}
                      >
                        {course.course_name_th}
                      </span>
                      <span
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full ml-1"
                        style={{
                          background: p.glass,
                          color: "var(--foreground)",
                          opacity: 0.7,
                        }}
                      >
                        {course.credits} น.
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>
    </ProtectedLayout>
  );
}
