"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { userService } from "@/services/userService";
import { gradeService } from "@/services/gradeService";
import type { GetMeResponse, ProfessorSectionResponse } from "@/types";
import ProtectedLayout from "@/components/layout/ProtectedLayout";
import Link from "next/link";
import { Users, BookOpen, ChevronRight, GraduationCap } from "lucide-react";

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

export default function ProfessorDashboard() {
  const { accessToken, isLoading } = useAuth();
  const [me, setMe] = useState<GetMeResponse | null>(null);
  const [sections, setSections] = useState<ProfessorSectionResponse[]>([]);

  useEffect(() => {
    if (isLoading || !accessToken) return;
    userService.getMe().then(setMe).catch(console.error);
    gradeService.getProfessorSections().then(setSections).catch(console.error);
  }, [isLoading, accessToken]);

  const totalStudents = sections.reduce((sum, s) => sum + s.total_student, 0);

  return (
    <ProtectedLayout
      title="Dashboard"
      subtitle={`ยินดีต้อนรับ, ${me?.name ?? "—"}`}
      allowedRoles={["professor"]}
    >
      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* ── Info Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <InfoCard
            icon={<GraduationCap size={20} className="text-[#AC3520]" />}
            label="รหัสอาจารย์"
            value={me?.professor?.professor_id ?? "—"}
          />
          <InfoCard
            icon={<BookOpen size={20} className="text-emerald-600" />}
            label="รายวิชาที่สอน"
            value={`${sections.length} วิชา`}
          />
          <InfoCard
            icon={<Users size={20} className="text-violet-600" />}
            label="นักศึกษาทั้งหมด"
            value={`${totalStudents} คน`}
          />
        </div>

        {/* ── Section List ── */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700/60">
            <h2 className="font-semibold text-slate-800 dark:text-slate-100 text-[15px]">
              รายวิชาที่สอนภาคนี้
            </h2>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700/40">
            {sections.length === 0 && (
              <div className="flex flex-col items-center py-16 text-slate-400">
                <BookOpen size={32} className="mb-3 opacity-30" />
                <p className="text-[13px]">ยังไม่มีรายวิชาที่สอน</p>
              </div>
            )}
            {sections.map((sec) => (
              <Link
                key={sec.section_id}
                href={`/professor/grades/${sec.section_id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                    <BookOpen size={16} className="text-slate-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-100 text-[14px]">
                      {sec.course_id}{" "}
                      <span className="font-normal text-slate-400 text-[12px]">
                        Sec {sec.section_num}
                      </span>
                    </p>
                    <p className="text-[12px] text-slate-500 dark:text-slate-400">
                      {sec.course_name} · ภาค {sec.semester}/{sec.academic_year}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[12px] text-slate-400 flex items-center gap-1">
                    <Users size={12} />
                    {sec.total_student} คน
                  </span>
                  <ChevronRight
                    size={16}
                    className="text-slate-300 group-hover:text-[#AC3520] transition-colors"
                  />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </ProtectedLayout>
  );
}
