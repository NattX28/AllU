"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { courseService } from "@/services/courseService";
import { enrollService } from "@/services/enrollService";
import type {
  CourseResponse,
  SectionResponse,
  CheckSeatsResponse,
} from "@/types";
import ProtectedLayout from "@/components/layout/ProtectedLayout";
import {
  Search,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const MAX_CREDITS = 22;

interface CartItem {
  course: CourseResponse;
  section: SectionResponse;
}

export default function RegistrationPage() {
  const { accessToken, isLoading } = useAuth();
  const [courses, setCourses] = useState<CourseResponse[]>([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [seats, setSeats] = useState<Record<string, CheckSeatsResponse>>({});
  const [confirming, setConfirming] = useState(false);
  const [confirmResult, setConfirmResult] = useState<string | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isLoading || !accessToken) return;
    courseService.getAll().then(setCourses).catch(console.error);
  }, [isLoading, accessToken]);

  const pollSeats = useCallback(async () => {
    if (cart.length === 0) return;
    const ids = cart.map((i) => i.section.id);
    try {
      const res = await enrollService.checkSeats(ids);
      const map: Record<string, CheckSeatsResponse> = {};
      res.forEach((r) => (map[r.section_id] = r));
      setSeats(map);
    } catch {
      /* ignore */
    }
  }, [cart]);

  useEffect(() => {
    pollSeats();
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(pollSeats, 10_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [pollSeats]);

  const addToCart = (course: CourseResponse, section: SectionResponse) => {
    if (cart.find((c) => c.section.id === section.id)) return;
    setCart((prev) => [...prev, { course, section }]);
  };
  const removeFromCart = (sectionId: string) =>
    setCart((prev) => prev.filter((c) => c.section.id !== sectionId));
  const totalCredits = cart.reduce((sum, c) => sum + c.course.credits, 0);

  const handleConfirm = async () => {
    setConfirming(true);
    setConfirmResult(null);
    try {
      const res = await enrollService.confirm(cart.map((c) => c.section.id));
      setConfirmResult(
        `✅ ลงทะเบียนสำเร็จ ${res.enrolled_ids.length} วิชา (${res.total_credits} หน่วยกิต)`,
      );
      setCart([]);
    } catch {
      setConfirmResult("❌ เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setConfirming(false);
    }
  };

  const filtered = courses.filter(
    (c) =>
      c.id.toLowerCase().includes(search.toLowerCase()) ||
      c.name_en.toLowerCase().includes(search.toLowerCase()) ||
      c.name_th.includes(search),
  );

  return (
    <ProtectedLayout
      title="ลงทะเบียนเรียน"
      subtitle="เพิ่มวิชาลงตะกร้า แล้วยืนยันพร้อมกัน"
      allowedRoles={["student"]}
    >
      <main className="flex-1 overflow-hidden flex gap-4 p-6">
        {/* ── Left: Course Search ── */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-sm">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700/60">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <Input
                placeholder="ค้นหารหัสวิชา หรือชื่อวิชา..."
                className="pl-9 h-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/40">
            {filtered.map((course) => (
              <div key={course.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-100 text-[14px]">
                      {course.id}
                    </span>
                    <Badge variant="outline" className="ml-2 text-[11px]">
                      {course.credits} หน่วยกิต
                    </Badge>
                    <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {course.name_th} / {course.name_en}
                    </p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {(course.sections ?? []).map((sec) => {
                    const inCart = cart.some((c) => c.section.id === sec.id);
                    return (
                      <div
                        key={sec.id}
                        className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2 text-[12px]"
                      >
                        <div className="flex items-center gap-4 text-slate-600 dark:text-slate-300">
                          <span className="font-medium">
                            Sec {sec.section_num}
                          </span>
                          <span>{sec.study_time}</span>
                          <span>{sec.professor_name}</span>
                          <span
                            className={
                              sec.available === 0
                                ? "text-red-500 font-medium"
                                : "text-emerald-600"
                            }
                          >
                            {sec.available}/{sec.capacity} ที่นั่ง
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant={inCart ? "secondary" : "default"}
                          className={`h-7 text-[11px] ${!inCart ? "bg-[#AC3520] hover:bg-[#922d1a] text-white" : ""}`}
                          disabled={inCart || sec.available === 0}
                          onClick={() => addToCart(course, sec)}
                        >
                          {inCart ? (
                            "อยู่ในตะกร้า"
                          ) : (
                            <>
                              <Plus size={12} className="mr-1" />
                              เพิ่ม
                            </>
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Search size={32} className="mb-3 opacity-30" />
                <p className="text-[13px]">ไม่พบวิชาที่ค้นหา</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Cart ── */}
        <div className="w-80 flex flex-col gap-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-[14px]">
                ตะกร้าลงทะเบียน
              </h3>
              <span
                className={`text-[12px] font-medium ${totalCredits > MAX_CREDITS ? "text-red-500" : "text-slate-500"}`}
              >
                {totalCredits}/{MAX_CREDITS} หน่วยกิต
              </span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-700/40 min-h-[80px]">
              {cart.length === 0 && (
                <p className="text-center text-[12px] text-slate-400 py-6">
                  ยังไม่มีวิชาในตะกร้า
                </p>
              )}
              {cart.map((item) => {
                const seatInfo = seats[item.section.id];
                const isFull = seatInfo?.is_full ?? false;
                return (
                  <div
                    key={item.section.id}
                    className={`px-4 py-3 ${isFull ? "bg-red-50 dark:bg-red-900/10" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[13px] text-slate-800 dark:text-slate-100 truncate">
                          {item.course.id} Sec {item.section.section_num}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {item.course.name_th}
                        </p>
                        {isFull && (
                          <p className="text-[11px] text-red-500 flex items-center gap-1 mt-0.5">
                            <AlertCircle size={11} /> ที่นั่งเต็ม
                          </p>
                        )}
                        {seatInfo && !isFull && (
                          <p className="text-[11px] text-emerald-600 flex items-center gap-1 mt-0.5">
                            <CheckCircle2 size={11} /> ว่าง {seatInfo.available}{" "}
                            ที่
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => removeFromCart(item.section.id)}
                        className="text-slate-400 hover:text-red-500 flex-shrink-0 mt-0.5"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            {cart.length > 0 && (
              <div className="px-4 pb-2">
                <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 mt-2">
                  <div
                    className={`h-1.5 rounded-full transition-all ${totalCredits > MAX_CREDITS ? "bg-red-500" : "bg-[#AC3520]"}`}
                    style={{
                      width: `${Math.min((totalCredits / MAX_CREDITS) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
            <div className="p-4 pt-3 border-t border-slate-100 dark:border-slate-700/60">
              <Button
                className="w-full bg-[#AC3520] hover:bg-[#922d1a] text-white h-10 font-medium"
                disabled={
                  cart.length === 0 ||
                  totalCredits > MAX_CREDITS ||
                  confirming ||
                  cart.some((c) => seats[c.section.id]?.is_full)
                }
                onClick={handleConfirm}
              >
                {confirming ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" />{" "}
                    กำลังยืนยัน...
                  </span>
                ) : (
                  `ยืนยันลงทะเบียน (${cart.length} วิชา)`
                )}
              </Button>
              {totalCredits > MAX_CREDITS && (
                <p className="text-[11px] text-red-500 text-center mt-2">
                  ⚠ หน่วยกิตเกิน {MAX_CREDITS} หน่วยกิต
                </p>
              )}
            </div>
          </div>
          {confirmResult && (
            <div
              className={`rounded-xl border px-4 py-3 text-[13px] ${confirmResult.startsWith("✅") ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-600"}`}
            >
              {confirmResult}
            </div>
          )}
        </div>
      </main>
    </ProtectedLayout>
  );
}
