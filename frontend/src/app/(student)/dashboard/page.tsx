// ─── dashboard/page.tsx ───────────────────────────────────────────────────────
"use client";

import { useEffect, useState } from "react";
import { userService } from "@/services/userService";
import { enrollService } from "@/services/enrollService";
import type { GetMeResponse, EnrolledCourseResponse } from "@/types";
import ProtectedLayout from "@/components/layout/ProtectedLayout";
import { GraduationCap, BookOpen, CalendarDays } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const DAY_MAP: Record<string, number> = {
  จ: 0,
  อ: 1,
  พ: 2,
  พฤ: 3,
  ศ: 4,
  ส: 5,
  อา: 6,
};
const DAY_LABELS = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์"];
const HOURS = Array.from({ length: 10 }, (_, i) => i + 8);
const COLORS = [
  "bg-blue-100 text-blue-800 border-blue-300",
  "bg-emerald-100 text-emerald-800 border-emerald-300",
  "bg-violet-100 text-violet-800 border-violet-300",
  "bg-amber-100 text-amber-800 border-amber-300",
  "bg-pink-100 text-pink-800 border-pink-300",
];

interface TimetableEntry {
  course: EnrolledCourseResponse;
  day: number;
  startHour: number;
  endHour: number;
  colorClass: string;
}

function parseStudyTime(
  studyTime: string,
  course: EnrolledCourseResponse,
  colorClass: string,
): TimetableEntry[] {
  const parts = studyTime.split(" ");
  if (parts.length < 2) return [];
  const days = parts[0].split(",");
  const times = parts[1].split("-");
  if (times.length < 2) return [];
  const startHour = parseInt(times[0].split(":")[0]);
  const endHour = parseInt(times[1].split(":")[0]);
  return days
    .map((d) => {
      const day = DAY_MAP[d.trim()];
      if (day === undefined || day > 4) return null;
      return { course, day, startHour, endHour, colorClass };
    })
    .filter(Boolean) as TimetableEntry[];
}

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

export default function StudentDashboard() {
  const { accessToken, isLoading } = useAuth();
  const [me, setMe] = useState<GetMeResponse | null>(null);
  const [enrollments, setEnrollments] = useState<EnrolledCourseResponse[]>([]);

  useEffect(() => {
    if (isLoading || !accessToken) return;
    userService.getMe().then(setMe).catch(console.error);
    enrollService
      .getMyEnrollments("current")
      .then(setEnrollments)
      .catch(console.error);
  }, [isLoading, accessToken]);

  const entries: TimetableEntry[] = enrollments.flatMap((e, idx) =>
    parseStudyTime(e.study_time, e, COLORS[idx % COLORS.length]),
  );
  const currentCredits = enrollments.filter(
    (e) => e.status === "enrolled",
  ).length;

  return (
    <ProtectedLayout
      title="Dashboard"
      subtitle={`ยินดีต้อนรับ, ${me?.name ?? "—"}`}
      allowedRoles={["student"]}
    >
      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <InfoCard
            icon={<GraduationCap size={20} className="text-[#AC3520]" />}
            label="รหัสนักศึกษา"
            value={me?.student?.student_id ?? "—"}
          />
          <InfoCard
            icon={<BookOpen size={20} className="text-emerald-600" />}
            label="หน่วยกิตที่ลงทะเบียน"
            value={`${currentCredits} หน่วยกิต`}
          />
          <InfoCard
            icon={<CalendarDays size={20} className="text-violet-600" />}
            label="GPAX"
            value={me?.student?.gpax?.toFixed(2) ?? "—"}
          />
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/60 overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700/60">
            <h2 className="font-semibold text-slate-800 dark:text-slate-100 text-[15px]">
              ตารางเรียนประจำสัปดาห์
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr>
                  <th className="w-14 py-3 px-2 text-slate-400 font-medium border-b border-r border-slate-100 dark:border-slate-700/40 bg-slate-50 dark:bg-slate-800/50">
                    เวลา
                  </th>
                  {DAY_LABELS.map((d) => (
                    <th
                      key={d}
                      className="py-3 px-3 text-center text-slate-600 dark:text-slate-300 font-medium border-b border-r border-slate-100 dark:border-slate-700/40 bg-slate-50 dark:bg-slate-800/50 last:border-r-0"
                    >
                      {d}
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
                    <td className="py-2 px-2 text-center text-slate-400 border-r border-slate-100 dark:border-slate-700/40 whitespace-nowrap">{`${hour.toString().padStart(2, "0")}:00`}</td>
                    {[0, 1, 2, 3, 4].map((dayIdx) => {
                      const entry = entries.find(
                        (e) =>
                          e.day === dayIdx &&
                          e.startHour <= hour &&
                          hour < e.endHour,
                      );
                      const isStart = entry && entry.startHour === hour;
                      const span = entry ? entry.endHour - entry.startHour : 1;
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
                                {entry.course.course_name}
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
