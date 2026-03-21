"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { enrollService } from "@/services/enrollService";
import type { EnrollmentHistoryResponse, EnrollmentHistoryItem } from "@/types";
import ProtectedLayout from "@/components/layout/ProtectedLayout";
import { BookOpen } from "lucide-react";
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

const STATUS_BADGE: Record<
  string,
  { bg: string; color: string; label: string }
> = {
  enrolled: {
    bg: "rgba(16,185,129,0.1)",
    color: "#065f46",
    label: "ลงทะเบียนแล้ว",
  },
  graded: {
    bg: "rgba(59,130,246,0.1)",
    color: "#1d4ed8",
    label: "ได้เกรดแล้ว",
  },
  withdrawn: {
    bg: "rgba(0,0,0,0.05)",
    color: "var(--muted-foreground)",
    label: "ถอนแล้ว",
  },
};

const GRADE_COLOR: Record<string, string> = {
  A: "#059669",
  "B+": "#10b981",
  B: "#3b82f6",
  "C+": "#6366f1",
  C: "#f59e0b",
  "D+": "#f97316",
  D: "#ef4444",
  F: "#dc2626",
  W: "var(--muted-foreground)",
  I: "var(--muted-foreground)",
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
      <main className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
        {/* ── Controls ── */}
        <div className="flex items-center gap-3 flex-wrap fade-up">
          <Select
            value={String(year)}
            onValueChange={(v) => setYear(Number(v))}
          >
            <SelectTrigger
              className="w-44 h-10 rounded-[12px] border-0 text-[13px] font-medium"
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
                        background: "linear-gradient(135deg, #AC3520, #c94030)",
                        color: "white",
                        boxShadow: "0 1px 4px rgba(172,53,32,0.3)",
                      }
                    : { color: "var(--muted-foreground)" }
                }
              >
                ภาค {s}
              </button>
            ))}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div
          className="flex gap-0 fade-up fade-up-1"
          style={{ borderBottom: "1px solid var(--glass-border-subtle)" }}
        >
          {(["courses", "scores"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-5 py-2.5 text-[13px] font-semibold transition-all duration-200 relative"
              style={{
                color: tab === t ? "#AC3520" : "var(--muted-foreground)",
                fontFamily: "'Sarabun', sans-serif",
              }}
            >
              {t === "courses" ? "รายวิชาที่ลงทะเบียน" : "คะแนน"}
              {tab === t && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full"
                  style={{
                    background: "linear-gradient(90deg, #AC3520, #c94030)",
                  }}
                />
              )}
            </button>
          ))}
        </div>

        {/* ── Main Card ── */}
        <div
          className="rounded-[20px] overflow-hidden fade-up fade-up-2"
          style={{
            background: "var(--glass-bg)",
            backdropFilter: "blur(16px) saturate(160%)",
            WebkitBackdropFilter: "blur(16px) saturate(160%)",
            border: "1px solid var(--glass-border-subtle)",
            boxShadow: "var(--glass-shadow)",
          }}
        >
          {loading ? (
            <div
              className="flex flex-col items-center justify-center py-20"
              style={{ color: "var(--muted-foreground)" }}
            >
              <div
                className="w-8 h-8 rounded-full border-2 animate-spin mb-3"
                style={{
                  borderColor: "var(--glass-border-subtle)",
                  borderTopColor: "#AC3520",
                }}
              />
              <p
                className="text-[13px]"
                style={{ fontFamily: "'Sarabun', sans-serif" }}
              >
                กำลังโหลด...
              </p>
            </div>
          ) : courses.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-20"
              style={{ color: "var(--muted-foreground)" }}
            >
              <BookOpen size={40} className="mb-3 opacity-20" />
              <p
                className="text-[14px] font-medium"
                style={{ fontFamily: "'Sarabun', sans-serif" }}
              >
                ไม่มีข้อมูลการลงทะเบียน
              </p>
              <p
                className="text-[12px] mt-1 opacity-70"
                style={{ fontFamily: "'Sarabun', sans-serif" }}
              >
                ภาค {semester} ปีการศึกษา {year}
              </p>
            </div>
          ) : tab === "courses" ? (
            <>
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr
                      style={{
                        background: "rgba(0,0,0,0.02)",
                        borderBottom: "1px solid var(--glass-border-subtle)",
                      }}
                    >
                      {["รหัสวิชา", "ตอน", "ชื่อวิชา", "หน่วยกิต", "สถานะ"].map(
                        (h) => (
                          <th
                            key={h}
                            className="px-4 py-3 text-left font-semibold text-[11px] uppercase"
                            style={{
                              color: "var(--muted-foreground)",
                              letterSpacing: "0.04em",
                            }}
                          >
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {courses.map((c, i) => {
                      const badge =
                        STATUS_BADGE[c.status] ?? STATUS_BADGE.withdrawn;
                      return (
                        <tr
                          key={c.enrollment_id}
                          style={{
                            borderBottom:
                              i < courses.length - 1
                                ? "1px solid var(--glass-border-subtle)"
                                : "none",
                          }}
                        >
                          <td
                            className="px-4 py-3 font-semibold"
                            style={{
                              fontFamily: "'DM Mono', monospace",
                              fontSize: "12px",
                              color: "var(--foreground)",
                            }}
                          >
                            {c.course_id}
                          </td>
                          <td
                            className="px-4 py-3 text-center"
                            style={{ color: "var(--muted-foreground)" }}
                          >
                            {c.section_num}
                          </td>
                          <td className="px-4 py-3">
                            <p
                              className="font-medium text-[13px]"
                              style={{
                                color: "var(--foreground)",
                                fontFamily: "'Sarabun', sans-serif",
                              }}
                            >
                              {c.course_name_th}
                            </p>
                            <p
                              className="text-[11px]"
                              style={{ color: "var(--muted-foreground)" }}
                            >
                              {c.course_name_en}
                            </p>
                          </td>
                          <td
                            className="px-4 py-3 text-center font-semibold"
                            style={{ color: "var(--foreground)" }}
                          >
                            {c.credits}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className="pill"
                              style={{
                                background: badge.bg,
                                color: badge.color,
                              }}
                            >
                              {badge.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div
                className="px-4 py-3 flex items-center gap-4 text-[12px]"
                style={{
                  borderTop: "1px solid var(--glass-border-subtle)",
                  color: "var(--muted-foreground)",
                  fontFamily: "'Sarabun', sans-serif",
                }}
              >
                <span
                  className="font-medium"
                  style={{ color: "var(--foreground)" }}
                >
                  รวม {activeCourses.length} รายวิชา
                </span>
                <span>·</span>
                <span>{totalCredits} หน่วยกิต</span>
              </div>
            </>
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full table-fixed min-w-[720px] text-[13px]">
                <thead>
                  <tr
                    style={{
                      background: "rgba(0,0,0,0.02)",
                      borderBottom: "1px solid var(--glass-border-subtle)",
                    }}
                  >
                    {[
                      { label: "รหัสวิชา", w: "120px" },
                      { label: "ชื่อวิชา", w: "220px" },
                      { label: "เข้าเรียน", w: "90px" },
                      { label: "งาน", w: "90px" },
                      { label: "กลางภาค", w: "90px" },
                      { label: "ปลายภาค", w: "90px" },
                      { label: "รวม", w: "90px" },
                      { label: "เกรด", w: "70px" },
                    ].map((h) => (
                      <th
                        key={h.label}
                        className="px-4 py-3 text-left font-semibold text-[11px] uppercase"
                        style={{
                          color: "var(--muted-foreground)",
                          letterSpacing: "0.04em",
                          width: h.w,
                        }}
                      >
                        {h.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {courses.map((c, i) => (
                    <ScoreRow
                      key={c.enrollment_id}
                      course={c}
                      isLast={i === courses.length - 1}
                    />
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

function ScoreRow({
  course,
  isLast,
}: {
  course: EnrollmentHistoryItem;
  isLast: boolean;
}) {
  const fmt = (v: number | undefined | null) =>
    v != null ? v.toFixed(1) : "—";
  const gradeColor = GRADE_COLOR[course.grade] ?? "var(--foreground)";

  return (
    <tr
      style={{
        borderBottom: isLast ? "none" : "1px solid var(--glass-border-subtle)",
      }}
    >
      <td
        className="px-4 py-3 font-semibold"
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: "12px",
          color: "var(--foreground)",
        }}
      >
        {course.course_id}
      </td>
      <td className="px-4 py-3">
        <p
          className="font-medium truncate text-[13px]"
          style={{
            color: "var(--foreground)",
            fontFamily: "'Sarabun', sans-serif",
          }}
        >
          {course.course_name_th}
        </p>
        <p
          className="text-[11px] truncate"
          style={{ color: "var(--muted-foreground)" }}
        >
          {course.course_name_en}
        </p>
      </td>
      {[
        course.attendance_score,
        course.assignment_score,
        course.midterm_score,
        course.final_score,
        course.total_score,
      ].map((v, i) => (
        <td
          key={i}
          className="px-4 py-3 text-center tabular-nums font-medium text-[13px]"
          style={{
            color: v != null ? "var(--foreground)" : "var(--muted-foreground)",
          }}
        >
          {fmt(v)}
        </td>
      ))}
      <td className="px-4 py-3 text-center">
        <span
          className="text-[14px] font-bold"
          style={{ color: gradeColor, fontFamily: "'DM Sans', sans-serif" }}
        >
          {course.grade || "—"}
        </span>
      </td>
    </tr>
  );
}
