"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { gradeService } from "@/services/gradeService";
import type { ProfessorSectionResponse } from "@/types";
import ProtectedLayout from "@/components/layout/ProtectedLayout";
import { Users, ChevronRight } from "lucide-react";

export default function ProfessorGradesPage() {
  const { accessToken, isLoading } = useAuth();
  const [sections, setSections] = useState<ProfessorSectionResponse[]>([]);

  useEffect(() => {
    if (isLoading || !accessToken) return;
    gradeService.getProfessorSections().then(setSections).catch(console.error);
  }, [isLoading, accessToken]);

  return (
    <ProtectedLayout
      title="รายวิชาที่สอน"
      subtitle="เลือกกลุ่มเรียนเพื่อกรอกคะแนน"
      allowedRoles={["professor"]}
    >
      <main className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sections.map((sec) => (
            <Link
              key={sec.section_id}
              href={`/professor/grades/${sec.section_id}`}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-sm p-5 hover:border-[#AC3520] hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-100 text-[15px]">
                    {sec.course_id}
                  </p>
                  <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                    {sec.course_name}
                  </p>
                </div>
                <ChevronRight
                  size={18}
                  className="text-slate-300 group-hover:text-[#AC3520] transition-colors flex-shrink-0 mt-0.5"
                />
              </div>
              <div className="flex items-center gap-4 text-[12px] text-slate-500">
                <span>Sec {sec.section_num}</span>
                <span>
                  ภาค {sec.semester}/{sec.academic_year}
                </span>
                <span className="flex items-center gap-1">
                  <Users size={12} />
                  {sec.total_student} คน
                </span>
              </div>
            </Link>
          ))}
          {sections.length === 0 && (
            <div className="col-span-3 flex flex-col items-center py-20 text-slate-400">
              <Users size={40} className="mb-3 opacity-30" />
              <p className="text-[13px]">ยังไม่มีรายวิชาที่สอน</p>
            </div>
          )}
        </div>
      </main>
    </ProtectedLayout>
  );
}
