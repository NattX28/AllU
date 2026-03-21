"use client";

import { useEffect, useState, useCallback } from "react";
import { courseService } from "@/services/courseService";
import api from "@/lib/axios";
import type {
  CourseResponse,
  SectionResponse,
  SectionSchedule,
  CreateSectionRequest,
  UpdateSectionRequest,
  GetMeResponse,
} from "@/types";
import ProtectedLayout from "@/components/layout/ProtectedLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Layers, Loader2, Search, X } from "lucide-react";

type FlatSection = SectionResponse & { courseId: string; courseName: string };

// ─── Professor picker ─────────────────────────────────────────
function ProfessorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<GetMeResponse[]>([]);
  const [selectedName, setSelectedName] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const doSearch = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const res = await api.get<{ total: number; data: GetMeResponse[] }>(
        "/admin/users",
        { params: { role: "professor", search: q, limit: 20 } },
      );
      setResults(res.data.data ?? []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) doSearch(search);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => doSearch(search), 300);
    return () => clearTimeout(t);
  }, [search, open]);

  const handleSelect = (prof: GetMeResponse) => {
    const profileId = prof.professor?.profile_id ?? "";
    setSelectedName(`${prof.name} (${prof.professor?.professor_id ?? ""})`);
    onChange(profileId);
    setOpen(false);
  };

  return (
    <div className="space-y-1">
      <Label className="text-xs text-slate-500">อาจารย์ผู้สอน</Label>
      <div
        className="flex h-9 w-full items-center rounded-md border border-input bg-background px-3 text-[13px] cursor-pointer gap-2 hover:border-slate-400 transition-colors"
        onClick={() => setOpen(true)}
      >
        <Search size={13} className="text-slate-400 shrink-0" />
        <span
          className={
            selectedName
              ? "text-slate-800 dark:text-slate-100 flex-1 truncate"
              : "text-slate-400 flex-1"
          }
        >
          {selectedName || "ค้นหาชื่ออาจารย์..."}
        </span>
        {selectedName && (
          <button
            className="text-slate-400 hover:text-slate-600"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedName("");
              onChange("");
            }}
          >
            <X size={13} />
          </button>
        )}
      </div>
      {value && (
        <p className="text-[11px] text-slate-400 font-mono truncate">
          UUID: {value}
        </p>
      )}

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg">
            <div className="p-2 border-b border-slate-100 dark:border-slate-700/60">
              <div className="relative">
                <Search
                  size={13}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  autoFocus
                  className="w-full h-8 pl-7 pr-3 text-[13px] bg-slate-50 dark:bg-slate-800 rounded-md border-0 outline-none"
                  placeholder="ค้นหาชื่อ..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-6 text-slate-400">
                <Loader2 size={16} className="animate-spin mr-2" />
                <span className="text-[13px]">กำลังโหลด...</span>
              </div>
            ) : results.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-slate-400">
                ไม่พบอาจารย์
              </p>
            ) : (
              results.map((prof) => (
                <div
                  key={prof.id}
                  className="px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  onClick={() => handleSelect(prof)}
                >
                  <p className="text-[13px] font-medium text-slate-800 dark:text-slate-100">
                    {prof.name}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {prof.professor?.professor_id} ·{" "}
                    {prof.professor?.department}
                  </p>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Schedule row editor ──────────────────────────────────────
interface ScheduleRow {
  day: string;
  start_time: string;
  end_time: string;
  room: string;
  type: "LECTURE" | "LAB";
}

const DAY_OPTIONS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const emptySchedule = (): ScheduleRow => ({
  day: "MON",
  start_time: "09:00",
  end_time: "12:00",
  room: "",
  type: "LECTURE",
});

// ─── Section Modal ────────────────────────────────────────────
function SectionModal({
  open,
  onClose,
  onSave,
  courses,
  editSection,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (
    data: CreateSectionRequest | UpdateSectionRequest,
    isEdit: boolean,
    secId?: string,
  ) => Promise<void>;
  courses: CourseResponse[];
  editSection?: FlatSection;
}) {
  const isEdit = !!editSection;
  const [saving, setSaving] = useState(false);
  const [courseId, setCourseId] = useState(editSection?.courseId ?? "");
  const [professorId, setProfessorId] = useState("");
  const [schedules, setSchedules] = useState<ScheduleRow[]>([emptySchedule()]);
  const [form, setForm] = useState({
    section_num: editSection?.section_num ?? 1,
    semester: editSection?.semester ?? 1,
    academic_year: editSection?.academic_year ?? new Date().getFullYear() + 543,
    capacity: editSection?.capacity ?? 40,
  });

  // Reset on open
  useEffect(() => {
    if (open) {
      setCourseId(editSection?.courseId ?? "");
      setProfessorId("");
      setSchedules([emptySchedule()]);
      setForm({
        section_num: editSection?.section_num ?? 1,
        semester: editSection?.semester ?? 1,
        academic_year:
          editSection?.academic_year ?? new Date().getFullYear() + 543,
        capacity: editSection?.capacity ?? 40,
      });
    }
  }, [open, editSection]);

  const set = (k: string, v: number) => setForm((p) => ({ ...p, [k]: v }));

  const updateSchedule = (idx: number, key: keyof ScheduleRow, val: string) => {
    setSchedules((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, [key]: val } : s)),
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isEdit) {
        const payload: UpdateSectionRequest = {
          section_num: form.section_num || undefined,
          capacity: form.capacity || undefined,
          professor_id: professorId || undefined,
          schedules: schedules.some((s) => s.room)
            ? schedules.map((s) => ({
                day: s.day as SectionSchedule["day"],
                start_time: s.start_time,
                end_time: s.end_time,
                room: s.room,
                type: s.type,
              }))
            : undefined,
        };
        await onSave(payload, true, editSection?.id);
      } else {
        const payload: CreateSectionRequest = {
          course_id: courseId,
          section_num: form.section_num,
          semester: form.semester,
          academic_year: form.academic_year,
          capacity: form.capacity,
          professor_id: professorId,
          schedules: schedules.map((s) => ({
            day: s.day as SectionSchedule["day"],
            start_time: s.start_time,
            end_time: s.end_time,
            room: s.room,
            type: s.type,
          })),
        };
        await onSave(payload, false);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "แก้ไขกลุ่มเรียน" : "เพิ่มกลุ่มเรียน"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Course selector */}
          {!isEdit && (
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">วิชา</Label>
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger className="h-9 text-[13px]">
                  <SelectValue placeholder="เลือกวิชา" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.id} — {c.name_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Basic info */}
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                ["กลุ่มเรียนที่", "section_num"],
                ["จำนวนที่นั่ง", "capacity"],
                ...(isEdit
                  ? []
                  : [
                      ["ภาค", "semester"],
                      ["ปีการศึกษา (พ.ศ.)", "academic_year"],
                    ]),
              ] as [string, string][]
            ).map(([label, key]) => (
              <div key={key} className="space-y-1">
                <Label className="text-xs text-slate-500">{label}</Label>
                <Input
                  type="number"
                  className="h-9 text-[13px]"
                  value={(form as Record<string, number>)[key]}
                  onChange={(e) => set(key, Number(e.target.value))}
                />
              </div>
            ))}
          </div>

          {/* Professor picker */}
          <div className="relative">
            <ProfessorPicker
              value={professorId}
              onChange={(id) => setProfessorId(id)}
            />
          </div>

          {/* Schedules */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-slate-500">ตารางเรียน</Label>
              <button
                type="button"
                className="text-[12px] text-[#AC3520] hover:underline flex items-center gap-1"
                onClick={() => setSchedules((p) => [...p, emptySchedule()])}
              >
                <Plus size={12} /> เพิ่มช่วงเวลา
              </button>
            </div>

            {schedules.map((sch, idx) => (
              <div
                key={idx}
                className="grid grid-cols-5 gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg items-end"
              >
                {/* Day */}
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-400">วัน</Label>
                  <Select
                    value={sch.day}
                    onValueChange={(v) => updateSchedule(idx, "day", v)}
                  >
                    <SelectTrigger className="h-8 text-[12px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAY_OPTIONS.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Start */}
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-400">เริ่ม</Label>
                  <Input
                    className="h-8 text-[12px]"
                    placeholder="09:00"
                    value={sch.start_time}
                    onChange={(e) =>
                      updateSchedule(idx, "start_time", e.target.value)
                    }
                  />
                </div>

                {/* End */}
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-400">สิ้นสุด</Label>
                  <Input
                    className="h-8 text-[12px]"
                    placeholder="12:00"
                    value={sch.end_time}
                    onChange={(e) =>
                      updateSchedule(idx, "end_time", e.target.value)
                    }
                  />
                </div>

                {/* Room */}
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-400">ห้อง</Label>
                  <Input
                    className="h-8 text-[12px]"
                    placeholder="CB4201"
                    value={sch.room}
                    onChange={(e) =>
                      updateSchedule(idx, "room", e.target.value)
                    }
                  />
                </div>

                {/* Type + delete */}
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-400">ประเภท</Label>
                  <div className="flex gap-1">
                    <Select
                      value={sch.type}
                      onValueChange={(v) => updateSchedule(idx, "type", v)}
                    >
                      <SelectTrigger className="h-8 text-[12px] flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LECTURE">LEC</SelectItem>
                        <SelectItem value="LAB">LAB</SelectItem>
                      </SelectContent>
                    </Select>
                    {schedules.length > 1 && (
                      <button
                        className="h-8 w-8 flex items-center justify-center text-slate-400 hover:text-red-500 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        onClick={() =>
                          setSchedules((p) => p.filter((_, i) => i !== idx))
                        }
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="h-9 text-[13px]"
          >
            ยกเลิก
          </Button>
          <Button
            className="bg-[#AC3520] hover:bg-[#922d1a] text-white h-9 text-[13px]"
            onClick={handleSave}
            disabled={saving || (!isEdit && !courseId) || !professorId}
          >
            {saving && <Loader2 size={13} className="animate-spin mr-1" />}
            {isEdit ? "บันทึก" : "สร้าง"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────
export default function AdminSectionsPage() {
  const [courses, setCourses] = useState<CourseResponse[]>([]);
  const [filterCourse, setFilterCourse] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<FlatSection | undefined>();

  const fetchCourses = () =>
    courseService.getAll().then(setCourses).catch(console.error);

  useEffect(() => {
    fetchCourses();
  }, []);

  const allSections: FlatSection[] = courses.flatMap((c) =>
    (c.sections ?? []).map((s) => ({
      ...s,
      courseId: c.id,
      courseName: c.name_en,
    })),
  );
  const filtered =
    filterCourse === "all"
      ? allSections
      : allSections.filter((s) => s.courseId === filterCourse);

  const handleSave = async (
    data: CreateSectionRequest | UpdateSectionRequest,
    isEdit: boolean,
    secId?: string,
  ) => {
    if (isEdit && secId)
      await courseService.updateSection(secId, data as UpdateSectionRequest);
    else await courseService.createSection(data as CreateSectionRequest);
    fetchCourses();
  };

  return (
    <ProtectedLayout
      title="จัดการกลุ่มเรียน"
      subtitle={`${allSections.length} กลุ่มทั้งหมด`}
      allowedRoles={["admin"]}
    >
      <main className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Select value={filterCourse} onValueChange={setFilterCourse}>
            <SelectTrigger className="w-56 h-9 text-[13px]">
              <SelectValue placeholder="กรองตามวิชา" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกวิชา</SelectItem>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.id} — {c.name_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            className="ml-auto bg-[#AC3520] hover:bg-[#922d1a] text-white h-9 text-[13px] gap-1.5"
            onClick={() => {
              setEditTarget(undefined);
              setModalOpen(true);
            }}
          >
            <Plus size={14} /> เพิ่มกลุ่มเรียน
          </Button>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50">
                  {[
                    "วิชา",
                    "กลุ่มที่",
                    "ภาค/ปี",
                    "ตารางเรียน",
                    "อาจารย์",
                    "ที่นั่ง",
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
                {filtered.map((s) => {
                  const pct = ((s.capacity - s.available) / s.capacity) * 100;
                  const full = s.available === 0;
                  // Build schedule summary from schedules array
                  const scheduleStr =
                    s.schedules
                      ?.map(
                        (sch) => `${sch.day} ${sch.start_time}-${sch.end_time}`,
                      )
                      .join(", ") ?? "—";
                  return (
                    <tr
                      key={s.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800 dark:text-slate-100">
                          {s.courseId}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate max-w-32">
                          {s.courseName}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-center font-medium">
                        {s.section_num}
                      </td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {s.semester}/{s.academic_year}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-[12px] whitespace-nowrap">
                        {scheduleStr}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-[12px] truncate max-w-32">
                        {s.professor_name}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${full ? "bg-red-500" : "bg-[#AC3520]"}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span
                            className={`text-[12px] whitespace-nowrap ${full ? "text-red-500 font-medium" : "text-slate-500"}`}
                          >
                            {s.available}/{s.capacity}
                          </span>
                          {full && (
                            <Badge
                              variant="destructive"
                              className="text-[10px] py-0"
                            >
                              เต็ม
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700"
                            onClick={() => {
                              setEditTarget(s);
                              setModalOpen(true);
                            }}
                          >
                            <Pencil size={13} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-slate-400 hover:text-red-500"
                            onClick={async () => {
                              if (confirm("ลบกลุ่มเรียนนี้?")) {
                                await courseService.deleteSection(s.id);
                                fetchCourses();
                              }
                            }}
                          >
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-16 text-center text-slate-400"
                    >
                      <Layers size={32} className="mx-auto mb-2 opacity-30" />
                      ไม่พบกลุ่มเรียน
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <SectionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        courses={courses}
        editSection={editTarget}
      />
    </ProtectedLayout>
  );
}
