"use client"

import { useEffect, useRef, useState } from "react"
import { courseService } from "@/services/courseService"
import type {
  CourseResponse,
  CreateCourseRequest,
  UpdateCourseRequest,
} from "@/types"
import ProtectedLayout from "@/components/layout/ProtectedLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  BookMarked,
  Loader2,
  Upload,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

// ─── Category config ──────────────────────────────────────────
const CATEGORIES = [
  {
    value: "CORE_COURSE",
    label: "Core Course",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
  },
  {
    value: "ELECTIVE_COURSE",
    label: "Elective",
    color:
      "bg-violet-100 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400",
  },
  {
    value: "GENED_COURSE",
    label: "Gen Ed",
    color:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
  },
] as const

function CategoryBadge({ category }: { category: string }) {
  const cat = CATEGORIES.find((c) => c.value === category?.toUpperCase())
  if (!cat)
    return <span className="text-slate-400 text-[12px]">{category || "—"}</span>
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${cat.color}`}>
      {cat.label}
    </span>
  )
}

// ─── Course Modal ─────────────────────────────────────────────
function CourseModal({
  open,
  onClose,
  onSave,
  initial,
  allCourses,
}: {
  open: boolean
  onClose: () => void
  onSave: (
    data: CreateCourseRequest | UpdateCourseRequest,
    isEdit: boolean,
  ) => Promise<void>
  initial?: CourseResponse
  allCourses: CourseResponse[]
}) {
  const isEdit = !!initial
  const [saving, setSaving] = useState(false)
  const [prereqInput, setPrereqInput] = useState("")
  const [prereqIds, setPrereqIds] = useState<string[]>([])
  const [form, setForm] = useState({
    id: initial?.id ?? "",
    name_th: initial?.name_th ?? "",
    name_en: initial?.name_en ?? "",
    credits: initial?.credits ?? 3,
    category: initial?.category ?? "",
  })

  // Reset on open
  useEffect(() => {
    if (open) {
      setForm({
        id: initial?.id ?? "",
        name_th: initial?.name_th ?? "",
        name_en: initial?.name_en ?? "",
        credits: initial?.credits ?? 3,
        category: initial?.category ?? "",
      })
      setPrereqIds(initial?.prerequisites?.map((p) => p.id) || [])
      setPrereqInput("")
    }
  }, [open, initial])

  const set = (k: string, v: string | number) =>
    setForm((p) => ({ ...p, [k]: v }))

  const addPrereq = () => {
    const id = prereqInput.trim().toUpperCase()
    if (id && !prereqIds.includes(id)) setPrereqIds((p) => [...p, id])
    setPrereqInput("")
  }

  const handleSave = async () => {
    if (!form.category) return alert("กรุณาเลือกหมวดวิชา")
    setSaving(true)
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
        )
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
        )
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const suggestions = prereqInput
    ? (allCourses || [])
        .filter(
          (c) =>
            (c.id?.toLowerCase() || "").includes(prereqInput.toLowerCase()) &&
            !prereqIds.includes(c.id),
        )
        .slice(0, 5)
    : []

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? `แก้ไข ${initial?.id}` : "เพิ่มรายวิชาใหม่"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-2">
          {!isEdit && (
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">รหัสวิชา</Label>
              <Input
                className="h-9 text-[13px]"
                value={form.id}
                onChange={(e) => set("id", e.target.value)}
              />
            </div>
          )}
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">หน่วยกิต</Label>
            <Input
              type="number"
              className="h-9 text-[13px]"
              value={form.credits}
              onChange={(e) => set("credits", Number(e.target.value))}
            />
          </div>

          {/* Category dropdown — full width */}
          <div className="col-span-2 space-y-1">
            <Label className="text-xs text-slate-500">หมวดวิชา</Label>
            <Select
              value={form.category}
              onValueChange={(v) => set("category", v)}>
              <SelectTrigger className="h-9 text-[13px]">
                <SelectValue placeholder="เลือกหมวดวิชา" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-2 space-y-1">
            <Label className="text-xs text-slate-500">ชื่อ (ไทย)</Label>
            <Input
              className="h-9 text-[13px]"
              value={form.name_th}
              onChange={(e) => set("name_th", e.target.value)}
            />
          </div>
          <div className="col-span-2 space-y-1">
            <Label className="text-xs text-slate-500">ชื่อ (อังกฤษ)</Label>
            <Input
              className="h-9 text-[13px]"
              value={form.name_en}
              onChange={(e) => set("name_en", e.target.value)}
            />
            {form.category === "CORE_COURSE" && (
              <p className="text-[11px] text-slate-400">
                💡 Core Course เปิดให้นักศึกษาทุก major ลงทะเบียนได้
              </p>
            )}
          </div>
        </div>

        {/* Prerequisites */}
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
              onClick={addPrereq}>
              เพิ่ม
            </Button>
            {suggestions.length > 0 && (
              <div className="absolute top-10 left-0 z-50 w-full bg-white dark:bg-slate-800 border border-slate-200 rounded-lg shadow-lg overflow-hidden">
                {suggestions.map((c) => (
                  <button
                    key={c.id}
                    className="w-full flex gap-2 px-3 py-2 text-[13px] hover:bg-slate-50 dark:hover:bg-slate-700 text-left"
                    onClick={() => {
                      setPrereqIds((p) => [...p, c.id])
                      setPrereqInput("")
                    }}>
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
                onClick={() => setPrereqIds((p) => p.filter((x) => x !== id))}>
                {id} ✕
              </Badge>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="h-9 text-[13px]">
            ยกเลิก
          </Button>
          <Button
            className="bg-[#AC3520] hover:bg-[#922d1a] text-white h-9 text-[13px]"
            onClick={handleSave}
            disabled={saving}>
            {saving && <Loader2 size={13} className="animate-spin mr-1" />}
            {isEdit ? "บันทึก" : "สร้างวิชา"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Constants ────────────────────────────────────────────────
const PAGE_SIZE = 20 // จำนวนรายการต่อหน้า

// ─── Page ─────────────────────────────────────────────────────
export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<CourseResponse[]>([])
  const [search, setSearch] = useState("")
  const [filterCat, setFilterCat] = useState("all")

  // ✅ 1. เพิ่ม State สำหรับ Pagination และ การนำเข้า
  const [page, setPage] = useState(1)
  const [importing, setImporting] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<CourseResponse | undefined>()
  const importRef = useRef<HTMLInputElement>(null)

  const fetchCourses = () =>
    courseService
      .getAll()
      .then((data) => {
        setCourses(Array.isArray(data) ? data : [])
      })
      .catch((err) => {
        console.error(err)
        setCourses([])
      })

  useEffect(() => {
    fetchCourses()
  }, [])

  const handleSave = async (
    data: CreateCourseRequest | UpdateCourseRequest,
    isEdit: boolean,
  ) => {
    if (isEdit && editTarget)
      await courseService.updateCourse(
        editTarget.id,
        data as UpdateCourseRequest,
      )
    else await courseService.createCourse(data as CreateCourseRequest)
    fetchCourses()
  }

  // ✅ 2. ฟังก์ชันจัดการการนำเข้าไฟล์
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    try {
      await courseService.importCourses(file)
      await fetchCourses()
      alert("นำเข้าสำเร็จ")
    } catch {
      alert("เกิดข้อผิดพลาดในการนำเข้าไฟล์")
    } finally {
      setImporting(false)
      e.target.value = ""
    }
  }

  // กรองข้อมูลตามที่พิมพ์หรือเลือก
  const filtered = (courses || []).filter((c) => {
    const searchLower = search.toLowerCase()

    const matchSearch =
      (c.id?.toLowerCase() || "").includes(searchLower) ||
      (c.name_en?.toLowerCase() || "").includes(searchLower) ||
      (c.name_th || "").includes(search)

    const matchCat =
      filterCat === "all" || c.category?.toUpperCase() === filterCat

    return matchSearch && matchCat
  })

  // ✅ 3. คำนวณข้อมูลสำหรับการแบ่งหน้า
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  // หั่น array ให้เหลือแค่ข้อมูลของหน้าที่เลือก
  const paginatedCourses = filtered.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  )

  return (
    <ProtectedLayout
      title="จัดการรายวิชา"
      subtitle={`${courses.length} วิชาทั้งหมด`}
      allowedRoles={["admin"]}>
      <main className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <Input
              placeholder="ค้นหารหัสวิชา หรือชื่อวิชา..."
              className="pl-9 h-9 text-[13px]"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1) // รีเซ็ตหน้ากลับไปหน้า 1 เมื่อค้นหาใหม่
              }}
            />
          </div>

          {/* Category filter */}
          <Select
            value={filterCat}
            onValueChange={(v) => {
              setFilterCat(v)
              setPage(1) // รีเซ็ตหน้ากลับไปหน้า 1 เมื่อเปลี่ยนหมวดหมู่
            }}>
            <SelectTrigger className="w-40 h-9 text-[13px]">
              <SelectValue placeholder="หมวดวิชา" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกหมวด</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <input
            ref={importRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleImport}
          />

          {/* ✅ ปุ่มนำเข้าอัปเดตให้รองรับสถานะ Loading */}
          <Button
            variant="outline"
            className="h-9 text-[13px] gap-1.5 w-32"
            onClick={() => importRef.current?.click()}
            disabled={importing}>
            {importing ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Upload size={14} />
            )}
            {importing ? "กำลังนำเข้า..." : "นำเข้า Excel"}
          </Button>

          <Button
            className="bg-[#AC3520] hover:bg-[#922d1a] text-white h-9 text-[13px] gap-1.5"
            onClick={() => {
              setEditTarget(undefined)
              setModalOpen(true)
            }}>
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
                    "ชื่อวิชา",
                    "หมวด",
                    "หน่วยกิต",
                    "กลุ่มเรียน",
                    "",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-slate-500 font-medium border-b border-slate-100 dark:border-slate-700/40 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40">
                {/* ✅ ใช้ข้อมูลที่แบ่งหน้าแล้ว (paginatedCourses) มาลูปแสดงผล */}
                {paginatedCourses.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-medium font-mono text-slate-800 dark:text-slate-100">
                      {c.id}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-800 dark:text-slate-100">
                        {c.name_th}
                      </p>
                      <p className="text-[12px] text-slate-400">{c.name_en}</p>
                    </td>
                    <td className="px-4 py-3">
                      <CategoryBadge category={c.category} />
                    </td>
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
                            setEditTarget(c)
                            setModalOpen(true)
                          }}>
                          <Pencil size={13} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-slate-400 hover:text-red-500"
                          onClick={async () => {
                            if (confirm(`ลบ ${c.id}?`)) {
                              await courseService.deleteCourse(c.id)
                              fetchCourses()
                            }
                          }}>
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
                      className="py-16 text-center text-slate-400">
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

          {/* ✅ เพิ่ม UI ส่วนของ Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-700/60">
              <p className="text-[12px] text-slate-400">
                หน้า {page}/{totalPages} ({filtered.length} รายการ)
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  <ChevronLeft size={14} />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      <CourseModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        initial={editTarget}
        allCourses={courses}
      />
    </ProtectedLayout>
  )
}
