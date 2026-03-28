"use client"

import { useEffect, useState } from "react"
import { periodService } from "@/services/periodService"
import type {
  EnrollmentPeriodResponse,
  CreateEnrollmentPeriodRequest,
} from "@/types"
import ProtectedLayout from "@/components/layout/ProtectedLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Plus, CalendarClock, Pencil, Loader2 } from "lucide-react"

export default function AdminPeriodsPage() {
  const [periods, setPeriods] = useState<EnrollmentPeriodResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editTarget, setEditTarget] = useState<EnrollmentPeriodResponse | null>(
    null,
  )

  // Form State
  const [form, setForm] = useState({
    semester: 1,
    academic_year: new Date().getFullYear() + 543,
    start_date: "",
    end_date: "",
    is_active: false,
  })

  const fetchPeriods = () => {
    setLoading(true)
    periodService
      .getAll()
      .then(setPeriods)
      .catch((err) => console.error("Fetch periods failed:", err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchPeriods()
  }, [])

  // เปิด Modal พร้อมตั้งค่าเริ่มต้น
  const openModal = (period?: EnrollmentPeriodResponse) => {
    if (period) {
      setEditTarget(period)
      setForm({
        semester: period.semester,
        academic_year: period.academic_year,
        // ตัดเวลา T ออกเพื่อให้ใส่ใน input type="datetime-local" ได้
        start_date: period.start_date.slice(0, 16),
        end_date: period.end_date.slice(0, 16),
        is_active: period.is_active,
      })
    } else {
      setEditTarget(null)
      setForm({
        semester: 1,
        academic_year: new Date().getFullYear() + 543,
        start_date: "",
        end_date: "",
        is_active: false,
      })
    }
    setModalOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // แปลงให้อยู่ในรูปแบบ ISO 8601 (เติม Z ให้เป็น UTC หรือตามที่ Backend ใช้)
      const startISO = new Date(form.start_date).toISOString()
      const endISO = new Date(form.end_date).toISOString()

      if (editTarget) {
        // อัปเดต (Backend ของคุณอนุญาตให้อัปเดตแค่ start, end, is_active)
        await periodService.update(editTarget.id, {
          start_date: startISO,
          end_date: endISO,
          is_active: form.is_active,
        })
      } else {
        // สร้างใหม่
        await periodService.create({
          semester: form.semester,
          academic_year: form.academic_year,
          start_date: startISO,
          end_date: endISO,
          is_active: form.is_active,
        })
      }
      setModalOpen(false)
      fetchPeriods()
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล")
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  // ปุ่มเปิด-ปิดด่วนในตาราง
  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      // ส่งคำสั่งสลับสถานะ (ถ้า backend มี logic: ตัวที่ส่ง is_active=true จะไปปิดตัวอื่นอัตโนมัติ)
      await periodService.update(id, { is_active: !currentStatus })
      fetchPeriods()
    } catch (err) {
      alert("เปลี่ยนสถานะไม่สำเร็จ")
    }
  }

  return (
    <ProtectedLayout
      title="ช่วงเวลาลงทะเบียน"
      subtitle="จัดการรอบการลงทะเบียนเรียนของนักศึกษา"
      allowedRoles={["admin"]}>
      <main className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            * ระบบอนุญาตให้มีสถานะ <b>"เปิดใช้งาน"</b> ได้เพียง 1 รายการเท่านั้น
          </p>
          <Button
            className="bg-[#AC3520] hover:bg-[#922d1a] text-white h-9 text-[13px] gap-1.5"
            onClick={() => openModal()}>
            <Plus size={14} /> เปิดรอบลงทะเบียน
          </Button>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50">
                  <th className="px-4 py-3 text-left text-slate-500 font-medium whitespace-nowrap">
                    ปีการศึกษา
                  </th>
                  <th className="px-4 py-3 text-left text-slate-500 font-medium whitespace-nowrap">
                    เวลาเริ่มต้น
                  </th>
                  <th className="px-4 py-3 text-left text-slate-500 font-medium whitespace-nowrap">
                    เวลาสิ้นสุด
                  </th>
                  <th className="px-4 py-3 text-center text-slate-500 font-medium whitespace-nowrap">
                    สถานะ
                  </th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40">
                {loading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-10 text-center text-slate-400">
                      <Loader2 className="mx-auto animate-spin" size={24} />
                    </td>
                  </tr>
                ) : periods.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-16 text-center text-slate-400">
                      <CalendarClock
                        size={32}
                        className="mx-auto mb-2 opacity-30"
                      />
                      ยังไม่มีข้อมูลรอบการลงทะเบียน
                    </td>
                  </tr>
                ) : (
                  periods.map((p) => (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
                        เทอม {p.semester} / {p.academic_year}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(p.start_date).toLocaleString("th-TH")}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(p.end_date).toLocaleString("th-TH")}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Switch
                          checked={p.is_active}
                          onCheckedChange={() =>
                            toggleActive(p.id, p.is_active)
                          }
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700"
                          onClick={() => openModal(p)}>
                          <Pencil size={13} />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal เพิ่ม/แก้ไข */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? "แก้ไขรอบลงทะเบียน" : "สร้างรอบลงทะเบียนใหม่"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">เทอม (Semester)</Label>
              <Input
                type="number"
                min={1}
                max={3}
                className="h-9 text-[13px]"
                value={form.semester}
                onChange={(e) =>
                  setForm({ ...form, semester: Number(e.target.value) })
                }
                disabled={!!editTarget} // Backend ไม่อนุญาตให้แก้หลังสร้างแล้ว
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">
                ปีการศึกษา (พ.ศ.)
              </Label>
              <Input
                type="number"
                className="h-9 text-[13px]"
                value={form.academic_year}
                onChange={(e) =>
                  setForm({ ...form, academic_year: Number(e.target.value) })
                }
                disabled={!!editTarget}
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs text-slate-500">เวลาเปิดระบบ</Label>
              <Input
                type="datetime-local"
                className="h-9 text-[13px]"
                value={form.start_date}
                onChange={(e) =>
                  setForm({ ...form, start_date: e.target.value })
                }
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs text-slate-500">เวลาปิดระบบ</Label>
              <Input
                type="datetime-local"
                className="h-9 text-[13px]"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              />
            </div>
            <div className="col-span-2 flex items-center gap-2 mt-2">
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
              <Label className="text-sm">
                เปิดใช้งานทันที (จะปิดรอบอื่นโดยอัตโนมัติ)
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModalOpen(false)}
              className="h-9 text-[13px]">
              ยกเลิก
            </Button>
            <Button
              className="bg-[#AC3520] hover:bg-[#922d1a] text-white h-9 text-[13px]"
              onClick={handleSave}
              disabled={saving || !form.start_date || !form.end_date}>
              {saving && <Loader2 size={13} className="animate-spin mr-1" />}
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedLayout>
  )
}
