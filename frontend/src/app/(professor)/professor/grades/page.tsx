"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { gradeService } from "@/services/gradeService";
import type { ProfessorSectionResponse } from "@/types";
import ProtectedLayout from "@/components/layout/ProtectedLayout";
import { Users, ArrowUpRight, BookOpen } from "lucide-react";

const ACCENT_COLORS = [
  "#AC3520",
  "#3b82f6",
  "#10b981",
  "#8b5cf6",
  "#f59e0b",
  "#ec4899",
];

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
      <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sections.map((sec, i) => {
            const accent = ACCENT_COLORS[i % ACCENT_COLORS.length];
            return (
              <Link
                key={sec.section_id}
                href={`/professor/grades/${sec.section_id}`}
                className="relative rounded-[20px] p-5 overflow-hidden group fade-up"
                style={{
                  animationDelay: `${i * 40}ms`,
                  background: "var(--glass-bg)",
                  backdropFilter: "blur(16px) saturate(160%)",
                  WebkitBackdropFilter: "blur(16px) saturate(160%)",
                  border: "1px solid var(--glass-border-subtle)",
                  boxShadow: "var(--glass-shadow)",
                  transition:
                    "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
                  textDecoration: "none",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.transform = "translateY(-2px)";
                  el.style.boxShadow = "var(--glass-shadow-lg)";
                  el.style.borderColor = `${accent}40`;
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.transform = "translateY(0)";
                  el.style.boxShadow = "var(--glass-shadow)";
                  el.style.borderColor = "var(--glass-border-subtle)";
                }}
              >
                {/* Accent glow */}
                <div
                  className="absolute top-0 right-0 w-28 h-28 rounded-full opacity-15 -translate-y-10 translate-x-10"
                  style={{ background: accent, filter: "blur(28px)" }}
                />

                {/* Top row */}
                <div className="flex items-start justify-between mb-4 relative z-10">
                  <div
                    className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0"
                    style={{
                      background: `${accent}15`,
                      border: `1px solid ${accent}25`,
                    }}
                  >
                    <BookOpen size={16} style={{ color: accent }} />
                  </div>
                  <ArrowUpRight
                    size={16}
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 mt-0.5"
                    style={{ color: accent }}
                  />
                </div>

                {/* Course info */}
                <div className="relative z-10">
                  <p
                    className="font-bold text-[15px] leading-tight mb-0.5"
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      letterSpacing: "-0.02em",
                      color: "var(--foreground)",
                    }}
                  >
                    {sec.course_id}
                  </p>
                  <p
                    className="text-[12px] mb-4 line-clamp-1"
                    style={{
                      color: "var(--muted-foreground)",
                      fontFamily: "'Sarabun', sans-serif",
                    }}
                  >
                    {sec.course_name}
                  </p>

                  {/* Tags */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="pill"
                      style={{ background: `${accent}10`, color: accent }}
                    >
                      Sec {sec.section_num}
                    </span>
                    <span
                      className="pill"
                      style={{
                        background: "rgba(0,0,0,0.04)",
                        color: "var(--muted-foreground)",
                      }}
                    >
                      ภาค {sec.semester}/{sec.academic_year}
                    </span>
                    <span
                      className="pill ml-auto"
                      style={{
                        background: "rgba(139,92,246,0.08)",
                        color: "#5b21b6",
                      }}
                    >
                      <Users size={10} className="inline mr-1" />
                      {sec.total_student}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}

          {sections.length === 0 && (
            <div
              className="col-span-3 flex flex-col items-center py-24"
              style={{ color: "var(--muted-foreground)" }}
            >
              <Users size={40} className="mb-3 opacity-20" />
              <p
                className="text-[14px] font-medium"
                style={{ fontFamily: "'Sarabun', sans-serif" }}
              >
                ยังไม่มีรายวิชาที่สอน
              </p>
            </div>
          )}
        </div>
      </main>
    </ProtectedLayout>
  );
}
