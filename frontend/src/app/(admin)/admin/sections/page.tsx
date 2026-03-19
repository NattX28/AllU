"use client";

import { useEffect, useState } from "react";
import { courseService } from "@/services/courseService";
import type {
  CourseResponse,
  SectionResponse,
  CreateSectionRequest,
  UpdateSectionRequest,
} from "@/types";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
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
import { Plus, Pencil, Trash2, Layers, Loader2 } from "lucide-react";

type FlatSection = SectionResponse & { courseId: string; courseName: string };

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
  const [form, setForm] = useState({
    section_num: editSection?.section_num ?? 1,
    semester: editSection?.semester ?? 1,
    academic_year: editSection?.academic_year ?? new Date().getFullYear() + 543,
    capacity: editSection?.capacity ?? 40,
    study_time: editSection?.study_time ?? "",
    deadline: "",
    professor_id: "",
  });
  const set = (k: string, v: string | number) =>
    setForm((p) => ({ ...p, [k]: v }));
  const handleSave = async () => {
    setSaving(true);
    try {
      if (isEdit)
        await onSave(
          {
            section_num: form.section_num || undefined,
            capacity: form.capacity || undefined,
            study_time: form.study_time || undefined,
            deadline: form.deadline || undefined,
            professor_id: form.professor_id || undefined,
          },
          true,
          editSection?.id,
        );
      else
        await onSave(
          {
            course_id: courseId,
            section_num: form.section_num,
            semester: form.semester,
            academic_year: form.academic_year,
            capacity: form.capacity,
            study_time: form.study_time,
            deadline: form.deadline,
            professor_id: form.professor_id,
          },
          false,
        );
      onClose();
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "แก้ไขกลุ่มเรียน" : "เพิ่มกลุ่มเรียน"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          {!isEdit && (
            <div className="col-span-2 space-y-1">
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
          {[
            ["กลุ่มเรียนที่", "section_num"],
            ["ภาค", "semester"],
            ["ปีการศึกษา (พ.ศ.)", "academic_year"],
            ["จำนวนที่นั่ง", "capacity"],
          ].map(([label, key]) => (
            <div key={key} className="space-y-1">
              <Label className="text-xs text-slate-500">{label}</Label>
              <Input
                type="number"
                className="h-9 text-[13px]"
                value={(form as Record<string, number | string>)[key]}
                onChange={(e) => set(key, Number(e.target.value))}
              />
            </div>
          ))}
          {[
            ["เวลาเรียน", "study_time", "เช่น จ 09:00-12:00"],
            ["Deadline", "deadline", "2025-09-15T23:59:59Z"],
            ["Professor UUID", "professor_id", "550e8400-..."],
          ].map(([label, key, ph]) => (
            <div
              key={key}
              className={`space-y-1 ${key === "professor_id" ? "col-span-2" : ""}`}
            >
              <Label className="text-xs text-slate-500">{label}</Label>
              <Input
                className="h-9 text-[13px]"
                placeholder={ph}
                value={(form as Record<string, number | string>)[key]}
                onChange={(e) => set(key, e.target.value)}
              />
            </div>
          ))}
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
            disabled={saving}
          >
            {saving && <Loader2 size={13} className="animate-spin mr-1" />}
            {isEdit ? "บันทึก" : "สร้าง"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminSectionsPage() {
  const [courses, setCourses] = useState<CourseResponse[]>([]);
  const [filterCourse, setFilterCourse] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<FlatSection | undefined>();

  const fetch = () =>
    courseService.getAll().then(setCourses).catch(console.error);
  useEffect(() => {
    fetch();
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
    fetch();
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          title="จัดการกลุ่มเรียน"
          subtitle={`${allSections.length} กลุ่มทั้งหมด`}
        />
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
                      "เวลาเรียน",
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
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                          {s.study_time}
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
                                  fetch();
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
      </div>
      <SectionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        courses={courses}
        editSection={editTarget}
      />
    </div>
  );
}
