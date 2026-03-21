"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { gradeService } from "@/services/gradeService";
import type { ClassListResponse, StudentGradeItem } from "@/types";
import ProtectedLayout from "@/components/layout/ProtectedLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, Loader2, CheckSquare, Check } from "lucide-react";

// ─── constants ──────────────────────────────────────────────

const SCORE_FIELDS = [
  { field: "attendance_score" as const, label: "เข้าเรียน", max: 10 },
  { field: "assignment_score" as const, label: "งาน", max: 20 },
  { field: "midterm_score" as const, label: "กลางภาค", max: 30 },
  { field: "final_score" as const, label: "ปลายภาค", max: 40 },
] as const;

type ScoreField = (typeof SCORE_FIELDS)[number]["field"];

// ─── helpers ────────────────────────────────────────────────

// total = sum ของคะแนนดิบ เพราะ max รวมกัน = 100 แล้ว
function calcPreviewTotal(g: StudentGradeItem): number {
  return parseFloat(
    (
      (g.attendance_score ?? 0) +
      (g.assignment_score ?? 0) +
      (g.midterm_score ?? 0) +
      (g.final_score ?? 0)
    ).toFixed(2),
  );
}

function previewGrade(total: number): string {
  if (total >= 80) return "A";
  if (total >= 75) return "B+";
  if (total >= 70) return "B";
  if (total >= 65) return "C+";
  if (total >= 60) return "C";
  if (total >= 55) return "D+";
  if (total >= 50) return "D";
  return "F";
}

function isComplete(g: StudentGradeItem): boolean {
  return (
    g.attendance_score != null &&
    g.assignment_score != null &&
    g.midterm_score != null &&
    g.final_score != null
  );
}

// ─── component ──────────────────────────────────────────────

export default function SectionGradePage() {
  const { sectionId } = useParams<{ sectionId: string }>();
  const { accessToken, isLoading } = useAuth();

  const [data, setData] = useState<ClassListResponse | null>(null);
  const [grades, setGrades] = useState<StudentGradeItem[]>([]);

  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [committing, setCommitting] = useState(false);
  const [commitMsg, setCommitMsg] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showCommitPrompt, setShowCommitPrompt] = useState(false);

  useEffect(() => {
    if (isLoading || !accessToken) return;
    gradeService
      .getClassList(sectionId)
      .then((res) => {
        setData(res);
        setGrades(res.students);
      })
      .catch(console.error);
  }, [isLoading, accessToken, sectionId]);

  // ─── กรอกคะแนน ─────────────────────────────────────────

  const updateScore = (
    idx: number,
    field: ScoreField,
    value: string,
    max: number,
  ) => {
    setGrades((prev) => {
      const next = [...prev];
      const score =
        value === ""
          ? undefined
          : Math.min(max, Math.max(0, parseFloat(value) || 0));
      next[idx] = { ...next[idx], [field]: score };
      return next;
    });
    setSavedMsg(null);
    setCommitMsg(null);
    setShowCommitPrompt(false);
  };

  const handleSaveScores = async () => {
    setSaving(true);
    setSavedMsg(null);
    try {
      await gradeService.saveScores(sectionId, grades);
      setSavedMsg("บันทึกคะแนนเรียบร้อย");
      setShowCommitPrompt(true);
    } catch {
      setSavedMsg("เกิดข้อผิดพลาด ไม่สามารถบันทึกได้");
    } finally {
      setSaving(false);
    }
  };

  // ─── ตัดเกรด ───────────────────────────────────────────

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const reload = async () => {
    const updated = await gradeService.getClassList(sectionId);
    setGrades(updated.students);
  };

  const handleCommitAll = async () => {
    setCommitting(true);
    setCommitMsg(null);
    try {
      await gradeService.saveScores(sectionId, grades); // sync คะแนนล่าสุดก่อนตัดเกรด
      const res = await gradeService.commitGrades(sectionId, true);
      setCommitMsg(res.message);
      setShowCommitPrompt(false);
      await reload();
    } catch {
      setCommitMsg("เกิดข้อผิดพลาด ไม่สามารถตัดเกรดได้");
    } finally {
      setCommitting(false);
    }
  };

  const handleCommitSelected = async () => {
    if (selected.size === 0) return;
    setCommitting(true);
    setCommitMsg(null);
    try {
      await gradeService.saveScores(sectionId, grades); // sync คะแนนล่าสุดก่อนตัดเกรด
      const res = await gradeService.commitGrades(sectionId, false, [
        ...selected,
      ]);
      setCommitMsg(res.message);
      setSelected(new Set());
      await reload();
    } catch {
      setCommitMsg("เกิดข้อผิดพลาด ไม่สามารถตัดเกรดได้");
    } finally {
      setCommitting(false);
    }
  };

  // ─── derived ────────────────────────────────────────────

  const completeCount = grades.filter(isComplete).length;
  const gradedCount = grades.filter((g) => g.status === "graded").length;

  // ─── render ─────────────────────────────────────────────

  return (
    <ProtectedLayout
      title={data ? `${data.course_id} Sec ${data.section_num}` : "กรอกคะแนน"}
      subtitle={`นักศึกษา ${data?.total_student ?? "—"} คน`}
      allowedRoles={["professor"]}
    >
      <main className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* ── action bar ───────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-[13px] text-slate-500 dark:text-slate-400">
            <span>
              คะแนนครบ{" "}
              <strong className="text-slate-700 dark:text-slate-200">
                {completeCount}
              </strong>
              /{grades.length} คน
            </span>
            <span>
              ตัดเกรดแล้ว{" "}
              <strong className="text-emerald-600">{gradedCount}</strong>/
              {grades.length} คน
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="h-9 text-[13px]"
              onClick={handleSaveScores}
              disabled={saving}
            >
              {saving ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 size={13} className="animate-spin" /> กำลังบันทึก...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Save size={13} /> บันทึกคะแนน
                </span>
              )}
            </Button>

            {selected.size > 0 && (
              <Button
                className="h-9 text-[13px] bg-amber-500 hover:bg-amber-600 text-white"
                onClick={handleCommitSelected}
                disabled={committing}
              >
                {committing ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 size={13} className="animate-spin" />{" "}
                    กำลังตัดเกรด...
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Check size={13} /> ตัดเกรด {selected.size} คน
                  </span>
                )}
              </Button>
            )}

            <Button
              className="h-9 text-[13px] bg-[#AC3520] hover:bg-[#922d1a] text-white"
              onClick={handleCommitAll}
              disabled={committing || completeCount === 0}
            >
              {committing ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 size={13} className="animate-spin" /> กำลังตัดเกรด...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <CheckSquare size={13} /> ตัดเกรดทั้งห้อง
                </span>
              )}
            </Button>
          </div>
        </div>

        {savedMsg && !showCommitPrompt && (
          <p
            className={`text-[13px] ${savedMsg.includes("ผิดพลาด") ? "text-red-500" : "text-emerald-600"}`}
          >
            {savedMsg}
          </p>
        )}
        {commitMsg && (
          <p
            className={`text-[13px] ${commitMsg.includes("ผิดพลาด") ? "text-red-500" : "text-emerald-600"}`}
          >
            {commitMsg}
          </p>
        )}

        {/* ── commit prompt ─────────────────────────────── */}
        {showCommitPrompt && !commitMsg && (
          <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-900/20 text-[13px]">
            <p className="text-amber-800 dark:text-amber-300">
              บันทึกคะแนนเรียบร้อยแล้ว — ต้องการตัดเกรดจากคะแนนปัจจุบันเลยไหม?
            </p>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="outline"
                className="h-8 text-[12px] border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-400"
                onClick={() => setShowCommitPrompt(false)}
              >
                ไม่ตอนนี้
              </Button>
              <Button
                className="h-8 text-[12px] bg-[#AC3520] hover:bg-[#922d1a] text-white"
                onClick={() => {
                  setShowCommitPrompt(false);
                  handleCommitAll();
                }}
                disabled={committing || completeCount === 0}
              >
                {committing ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 size={12} className="animate-spin" />{" "}
                    กำลังตัดเกรด...
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <CheckSquare size={12} /> ตัดเกรดเลย
                  </span>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ── table ────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-sm overflow-hidden">
          {/* weight header */}
          <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700/60 text-[12px] text-slate-500 flex flex-wrap items-center gap-x-6 gap-y-1">
            <span>สัดส่วนคะแนน (รวม 100):</span>
            {SCORE_FIELDS.map(({ label, max }) => (
              <span key={label}>
                {label} <strong>{max}</strong>
              </span>
            ))}
            <span className="ml-auto text-slate-400">
              ✓ เลือกแถวเพื่อตัดเกรดรายคน
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50">
                  <th className="w-10 px-3 py-3 border-b border-slate-100 dark:border-slate-700/40" />
                  <th className="px-4 py-3 text-left text-slate-500 font-medium border-b border-slate-100 dark:border-slate-700/40 whitespace-nowrap">
                    รหัสนักศึกษา
                  </th>
                  <th className="px-4 py-3 text-left text-slate-500 font-medium border-b border-slate-100 dark:border-slate-700/40">
                    ชื่อ-สกุล
                  </th>
                  {SCORE_FIELDS.map(({ field, label, max }) => (
                    <th
                      key={field}
                      className="px-4 py-3 text-left text-slate-500 font-medium border-b border-slate-100 dark:border-slate-700/40 whitespace-nowrap"
                    >
                      {label}{" "}
                      <span className="text-slate-400 font-normal">/{max}</span>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left text-slate-500 font-medium border-b border-slate-100 dark:border-slate-700/40 whitespace-nowrap">
                    รวม /100
                  </th>
                  <th className="px-4 py-3 text-left text-slate-500 font-medium border-b border-slate-100 dark:border-slate-700/40">
                    เกรด
                  </th>
                  <th className="px-4 py-3 text-left text-slate-500 font-medium border-b border-slate-100 dark:border-slate-700/40">
                    สถานะ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40">
                {grades.map((g, idx) => {
                  const isGraded = g.status === "graded";
                  const isChecked = selected.has(g.enrollment_id);
                  const preview = calcPreviewTotal(g);
                  const previewGradeStr = isComplete(g)
                    ? previewGrade(preview)
                    : "—";

                  return (
                    <tr
                      key={g.enrollment_id}
                      className={`transition-colors cursor-pointer
                        ${isChecked ? "bg-amber-50 dark:bg-amber-900/20" : "hover:bg-slate-50 dark:hover:bg-slate-800/30"}
                        ${isGraded ? "opacity-70" : ""}
                      `}
                      onClick={() => toggleSelect(g.enrollment_id)}
                    >
                      <td
                        className="px-3 py-2 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelect(g.enrollment_id)}
                          className="accent-amber-500 cursor-pointer"
                        />
                      </td>

                      <td className="px-4 py-2 font-mono text-slate-600 dark:text-slate-300">
                        {g.student_id}
                      </td>
                      <td className="px-4 py-2 text-slate-800 dark:text-slate-100">
                        {g.student_name}
                      </td>

                      {SCORE_FIELDS.map(({ field, max }) => (
                        <td
                          key={field}
                          className="px-3 py-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Input
                            type="number"
                            min={0}
                            max={max}
                            step={0.5}
                            className="w-20 h-8 text-center text-[12px]"
                            value={g[field] ?? ""}
                            onChange={(e) =>
                              updateScore(idx, field, e.target.value, max)
                            }
                            placeholder={`0–${max}`}
                          />
                        </td>
                      ))}

                      {/* total */}
                      <td className="px-4 py-2 text-center font-semibold text-slate-700 dark:text-slate-200">
                        {isComplete(g) ? preview.toFixed(1) : "—"}
                      </td>

                      {/* grade */}
                      <td className="px-4 py-2 text-center">
                        {isGraded ? (
                          <span
                            className={`font-bold text-[13px] ${
                              g.grade === "A"
                                ? "text-emerald-600"
                                : g.grade === "F"
                                  ? "text-red-500"
                                  : "text-slate-700 dark:text-slate-200"
                            }`}
                          >
                            {g.grade}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[12px]">
                            {previewGradeStr}
                            {isComplete(g) && (
                              <span className="text-[10px] text-slate-300 ml-0.5">
                                (คาด)
                              </span>
                            )}
                          </span>
                        )}
                      </td>

                      {/* status badge */}
                      <td className="px-4 py-2 text-center">
                        {isGraded ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                            ตัดเกรดแล้ว
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                            รอตัดเกรด
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </ProtectedLayout>
  );
}
