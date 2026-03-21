"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { userService } from "@/services/userService";
import { gradeService } from "@/services/gradeService";
import type { GetMeResponse, ProfessorSectionResponse } from "@/types";
import ProtectedLayout from "@/components/layout/ProtectedLayout";
import Link from "next/link";
import {
  Users,
  BookOpen,
  ChevronRight,
  GraduationCap,
  ArrowUpRight,
} from "lucide-react";

function InfoCard({
  icon,
  label,
  value,
  accent,
  delay = 0,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
  delay?: number;
}) {
  return (
    <div
      className="relative rounded-[20px] p-5 overflow-hidden fade-up"
      style={{
        animationDelay: `${delay}ms`,
        background: "var(--glass-bg)",
        backdropFilter: "blur(16px) saturate(160%)",
        WebkitBackdropFilter: "blur(16px) saturate(160%)",
        border: "1px solid var(--glass-border-subtle)",
        boxShadow: "var(--glass-shadow)",
      }}
    >
      <div
        className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-20 -translate-y-6 translate-x-6"
        style={{ background: accent, filter: "blur(20px)" }}
      />
      <div className="relative z-10 flex items-center gap-4">
        <div
          className="w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0"
          style={{ background: `${accent}15`, border: `1px solid ${accent}25` }}
        >
          {icon}
        </div>
        <div>
          <p
            className="text-[11px] font-semibold uppercase tracking-wider mb-0.5"
            style={{
              color: "var(--muted-foreground)",
              letterSpacing: "0.06em",
            }}
          >
            {label}
          </p>
          <p
            className="text-[20px] font-bold leading-tight"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              letterSpacing: "-0.02em",
              color: "var(--foreground)",
            }}
          >
            {value}
          </p>
        </div>
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
      <main className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-thin">
        {/* ── Info Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <InfoCard
            icon={<GraduationCap size={20} style={{ color: "#AC3520" }} />}
            label="รหัสอาจารย์"
            value={me?.professor?.professor_id ?? "—"}
            accent="#AC3520"
            delay={50}
          />
          <InfoCard
            icon={<BookOpen size={20} style={{ color: "#10b981" }} />}
            label="รายวิชาที่สอน"
            value={`${sections.length} วิชา`}
            accent="#10b981"
            delay={100}
          />
          <InfoCard
            icon={<Users size={20} style={{ color: "#8b5cf6" }} />}
            label="นักศึกษาทั้งหมด"
            value={`${totalStudents} คน`}
            accent="#8b5cf6"
            delay={150}
          />
        </div>

        {/* ── Section List ── */}
        <div
          className="rounded-[20px] overflow-hidden fade-up fade-up-3"
          style={{
            background: "var(--glass-bg)",
            backdropFilter: "blur(16px) saturate(160%)",
            WebkitBackdropFilter: "blur(16px) saturate(160%)",
            border: "1px solid var(--glass-border-subtle)",
            boxShadow: "var(--glass-shadow)",
          }}
        >
          <div
            className="px-5 py-4 flex items-center justify-between"
            style={{ borderBottom: "1px solid var(--glass-border-subtle)" }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-1 h-4 rounded-full"
                style={{
                  background: "linear-gradient(180deg, #AC3520, #c94030)",
                }}
              />
              <h2
                className="font-semibold text-[14px]"
                style={{ letterSpacing: "-0.01em" }}
              >
                รายวิชาที่สอนภาคนี้
              </h2>
            </div>
            {sections.length > 0 && (
              <span
                className="pill"
                style={{ background: "rgba(16,185,129,0.1)", color: "#065f46" }}
              >
                {sections.length} วิชา
              </span>
            )}
          </div>

          <div>
            {sections.length === 0 ? (
              <div
                className="flex flex-col items-center py-16"
                style={{ color: "var(--muted-foreground)" }}
              >
                <BookOpen size={32} className="mb-3 opacity-20" />
                <p
                  className="text-[13px]"
                  style={{ fontFamily: "'Sarabun', sans-serif" }}
                >
                  ยังไม่มีรายวิชาที่สอน
                </p>
              </div>
            ) : (
              sections.map((sec, i) => (
                <Link
                  key={sec.section_id}
                  href={`/professor/grades/${sec.section_id}`}
                  className="flex items-center justify-between px-5 py-4 group transition-colors duration-150"
                  style={{
                    borderBottom:
                      i < sections.length - 1
                        ? "1px solid var(--glass-border-subtle)"
                        : "none",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "rgba(0,0,0,0.02)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
                      style={{
                        background: "rgba(172,53,32,0.08)",
                        border: "1px solid rgba(172,53,32,0.12)",
                      }}
                    >
                      <BookOpen size={15} style={{ color: "#AC3520" }} />
                    </div>
                    <div>
                      <p
                        className="font-semibold text-[13px] leading-tight"
                        style={{
                          color: "var(--foreground)",
                          fontFamily: "'DM Sans', sans-serif",
                        }}
                      >
                        {sec.course_id}{" "}
                        <span
                          className="font-normal text-[11px]"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          Sec {sec.section_num}
                        </span>
                      </p>
                      <p
                        className="text-[12px] mt-0.5"
                        style={{
                          color: "var(--muted-foreground)",
                          fontFamily: "'Sarabun', sans-serif",
                        }}
                      >
                        {sec.course_name} · ภาค {sec.semester}/
                        {sec.academic_year}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className="pill"
                      style={{
                        background: "rgba(139,92,246,0.08)",
                        color: "#5b21b6",
                      }}
                    >
                      <Users size={10} className="inline mr-1" />
                      {sec.total_student} คน
                    </span>
                    <ArrowUpRight
                      size={15}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: "#AC3520" }}
                    />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </main>
    </ProtectedLayout>
  );
}
