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
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-800 dark:text-blue-200",
    border: "border-l-4 border-l-blue-500",
  },
  {
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
    text: "text-emerald-800 dark:text-emerald-200",
    border: "border-l-4 border-l-emerald-500",
  },
  {
    bg: "bg-violet-100 dark:bg-violet-900/30",
    text: "text-violet-800 dark:text-violet-200",
    border: "border-l-4 border-l-violet-500",
  },
  {
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-800 dark:text-amber-200",
    border: "border-l-4 border-l-amber-500",
  },
  {
    bg: "bg-pink-100 dark:bg-pink-900/30",
    text: "text-pink-800 dark:text-pink-200",
    border: "border-l-4 border-l-pink-500",
  },
  {
    bg: "bg-cyan-100 dark:bg-cyan-900/30",
    text: "text-cyan-800 dark:text-cyan-200",
    border: "border-l-4 border-l-cyan-500",
  },
  {
    bg: "bg-orange-100 dark:bg-orange-900/30",
    text: "text-orange-800 dark:text-orange-200",
    border: "border-l-4 border-l-orange-500",
  },
  {
    bg: "bg-teal-100 dark:bg-teal-900/30",
    text: "text-teal-800 dark:text-teal-200",
    border: "border-l-4 border-l-teal-500",
  },
];

const CURRENT_YEAR = new Date().getFullYear() + 543;
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - 2 + i);

// ─── Grid types ───────────────────────────────────────────────
interface SlotEntry {
  course: TimetableCourse;
  startHour: number;
  endHour: number;
  room: string;
  colorIdx: number;
}
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
      const startIdx = startH - START_HOUR;
      const endIdx = endH - START_HOUR;

      if (startIdx < 0 || startIdx >= HOURS.length) return;

      grid[day][startIdx] = {
        course,
        startHour: startH,
        endHour: endH,
        room: sch.room,
        colorIdx: courseIdx,
      };
      for (let i = startIdx + 1; i < endIdx && i < HOURS.length; i++) {
        grid[day][i] = "SPAN";
      }
    });
  });

  return grid;
}

// ─── Page ─────────────────────────────────────────────────────
export default function SchedulePage() {
  const { accessToken, isLoading } = useAuth();

  // null = not initialized yet (waiting for active period to pre-fill)
  const [year, setYear] = useState<number | null>(null);
  const [semester, setSemester] = useState<number | null>(null);
  const [timetable, setTimetable] = useState<TimetableResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Step 1: get active period to pre-fill dropdown ──
  useEffect(() => {
    if (isLoading || !accessToken) return;
    const init = async () => {
      try {
        const period = await enrollService.getActivePeriod();
        if (period) {
          setSemester(period.semester);
          setYear(period.academic_year);
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

  // ── Step 2: fetch timetable whenever semester/year changes ──
  useEffect(() => {
    if (!accessToken || semester === null || year === null) return;
    const fetch = async () => {
      setLoading(true);
      try {
        const data = await enrollService.getSchedule(semester, year);
        setTimetable(data);
      } catch (err) {
        console.error(err);
        setTimetable(null);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [accessToken, semester, year]);

  const grid = useMemo(
    () => (timetable ? buildGrid(timetable) : null),
    [timetable],
  );

  const isEmpty = !timetable || timetable.courses.length === 0;

  return (
    <ProtectedLayout
      title="ตารางเรียน"
      subtitle="ตารางเรียนประจำภาคการศึกษา"
      allowedRoles={["student"]}
    >
      <main className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* ── Controls ── */}
        <div className="flex items-center gap-3 flex-wrap">
          <Select
            value={year !== null ? String(year) : ""}
            onValueChange={(v) => setYear(Number(v))}
          >
            <SelectTrigger className="w-40 h-10">
              <SelectValue placeholder="ปีการศึกษา" />
            </SelectTrigger>
            <SelectContent>
              {YEAR_OPTIONS.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  ปีการศึกษา {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
            {[1, 2, 3].map((s) => (
              <button
                key={s}
                onClick={() => setSemester(s)}
                className={`px-4 py-1.5 rounded-md text-[13px] font-medium transition-all ${
                  semester === s
                    ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                ภาค {s}
              </button>
            ))}
          </div>
        </div>

        {/* ── Timetable ── */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <div className="w-8 h-8 border-2 border-slate-200 border-t-[#AC3520] rounded-full animate-spin mb-3" />
              <p className="text-[13px]">กำลังโหลดตารางเรียน...</p>
            </div>
          ) : isEmpty ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <CalendarDays size={40} className="mb-3 opacity-30" />
              <p className="text-[14px] font-medium">ไม่มีวิชาในตารางเรียน</p>
              <p className="text-[12px] mt-1 opacity-70">
                ภาค {semester} ปีการศึกษา {year}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="border-collapse min-w-[900px] w-full text-[12px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50">
                    <th className="w-20 px-3 py-3 text-[11px] text-slate-400 font-medium border-b border-r border-slate-100 dark:border-slate-700/40 text-center whitespace-nowrap">
                      วัน \ เวลา
                    </th>
                    {HOURS.map((h) => (
                      <th
                        key={h}
                        className="px-2 py-3 text-[11px] text-slate-500 font-medium border-b border-r border-slate-100 dark:border-slate-700/40 last:border-r-0 text-center whitespace-nowrap"
                        style={{ minWidth: "60px" }}
                      >
                        {String(h).padStart(2, "0")}:00
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DAY_ORDER.map((day) => (
                    <tr
                      key={day}
                      className="border-b border-slate-100 dark:border-slate-700/40 last:border-b-0"
                      style={{ height: "60px" }}
                    >
                      <td className="px-3 py-2 text-center text-[12px] font-medium text-slate-600 dark:text-slate-300 border-r border-slate-100 dark:border-slate-700/40 bg-slate-50 dark:bg-slate-800/30 whitespace-nowrap">
                        {DAY_LABEL[day]}
                      </td>
                      {HOURS.map((_, hIdx) => {
                        const cell = grid![day][hIdx];
                        if (cell === "SPAN") return null;
                        if (cell === null) {
                          return (
                            <td
                              key={hIdx}
                              className="border-r border-slate-100 dark:border-slate-700/30 last:border-r-0"
                            />
                          );
                        }
                        const span = cell.endHour - cell.startHour;
                        const color = PALETTE[cell.colorIdx % PALETTE.length];
                        return (
                          <td
                            key={hIdx}
                            colSpan={span}
                            className="px-1 py-1 border-r border-slate-100 dark:border-slate-700/30 align-middle"
                          >
                            <div
                              className={`rounded-md px-2 py-1.5 overflow-hidden h-[48px] ${color.bg} ${color.border}`}
                            >
                              <p
                                className={`text-[11px] font-semibold leading-tight truncate ${color.text}`}
                              >
                                {cell.course.course_id} (Sec.
                                {cell.course.section_num})
                              </p>
                              <p
                                className={`text-[10px] leading-tight truncate opacity-70 mt-0.5 ${color.text}`}
                              >
                                {cell.room}
                              </p>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Legend ── */}
        {!loading && !isEmpty && timetable && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-sm p-4">
            <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400 mb-3">
              รายวิชาในตาราง ({timetable.courses.length} วิชา)
            </p>
            <div className="flex flex-wrap gap-2">
              {timetable.courses.map((course, idx) => {
                const color = PALETTE[idx % PALETTE.length];
                return (
                  <div
                    key={course.enrollment_id}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${color.bg} ${color.border}`}
                  >
                    <span className={`text-[12px] font-semibold ${color.text}`}>
                      {course.course_id}
                    </span>
                    <span className={`text-[11px] opacity-75 ${color.text}`}>
                      {course.course_name_th}
                    </span>
                    <span className={`text-[11px] opacity-60 ${color.text}`}>
                      ({course.credits} น.)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </ProtectedLayout>
  );
}
