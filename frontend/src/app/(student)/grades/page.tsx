// ─── grades/page.tsx ─────────────────────────────────────────────────────────
"use client";

import { useEffect, useState } from "react";
import { gradeService } from "@/services/gradeService";
import type { MyGradesResponse } from "@/types";
import ProtectedLayout from "@/components/layout/ProtectedLayout";
import { TrendingUp } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";

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

function SummaryCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-5 py-4 shadow-sm ${highlight ? "bg-[#AC3520] border-[#AC3520] text-white" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/60"}`}
    >
      <p
        className={`text-[12px] ${highlight ? "text-white/70" : "text-slate-400"}`}
      >
        {label}
      </p>
      <p
        className={`text-2xl font-bold mt-1 ${highlight ? "text-white" : "text-slate-800 dark:text-slate-100"}`}
      >
        {value}
      </p>
    </div>
  );
}

export default function GradesPage() {
  const { accessToken, isLoading } = useAuth(); // ← เพิ่ม
  const [allGrades, setAllGrades] = useState<MyGradesResponse[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number>(0);

  useEffect(() => {
    if (isLoading || !accessToken) return; // ← รอ token ก่อน
    gradeService
      .getMyGrades(0, 0)
      .then((data) => {
        // API ส่ง object เดี่ยวมา ต้องห่อเป็น array
        const arr = Array.isArray(data) ? data : data ? [data] : [];
        setAllGrades(arr);
      })
      .catch(console.error);
  }, [isLoading, accessToken]);

  const current = allGrades[selectedIdx] ?? null; // ← กัน undefined

  return (
    <ProtectedLayout
      title="ผลการเรียน"
      subtitle="ประวัติเกรดทุกภาคการศึกษา"
      allowedRoles={["student"]}
    >
      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Select
            value={String(selectedIdx)}
            onValueChange={(v) => setSelectedIdx(Number(v))}
          >
            <SelectTrigger className="w-64 h-10">
              <SelectValue placeholder="เลือกภาคการศึกษา" />
            </SelectTrigger>
            <SelectContent>
              {allGrades.map(
                (
                  g,
                  i, // ← ไม่พังแล้วเพราะ allGrades เริ่มเป็น []
                ) => (
                  <SelectItem key={i} value={String(i)}>
                    ภาค {g.semester}/{g.academic_year}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        </div>
        {current ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <SummaryCard
                label="GPA ประจำเทอม"
                value={current.term_gpa.toFixed(2)}
                highlight
              />
              <SummaryCard
                label="หน่วยกิตรวม"
                value={`${current.total_credits} หน่วยกิต`}
              />
              <SummaryCard
                label="จำนวนวิชา"
                value={`${current.courses.length} วิชา`}
              />
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700/60">
                <h2 className="font-semibold text-slate-800 dark:text-slate-100 text-[15px]">
                  ภาคการศึกษาที่ {current.semester}/{current.academic_year}
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50">
                      {[
                        "รหัสวิชา",
                        "ชื่อวิชา",
                        "หน่วยกิต",
                        "เข้าเรียน",
                        "งาน",
                        "กลางภาค",
                        "ปลายภาค",
                        "รวม",
                        "เกรด",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-slate-500 dark:text-slate-400 font-medium border-b border-slate-100 dark:border-slate-700/40 whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40">
                    {current.courses.map((c) => (
                      <tr
                        key={c.course_id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
                          {c.course_id}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {c.course_name}
                        </td>
                        <td className="px-4 py-3 text-center text-slate-500">
                          {c.credits}
                        </td>
                        <td className="px-4 py-3 text-center text-slate-500">
                          {c.attendance ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-center text-slate-500">
                          {c.assignment ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-center text-slate-500">
                          {c.midterm ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-center text-slate-500">
                          {c.final ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-center text-slate-700 dark:text-slate-200 font-medium">
                          {c.total.toFixed(1)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={GRADE_COLOR[c.grade] ?? "text-slate-600"}
                          >
                            {c.grade || "—"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <TrendingUp size={40} className="mb-3 opacity-30" />
            <p>ยังไม่มีข้อมูลผลการเรียน</p>
          </div>
        )}
      </main>
    </ProtectedLayout>
  );
}
