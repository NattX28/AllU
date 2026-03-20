"use client";

import { useCallback, useEffect, useState } from "react";
import dayjs from "dayjs";
import { useAuth } from "@/contexts/AuthContext";
import { enrollService } from "@/services/enrollService";
import type { EnrolledCourseResponse } from "@/types";
import ProtectedLayout from "@/components/layout/ProtectedLayout";
import { Button } from "@/components/ui/button";
import { Pencil, AlertTriangle, CalendarDays } from "lucide-react";

const STATUS_BADGE: Record<string, string> = {
  enrolled:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
  graded: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
  dropped: "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400",
};

const STATUS_LABEL: Record<string, string> = {
  enrolled: "ลงทะเบียนแล้ว",
  graded: "ได้เกรดแล้ว",
  dropped: "ถอนแล้ว",
};

export default function SchedulePage() {
  const { accessToken, isLoading } = useAuth();
  const [enrollments, setEnrollments] = useState<EnrolledCourseResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEnrollments = useCallback(() => {
    enrollService
      .getMyEnrollments("all")
      .then(setEnrollments)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (isLoading || !accessToken) return;
    fetchEnrollments();
  }, [isLoading, accessToken, fetchEnrollments]);

  const handleWithdraw = async (enrollment: EnrolledCourseResponse) => {
    const isPastDeadline = dayjs().isAfter(dayjs(enrollment.deadline));
    const msg = isPastDeadline
      ? `ถอนวิชา ${enrollment.course_id} (W) — จะปรากฏ W ในทรานสคริปต์`
      : `ยกเลิกการลงทะเบียน ${enrollment.course_id}?`;
    if (!confirm(msg)) return;
    setLoading(true);
    await enrollService.withdraw(enrollment.enrollment_id);
    fetchEnrollments();
  };

  return (
    <ProtectedLayout
      title="ตารางเรียน / จัดการวิชา"
      subtitle="แก้ไขกลุ่มเรียน หรือถอนวิชา"
      allowedRoles={["student"]}
    >
      <main className="flex-1 overflow-y-auto p-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50">
                  {[
                    "รหัสวิชา",
                    "ชื่อวิชา",
                    "กลุ่ม",
                    "เวลาเรียน",
                    "ภาค/ปี",
                    "Deadline",
                    "สถานะ",
                    "",
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
                {loading && (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-12 text-center text-slate-400 text-[13px]"
                    >
                      กำลังโหลด...
                    </td>
                  </tr>
                )}
                {!loading && enrollments.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-16 text-center text-slate-400"
                    >
                      <CalendarDays
                        size={32}
                        className="mx-auto mb-2 opacity-30"
                      />
                      ยังไม่มีวิชาที่ลงทะเบียน
                    </td>
                  </tr>
                )}
                {enrollments.map((e) => {
                  const deadline = dayjs(e.deadline);
                  const isPast = dayjs().isAfter(deadline);
                  const isActive = e.status === "enrolled";
                  return (
                    <tr
                      key={e.enrollment_id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium font-mono text-slate-800 dark:text-slate-100">
                        {e.course_id}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-48 truncate">
                        {e.course_name}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-500">
                        {e.section_num}
                      </td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {e.study_time}
                      </td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {e.semester}/{e.academic_year}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`text-[12px] ${isPast ? "text-red-500" : "text-slate-500"}`}
                        >
                          {deadline.format("DD/MM/YYYY")}
                        </span>
                        {isPast && isActive && (
                          <span className="ml-1 text-red-400 text-[10px]">
                            (ผ่านแล้ว)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_BADGE[e.status] ?? ""}`}
                        >
                          {STATUS_LABEL[e.status] ?? e.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {isActive && (
                          <div className="flex items-center gap-1.5 justify-end">
                            {!isPast && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-[11px] text-blue-600 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 gap-1"
                              >
                                <Pencil size={11} /> เปลี่ยนกลุ่ม
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className={`h-7 text-[11px] gap-1 ${isPast ? "text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20" : "text-orange-600 border-orange-200 hover:bg-orange-50 dark:hover:bg-orange-900/20"}`}
                              onClick={() => handleWithdraw(e)}
                            >
                              {isPast ? (
                                <>
                                  <AlertTriangle size={11} /> ถอนวิชา (W)
                                </>
                              ) : (
                                "ยกเลิก"
                              )}
                            </Button>
                          </div>
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
