"use client";

import { useEffect, useRef, useState } from "react";
import { courseService } from "@/services/courseService";
import type {
  CourseResponse,
  CreateCourseRequest,
  UpdateCourseRequest,
} from "@/types";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  BookMarked,
  Loader2,
  Upload,
} from "lucide-react";

function CourseModal({
  open,
  onClose,
  onSave,
  initial,
  allCourses,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (
    data: CreateCourseRequest | UpdateCourseRequest,
    isEdit: boolean,
  ) => Promise<void>;
  initial?: CourseResponse;
  allCourses: CourseResponse[];
}) {
  const isEdit = !!initial;
  const [saving, setSaving] = useState(false);
  const [prereqInput, setPrereqInput] = useState("");
  const [prereqIds, setPrereqIds] = useState<string[]>([]);
  const [form, setForm] = useState({
    id: initial?.id ?? "",
    name_th: initial?.name_th ?? "",
    name_en: initial?.name_en ?? "",
    credits: initial?.credits ?? 3,
    category: "",
    lecture_hours: 0,
    lab_hours: 0,
    self_study_hours: 0,
    max_entry_year: 0,
  });
  const set = (k: string, v: string | number) =>
    setForm((p) => ({ ...p, [k]: v }));
  const addPrereq = () => {
    const id = prereqInput.trim().toUpperCase();
    if (id && !prereqIds.includes(id)) setPrereqIds((p) => [...p, id]);
    setPrereqInput("");
  };
  const handleSave = async () => {
    setSaving(true);
    try {
      if (isEdit)
        await onSave(
          {
            name_th: form.name_th || undefined,
            name_en: form.name_en || undefined,
            credits: form.credits || undefined,
            category: form.category || undefined,
            prerequisite_ids: prereqIds,
          },
          true,
        );
      else
        await onSave(
          {
            id: form.id,
            name_th: form.name_th,
            name_en: form.name_en,
            credits: form.credits,
            category: form.category,
            prerequisite_ids: prereqIds,
          },
          false,
        );
      onClose();
    } finally {
      setSaving(false);
    }
  };
  const field = (label: string, key: string, type = "text") => (
    <div className="space-y-1">
      <Label className="text-xs text-slate-500">{label}</Label>
      <Input
        type={type}
        className="h-9 text-[13px]"
        value={(form as Record<string, string | number>)[key]}
        onChange={(e) =>
          set(key, type === "number" ? Number(e.target.value) : e.target.value)
        }
      />
    </div>
  );
  const suggestions = prereqInput
    ? allCourses
        .filter(
          (c) =>
            c.id.toLowerCase().includes(prereqInput.toLowerCase()) &&
            !prereqIds.includes(c.id),
        )
        .slice(0, 5)
    : [];
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? `แก้ไข ${initial?.id}` : "เพิ่มรายวิชาใหม่"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          {!isEdit && field("รหัสวิชา", "id")}
          {field("ชื่อ (ไทย)", "name_th")}
          {field("ชื่อ (อังกฤษ)", "name_en")}
          {field("หน่วยกิต", "credits", "number")}
          {field("หมวดวิชา", "category")}
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-slate-500">วิชาบังคับก่อน</Label>
          <div className="flex gap-2 relative">
            <Input
              className="h-9 text-[13px]"
              placeholder="พิมพ์รหัสวิชา"
              value={prereqInput}
              onChange={(e) => setPrereqInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addPrereq()}
            />
            <Button
              variant="outline"
              className="h-9 text-[13px]"
              onClick={addPrereq}
            >
              เพิ่ม
            </Button>
            {suggestions.length > 0 && (
              <div className="absolute top-10 left-0 z-50 w-full bg-white dark:bg-slate-800 border border-slate-200 rounded-lg shadow-lg overflow-hidden">
                {suggestions.map((c) => (
                  <button
                    key={c.id}
                    className="w-full flex gap-2 px-3 py-2 text-[13px] hover:bg-slate-50 dark:hover:bg-slate-700 text-left"
                    onClick={() => {
                      setPrereqIds((p) => [...p, c.id]);
                      setPrereqInput("");
                    }}
                  >
                    <span className="font-medium">{c.id}</span>
                    <span className="text-slate-400 truncate">{c.name_en}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {prereqIds.map((id) => (
              <Badge
                key={id}
                variant="secondary"
                className="text-[11px] cursor-pointer hover:bg-red-100 hover:text-red-600"
                onClick={() => setPrereqIds((p) => p.filter((x) => x !== id))}
              >
                {id} ✕
              </Badge>
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
            disabled={saving}
          >
            {saving && <Loader2 size={13} className="animate-spin mr-1" />}
            {isEdit ? "บันทึก" : "สร้างวิชา"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<CourseResponse[]>([]);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CourseResponse | undefined>();
  const importRef = useRef<HTMLInputElement>(null);

  const fetch = () =>
    courseService.getAll().then(setCourses).catch(console.error);
  useEffect(() => {
    fetch();
  }, []);

  const handleSave = async (
    data: CreateCourseRequest | UpdateCourseRequest,
    isEdit: boolean,
  ) => {
    if (isEdit && editTarget)
      await courseService.updateCourse(
        editTarget.id,
        data as UpdateCourseRequest,
      );
    else await courseService.createCourse(data as CreateCourseRequest);
    fetch();
  };

  const filtered = courses.filter(
    (c) =>
      c.id.toLowerCase().includes(search.toLowerCase()) ||
      c.name_en.toLowerCase().includes(search.toLowerCase()) ||
      c.name_th.includes(search),
  );

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          title="จัดการรายวิชา"
          subtitle={`${courses.length} วิชาทั้งหมด`}
        />
        <main className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-48">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <Input
                placeholder="ค้นหารหัสวิชา..."
                className="pl-9 h-9 text-[13px]"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <input
              ref={importRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) {
                  await courseService.importCourses(f);
                  fetch();
                }
                e.target.value = "";
              }}
            />
            <Button
              variant="outline"
              className="h-9 text-[13px] gap-1.5"
              onClick={() => importRef.current?.click()}
            >
              <Upload size={14} /> นำเข้า Excel
            </Button>
            <Button
              className="bg-[#AC3520] hover:bg-[#922d1a] text-white h-9 text-[13px] gap-1.5"
              onClick={() => {
                setEditTarget(undefined);
                setModalOpen(true);
              }}
            >
              <Plus size={14} /> เพิ่มวิชา
            </Button>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50">
                    {[
                      "รหัสวิชา",
                      "ชื่อ (ไทย)",
                      "ชื่อ (อังกฤษ)",
                      "หน่วยกิต",
                      "กลุ่มเรียน",
                      "",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-slate-500 font-medium border-b border-slate-100 dark:border-slate-700/40"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40">
                  {filtered.map((c) => (
                    <tr
                      key={c.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium font-mono text-slate-800 dark:text-slate-100">
                        {c.id}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {c.name_th}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{c.name_en}</td>
                      <td className="px-4 py-3 text-center text-slate-500">
                        {c.credits}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="secondary" className="text-[11px]">
                          {c.sections?.length ?? 0} กลุ่ม
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700"
                            onClick={() => {
                              setEditTarget(c);
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
                              if (confirm(`ลบ ${c.id}?`)) {
                                await courseService.deleteCourse(c.id);
                                fetch();
                              }
                            }}
                          >
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-16 text-center text-slate-400"
                      >
                        <BookMarked
                          size={32}
                          className="mx-auto mb-2 opacity-30"
                        />
                        ไม่พบรายวิชา
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
      <CourseModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        initial={editTarget}
        allCourses={courses}
      />
    </div>
  );
}
