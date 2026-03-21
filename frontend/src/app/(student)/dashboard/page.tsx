// ─── dashboard/page.tsx ───────────────────────────────────────────────────────
"use client";

import { useEffect, useState } from "react";
import { userService } from "@/services/userService";
import { enrollService } from "@/services/enrollService";
import type {
  GetMeResponse,
  TimetableResponse,
  TimetableCourse,
  SectionSchedule,
} from "@/types";
import ProtectedLayout from "@/components/layout/ProtectedLayout";
import { GraduationCap, BookOpen, CalendarDays } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

// ─── Constants ───────────────────────────────────────────────
const DAY_ORDER = ["MON", "TUE", "WED", "THU", "FRI"] as const;
const DAY_LABEL: Record<string, string> = {
  MON: "จันทร์",
  TUE: "อังคาร",
  WED: "พุธ",
  THU: "พฤหัสบดี",
  FRI: "ศุกร์",
};
const HOURS = Array.from({ length: 10 }, (_, i) => i + 8); // 08:00–17:00

const COLORS = [
  "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-700",
  "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-700",
  "bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-900/30 dark:text-violet-200 dark:border-violet-700",
  "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-700",
  "bg-pink-100 text-pink-800 border-pink-300 dark:bg-pink-900/30 dark:text-pink-200 dark:border-pink-700",
];

// ─── Helpers ─────────────────────────────────────────────────
function parseHour(time: string): number {
  return parseInt(time.split(":")[0], 10);
}

interface TimetableEntry {
  course: TimetableCourse;
  schedule: SectionSchedule;
  day: number; // 0=MON … 4=FRI
  startHour: number;
  endHour: number;
  colorClass: string;
}

function buildEntries(timetable: TimetableResponse): TimetableEntry[] {
  const entries: TimetableEntry[] = [];
  timetable.courses.forEach((course, courseIdx) => {
    course.schedules.forEach((sch) => {
      const dayIdx = DAY_ORDER.indexOf(sch.day as (typeof DAY_ORDER)[number]);
      if (dayIdx === -1) return; // SAT/SUN — skip in dashboard mini-grid
      entries.push({
        course,
        schedule: sch,
        day: dayIdx,
        startHour: parseHour(sch.start_time),
        endHour: parseHour(sch.end_time),
        colorClass: COLORS[courseIdx % COLORS.length],
      });
    });
  });
  return entries;
}

// ─── Sub-components ──────────────────────────────────────────
function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/60 px-5 py-4 flex items-center gap-4 shadow-sm">
      <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-[12px] text-slate-400">{label}</p>
        <p className="text-[15px] font-semibold text-slate-800 dark:text-slate-100 leading-tight">
          {value}
        </p>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────
export default function StudentDashboard() {
  const { accessToken, isLoading } = useAuth();
  const [me, setMe] = useState<GetMeResponse | null>(null);
  const [timetable, setTimetable] = useState<TimetableResponse | null>(null);

  useEffect(() => {
    if (isLoading || !accessToken) return;

    const load = async () => {
      try {
        // Load profile and active period in parallel
        const [meData, period] = await Promise.all([
          userService.getMe(),
          enrollService.getActivePeriod(),
        ]);
        setMe(meData);

        // Only fetch schedule if there's an active period
        if (period) {
          const schedule = await enrollService.getSchedule(
            period.semester,
            period.academic_year,
          );
          setTimetable(schedule);
        }
      } catch (err) {
        console.error(err);
      }
    };

    load();
  }, [isLoading, accessToken]);

  const entries = timetable ? buildEntries(timetable) : [];
  const enrolledCourses = timetable?.courses ?? [];
  const totalCredits = enrolledCourses.reduce((sum, c) => sum + c.credits, 0);

  return (
    <ProtectedLayout
      title="Dashboard"
      subtitle={`ยินดีต้อนรับ, ${me?.name ?? "—"}`}
      allowedRoles={["student"]}
    >
      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* ── Info Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <InfoCard
            icon={<GraduationCap size={20} className="text-[#AC3520]" />}
            label="รหัสนักศึกษา"
            value={me?.student?.student_id ?? "—"}
          />
          <InfoCard
            icon={<BookOpen size={20} className="text-emerald-600" />}
            label="หน่วยกิตที่ลงทะเบียน"
            value={`${totalCredits} หน่วยกิต`}
          />
          <InfoCard
            icon={<CalendarDays size={20} className="text-violet-600" />}
            label="GPAX"
            value={me?.student?.gpax?.toFixed(2) ?? "—"}
          />
        </div>

        {/* ── Mini Timetable ── */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/60 overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800 dark:text-slate-100 text-[15px]">
              ตารางเรียนประจำสัปดาห์
            </h2>
            {timetable && (
              <span className="text-[12px] text-slate-400">
                ภาค {timetable.semester}/{timetable.academic_year}
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr>
                  <th className="w-14 py-3 px-2 text-slate-400 font-medium border-b border-r border-slate-100 dark:border-slate-700/40 bg-slate-50 dark:bg-slate-800/50">
                    เวลา
                  </th>
                  {DAY_ORDER.map((d) => (
                    <th
                      key={d}
                      className="py-3 px-3 text-center text-slate-600 dark:text-slate-300 font-medium border-b border-r border-slate-100 dark:border-slate-700/40 bg-slate-50 dark:bg-slate-800/50 last:border-r-0"
                    >
                      {DAY_LABEL[d]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HOURS.map((hour) => (
                  <tr
                    key={hour}
                    className="border-b border-slate-100 dark:border-slate-700/40 last:border-b-0"
                  >
                    <td className="py-2 px-2 text-center text-slate-400 border-r border-slate-100 dark:border-slate-700/40 whitespace-nowrap">
                      {String(hour).padStart(2, "0")}:00
                    </td>
                    {DAY_ORDER.map((_, dayIdx) => {
                      const entry = entries.find(
                        (e) =>
                          e.day === dayIdx &&
                          e.startHour <= hour &&
                          hour < e.endHour,
                      );
                      const isStart = entry && entry.startHour === hour;
                      const span = entry ? entry.endHour - entry.startHour : 1;

                      // Cell already covered by a rowSpan above — return null to skip
                      if (entry && !isStart) return null;

                      return (
                        <td
                          key={dayIdx}
                          rowSpan={isStart ? span : 1}
                          className="px-1.5 py-1 border-r border-slate-100 dark:border-slate-700/40 last:border-r-0 align-top"
                        >
                          {isStart && entry && (
                            <div
                              className={`rounded-lg border px-2 py-1.5 h-full ${entry.colorClass}`}
                            >
                              <p className="font-semibold leading-tight">
                                {entry.course.course_id}
                              </p>
                              <p className="text-[10px] opacity-75 truncate">
                                {entry.course.course_name_th}
                              </p>
                              <p className="text-[10px] opacity-60">
                                Sec {entry.course.section_num}
                              </p>
                            </div>
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
      </main>
    </ProtectedLayout>
  );
}
