"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { userService } from "@/services/userService";
import type { GetMeResponse } from "@/types";
import ProtectedLayout from "@/components/layout/ProtectedLayout";
import {
  User,
  Hash,
  GraduationCap,
  Building2,
  CalendarDays,
  MapPin,
} from "lucide-react";

export default function StudentProfilePage() {
  const { accessToken, isLoading } = useAuth();
  const [profile, setProfile] = useState<GetMeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoading || !accessToken) return;
    userService
      .getMe()
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [isLoading, accessToken]);

  const glassCard = {
    background: "var(--glass-bg)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: "1px solid var(--glass-border-subtle)",
    boxShadow: "var(--glass-shadow)",
  } as React.CSSProperties;

  const s = profile?.student;

  const fields: {
    icon: React.ReactNode;
    label: string;
    value?: string | number | null;
  }[] = [
    { icon: <Hash size={14} />, label: "รหัสนักศึกษา", value: s?.student_id },
    {
      icon: <GraduationCap size={14} />,
      label: "ชั้นปี",
      value: s?.year ? `ปีที่ ${s.year}` : null,
    },
    { icon: <Building2 size={14} />, label: "คณะ", value: s?.faculty },
    { icon: <Building2 size={14} />, label: "สาขาวิชา", value: s?.major },
    {
      icon: <CalendarDays size={14} />,
      label: "ปีที่เข้า",
      value: s?.entry_year,
    },
    { icon: <MapPin size={14} />, label: "ที่อยู่", value: s?.address },
  ];

  return (
    <ProtectedLayout
      title="โปรไฟล์"
      subtitle="ข้อมูลส่วนตัว"
      allowedRoles={["student"]}
    >
      <main className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div
              className="w-8 h-8 rounded-full border-2 animate-spin"
              style={{
                borderColor: "var(--glass-border-subtle)",
                borderTopColor: "#AC3520",
              }}
            />
          </div>
        ) : (
          <div className="max-w-lg space-y-4 fade-up">
            {/* Avatar + Name */}
            <div
              className="rounded-[22px] p-6 flex items-center gap-5"
              style={glassCard}
            >
              <div
                className="w-16 h-16 rounded-[18px] flex items-center justify-center flex-shrink-0"
                style={{
                  background: "rgba(172,53,32,0.08)",
                  border: "1px solid rgba(172,53,32,0.15)",
                }}
              >
                <User size={28} style={{ color: "#AC3520", opacity: 0.7 }} />
              </div>
              <div>
                <p
                  className="text-[18px] font-semibold leading-tight"
                  style={{
                    color: "var(--foreground)",
                    fontFamily: "var(--font-dm-sans,'DM Sans',sans-serif)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {profile?.name ?? "—"}
                </p>
                <p
                  className="text-[12px] mt-1"
                  style={{
                    color: "var(--muted-foreground)",
                    fontFamily: "var(--font-sarabun,'Sarabun',sans-serif)",
                  }}
                >
                  นักศึกษา · GPAX {s?.gpax?.toFixed(2) ?? "—"}
                </p>
              </div>
            </div>

            {/* Info fields */}
            <div className="rounded-[22px] overflow-hidden" style={glassCard}>
              {fields.map((f, i) => (
                <div
                  key={f.label}
                  className="flex items-start gap-4 px-5 py-4"
                  style={{
                    borderBottom:
                      i < fields.length - 1
                        ? "1px solid var(--glass-border-subtle)"
                        : "none",
                  }}
                >
                  <span
                    className="mt-0.5 flex-shrink-0"
                    style={{ color: "#AC3520", opacity: 0.6 }}
                  >
                    {f.icon}
                  </span>
                  <span
                    className="text-[12px] w-28 flex-shrink-0"
                    style={{
                      color: "var(--muted-foreground)",
                      fontFamily: "var(--font-sarabun,'Sarabun',sans-serif)",
                    }}
                  >
                    {f.label}
                  </span>
                  <span
                    className="text-[13px] font-medium break-all"
                    style={{
                      color: "var(--foreground)",
                      fontFamily: "var(--font-dm-mono,'DM Mono',monospace)",
                    }}
                  >
                    {f.value ?? "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </ProtectedLayout>
  );
}
