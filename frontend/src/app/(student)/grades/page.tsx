"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { enrollService } from "@/services/enrollService";
import type { EnrollmentHistoryResponse, EnrollmentHistoryItem } from "@/types";
import ProtectedLayout from "@/components/layout/ProtectedLayout";
import { BookOpen, TrendingUp } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Constants ───────────────────────────────────────────────
const CURRENT_YEAR = new Date().getFullYear() + 543;
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - 2 + i);

const STATUS_BADGE: Record<string, string> = {
  enrolled:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
  graded: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
  withdrawn:
    "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400",
};
const STATUS_LABEL: Record<string, string> = {
  enrolled: "ลงทะเบียนแล้ว",
  graded: "ได้เกรดแล้ว",
  withdrawn: "ถอนแล้ว",
};

const GRADE_COLOR: Record<string, string> = {
  A: "text-emerald-600 font-bold",
  "B+": "text-emerald-500 font-semibold",
  B: "text-blue-600 font-semibold",
  "C+": "text-blue-500",
  C: "text-amber-600",
  "D+": "text-orange-500",
  D: "text-orange-600",
  F: "text-red-600 font-bold",
  W: "text-slate-400",
  I: "text-slate-400",
};

type Tab = "courses" | "scores";

// ─── Component ───────────────────────────────────────────────
export default function GradesPage() {
  const { accessToken, isLoading } = useAuth();
  const [year, setYear] = useState(CURRENT_YEAR);
  const [semester, setSemester] = useState(1);
  const [tab, setTab] = useState<Tab>("courses");
  const [history, setHistory] = useState<EnrollmentHistoryResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoading || !accessToken) return;
    const fetch = async () => {
      setLoading(true);
      try {
        const data = await enrollService.getHistory(semester, year);
        setHistory(data);
        console.log(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [isLoading, accessToken, semester, year]);

  const courses = history?.courses ?? [];
  const activeCourses = courses.filter(
    (c) => c.status === "enrolled" || c.status === "graded",
  );
  const totalCredits = activeCourses.reduce((sum, c) => sum + c.credits, 0);

  return (
    <ProtectedLayout
      title="ผลการลงทะเบียน"
      subtitle="ประวัติการลงทะเบียนและคะแนน"
      allowedRoles={["student"]}
    >
      <main className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* ── Controls ── */}
        <div className="flex items-center gap-3 flex-wrap">
          <Select
            value={String(year)}
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

        {/* ── Tabs ── */}
        <div className="flex border-b border-slate-200 dark:border-slate-700/60">
          {(["courses", "scores"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-colors ${
                tab === t
                  ? "border-[#AC3520] text-[#AC3520]"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              {t === "courses" ? "รายวิชาที่ลงทะเบียน" : "คะแนน"}
            </button>
          ))}
        </div>

        {/* ── Content ── */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <div className="w-8 h-8 border-2 border-slate-200 border-t-[#AC3520] rounded-full animate-spin mb-3" />
              <p className="text-[13px]">กำลังโหลด...</p>
            </div>
          ) : courses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <BookOpen size={40} className="mb-3 opacity-30" />
              <p className="text-[14px] font-medium">ไม่มีข้อมูลการลงทะเบียน</p>
              <p className="text-[12px] mt-1 opacity-70">
                ภาค {semester} ปีการศึกษา {year}
              </p>
            </div>
          ) : tab === "courses" ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50">
                      {["รหัสวิชา", "ตอน", "ชื่อวิชา", "หน่วยกิต", "สถานะ"].map(
                        (h) => (
                          <th
                            key={h}
                            className="px-4 py-3 text-left text-slate-500 font-medium border-b border-slate-100 dark:border-slate-700/40 whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40">
                    {courses.map((c) => (
                      <tr
                        key={c.enrollment_id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium font-mono text-slate-800 dark:text-slate-100">
                          {c.course_id}
                        </td>
                        <td className="px-4 py-3 text-center text-slate-500">
                          {c.section_num}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          <p className="font-medium">{c.course_name_th}</p>
                          <p className="text-[11px] text-slate-400">
                            {c.course_name_en}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-center text-slate-500">
                          {c.credits}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_BADGE[c.status] ?? "bg-slate-100 text-slate-500"}`}
                          >
                            {STATUS_LABEL[c.status] ?? c.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Footer */}
              <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-700/40 flex items-center gap-4 text-[12px] text-slate-500">
                <span>รวม {activeCourses.length} รายวิชา</span>
                <span className="text-slate-300 dark:text-slate-600">|</span>
                <span>{totalCredits} หน่วยกิต</span>
                <span className="text-[11px] text-slate-400">
                  (นับเฉพาะวิชาที่ enrolled และ graded)
                </span>
              </div>
            </>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-fixed min-w-[720px] text-[13px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50">
                    <th className="px-4 py-3 w-[120px] text-left">รหัสวิชา</th>
                    <th className="px-4 py-3 w-[220px] text-left">ชื่อวิชา</th>

                    <th className="px-4 py-3 w-[90px] text-center tabular-nums">
                      เข้าเรียน
                    </th>
                    <th className="px-4 py-3 w-[90px] text-center tabular-nums">
                      งาน
                    </th>
                    <th className="px-4 py-3 w-[90px] text-center tabular-nums">
                      กลางภาค
                    </th>
                    <th className="px-4 py-3 w-[90px] text-center tabular-nums">
                      ปลายภาค
                    </th>
                    <th className="px-4 py-3 w-[90px] text-center tabular-nums">
                      รวม
                    </th>
                    <th className="px-4 py-3 w-[70px] text-center">เกรด</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40">
                  {courses.map((c) => (
                    <ScoreRow key={c.enrollment_id} course={c} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </ProtectedLayout>
  );
}

// ─── Score Row sub-component ─────────────────────────────────
// Uses EnrollmentHistoryItem which has total_score & grade at top level
// Attendance/assignment/midterm/final are not in EnrollmentHistoryItem per the DTO,
// so they display "—". If the backend later adds them they'll show up.
function ScoreRow({ course }: { course: EnrollmentHistoryItem }) {
  const fmt = (v: number | undefined | null) =>
    v != null ? v.toFixed(1) : "—";

  return (
    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
      <td className="px-4 py-3 font-medium font-mono text-slate-800 dark:text-slate-100">
        {course.course_id}
      </td>

      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
        <p className="font-medium truncate">{course.course_name_th}</p>
        <p className="text-[11px] text-slate-400 truncate">
          {course.course_name_en}
        </p>
      </td>

      <td className="px-4 py-3 text-center tabular-nums">
        {fmt(course.attendance_score)}
      </td>
      <td className="px-4 py-3 text-center tabular-nums">
        {fmt(course.assignment_score)}
      </td>
      <td className="px-4 py-3 text-center tabular-nums">
        {fmt(course.midterm_score)}
      </td>
      <td className="px-4 py-3 text-center tabular-nums">
        {fmt(course.final_score)}
      </td>

      <td className="px-4 py-3 text-center tabular-nums font-medium text-slate-700 dark:text-slate-200">
        {fmt(course.total_score)}
      </td>

      <td className="px-4 py-3 text-center">
        <span
          className={
            GRADE_COLOR[course.grade] ?? "text-slate-600 dark:text-slate-300"
          }
        >
          {course.grade || "—"}
        </span>
      </td>
    </tr>
  );
}
