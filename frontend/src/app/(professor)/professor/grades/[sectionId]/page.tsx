"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { gradeService } from "@/services/gradeService";
import type { ClassListResponse, StudentGradeItem } from "@/types";
import ProtectedLayout from "@/components/layout/ProtectedLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, Loader2 } from "lucide-react";

function calcGrade(total: number): string {
  if (total >= 80) return "A";
  if (total >= 75) return "B+";
  if (total >= 70) return "B";
  if (total >= 65) return "C+";
  if (total >= 60) return "C";
  if (total >= 55) return "D+";
  if (total >= 50) return "D";
  return "F";
}

export default function SectionGradePage() {
  const { sectionId } = useParams<{ sectionId: string }>();
  const { accessToken, isLoading } = useAuth(); // ← เพิ่ม
  const [data, setData] = useState<ClassListResponse | null>(null);
  const [grades, setGrades] = useState<StudentGradeItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isLoading || !accessToken) return; // ← เพิ่ม
    gradeService
      .getClassList(sectionId)
      .then((res) => {
        setData(res);
        setGrades(res.students);
      })
      .catch(console.error);
  }, [isLoading, accessToken, sectionId]); // ← เพิ่ม dependency

  const updateScore = (
    idx: number,
    field: keyof Pick<
      StudentGradeItem,
      "attendance_score" | "assignment_score" | "midterm_score" | "final_score"
    >,
    value: string,
  ) => {
    setGrades((prev) => {
      const next = [...prev];
      const score =
        value === ""
          ? undefined
          : Math.min(100, Math.max(0, parseFloat(value) || 0));
      next[idx] = { ...next[idx], [field]: score };
      const g = next[idx];
      const total =
        (g.attendance_score ?? 0) * 0.1 +
        (g.assignment_score ?? 0) * 0.2 +
        (g.midterm_score ?? 0) * 0.3 +
        (g.final_score ?? 0) * 0.4;
      next[idx].total_score = parseFloat(total.toFixed(2));
      next[idx].grade = calcGrade(total);
      return next;
    });
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await gradeService.submitGrades(sectionId, grades);
      setSaved(true);
    } catch {
      /* handle error */
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedLayout
      title={data ? `${data.course_id} Sec ${data.section_num}` : "กรอกคะแนน"}
      subtitle={`นักศึกษา ${data?.total_student ?? "—"} คน`}
      allowedRoles={["professor"]}
    >
      <main className="flex-1 overflow-y-auto p-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700/60 text-[12px] text-slate-500 flex items-center gap-6">
            <span>สัดส่วนคะแนน:</span>
            <span>
              เข้าเรียน <strong>10%</strong>
            </span>
            <span>
              งาน <strong>20%</strong>
            </span>
            <span>
              กลางภาค <strong>30%</strong>
            </span>
            <span>
              ปลายภาค <strong>40%</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50">
                  {[
                    "รหัสนักศึกษา",
                    "ชื่อ-สกุล",
                    "เข้าเรียน (/100)",
                    "งาน (/100)",
                    "กลางภาค (/100)",
                    "ปลายภาค (/100)",
                    "รวม",
                    "เกรด",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-slate-500 font-medium border-b border-slate-100 dark:border-slate-700/40 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40">
                {grades.map((g, idx) => (
                  <tr
                    key={g.enrollment_id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/30"
                  >
                    <td className="px-4 py-2 font-mono text-slate-600 dark:text-slate-300">
                      {g.student_id}
                    </td>
                    <td className="px-4 py-2 text-slate-800 dark:text-slate-100">
                      {g.student_name}
                    </td>
                    {(
                      [
                        "attendance_score",
                        "assignment_score",
                        "midterm_score",
                        "final_score",
                      ] as const
                    ).map((field) => (
                      <td key={field} className="px-3 py-2">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step={0.5}
                          className="w-20 h-8 text-center text-[12px]"
                          value={g[field] ?? ""}
                          onChange={(e) =>
                            updateScore(idx, field, e.target.value)
                          }
                        />
                      </td>
                    ))}
                    <td className="px-4 py-2 text-center font-semibold text-slate-700 dark:text-slate-200">
                      {g.total_score.toFixed(1)}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span
                        className={`font-bold text-[13px] ${g.grade === "A" ? "text-emerald-600" : g.grade === "F" ? "text-red-500" : "text-slate-700 dark:text-slate-200"}`}
                      >
                        {g.grade || "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
            <p
              className={`text-[13px] ${saved ? "text-emerald-600" : "text-slate-400"}`}
            >
              {saved ? "✅ บันทึกคะแนนเรียบร้อย" : "กรอกคะแนนแล้วกดบันทึก"}
            </p>
            <Button
              className="bg-[#AC3520] hover:bg-[#922d1a] text-white h-9"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" /> กำลังบันทึก...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Save size={14} /> บันทึกคะแนน
                </span>
              )}
            </Button>
          </div>
        </div>
      </main>
    </ProtectedLayout>
  );
}
