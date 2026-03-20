"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { userService } from "@/services/userService";
import type {
  GetMeResponse,
  UserFilterQuery,
  CreateUserRequest,
  UpdateUserAdminRequest,
  Role,
} from "@/types";
import ProtectedLayout from "@/components/layout/ProtectedLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Upload,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Users,
} from "lucide-react";

const PAGE_SIZE = 20;
const ROLE_BADGE: Record<string, string> = {
  student: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  professor:
    "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  admin: "bg-[#AC3520]/10 text-[#AC3520]",
};

function UserModal({
  open,
  onClose,
  onSave,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (
    data: CreateUserRequest | UpdateUserAdminRequest,
    isEdit: boolean,
  ) => Promise<void>;
  initial?: GetMeResponse;
}) {
  const isEdit = !!initial;
  const [saving, setSaving] = useState(false);
  const [role, setRole] = useState<Role>(initial?.role ?? "student");
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    name: initial?.name ?? "",
    address: initial?.student?.address ?? initial?.professor?.address ?? "",
    birthday: initial?.student?.birthday ?? initial?.professor?.birthday ?? "",
    gender: initial?.student?.gender ?? initial?.professor?.gender ?? "",
    student_id: initial?.student?.student_id ?? "",
    entry_year: initial?.student?.entry_year
      ? initial.student.entry_year + 543
      : 0,
    year: initial?.student?.year ?? 0,
    faculty: initial?.student?.faculty ?? initial?.professor?.faculty ?? "",
    major: initial?.student?.major ?? "",
    professor_id: initial?.professor?.professor_id ?? "",
    department: initial?.professor?.department ?? "",
  });
  const set = (k: string, v: string | number) =>
    setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isEdit) {
        await onSave(
          {
            name: form.name || undefined,
            address: form.address || undefined,
            birthday: form.birthday || undefined,
            gender: form.gender || undefined,
            role,
            ...(role === "student"
              ? {
                  student_id: form.student_id || undefined,
                  entry_year: form.entry_year || undefined,
                  year: form.year || undefined,
                  faculty: form.faculty || undefined,
                  major: form.major || undefined,
                }
              : {
                  professor_id: form.professor_id || undefined,
                  department: form.department || undefined,
                  faculty: form.faculty || undefined,
                }),
          },
          true,
        );
      } else {
        await onSave(
          {
            username: form.username,
            email: form.email,
            password: form.password,
            name: form.name,
            role,
            address: form.address,
            birthday: form.birthday,
            gender: form.gender,
            ...(role === "student"
              ? {
                  student_id: form.student_id,
                  entry_year: form.entry_year,
                  year: form.year,
                  faculty: form.faculty,
                  major: form.major,
                }
              : {
                  professor_id: form.professor_id,
                  department: form.department,
                  faculty: form.faculty,
                }),
          },
          false,
        );
      }
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
        value={(form as Record<string, string | number>)[key] ?? ""}
        onChange={(e) =>
          set(key, type === "number" ? Number(e.target.value) : e.target.value)
        }
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "แก้ไขผู้ใช้" : "เพิ่มผู้ใช้ใหม่"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          {!isEdit && (
            <>
              {field("Username", "username")}
              {field("Email", "email", "email")}
              {field("Password", "password", "password")}
            </>
          )}
          {field("ชื่อ-สกุล", "name")}
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger className="h-9 text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="professor">Professor</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {field("เพศ", "gender")}
          {field("วันเกิด (YYYY-MM-DD)", "birthday")}
          {field("ที่อยู่", "address")}
          {role === "student" && (
            <>
              {field("รหัสนักศึกษา", "student_id")}
              {field("ปีเข้า", "entry_year", "number")}
              {field("ชั้นปี", "year", "number")}
              {field("คณะ", "faculty")}
              {field("สาขา", "major")}
            </>
          )}
          {role === "professor" && (
            <>
              {field("รหัสอาจารย์", "professor_id")}
              {field("คณะ", "faculty")}
              {field("ภาควิชา", "department")}
            </>
          )}
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
            {saving && <Loader2 size={14} className="animate-spin mr-1" />}
            {isEdit ? "บันทึก" : "สร้างผู้ใช้"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<GetMeResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<GetMeResponse | undefined>();
  const importRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState<UserFilterQuery>({});

  const setF = (k: keyof UserFilterQuery, v: string | number | undefined) => {
    setFilter((p) => ({ ...p, [k]: v }));
    setPage(1);
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const cleanFilter = Object.fromEntries(
        Object.entries(filter).filter(
          ([, v]) => v !== undefined && v !== "" && v !== "all",
        ),
      );
      const res = await userService.getAllUsers({
        ...cleanFilter,
        page,
        limit: PAGE_SIZE,
      });
      setUsers(res.data ?? []);
      setTotal(res.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSave = async (
    data: CreateUserRequest | UpdateUserAdminRequest,
    isEdit: boolean,
  ) => {
    if (isEdit && editTarget)
      await userService.updateUser(
        editTarget.id,
        data as UpdateUserAdminRequest,
      );
    else await userService.createUser(data as CreateUserRequest);
    fetchUsers();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("ยืนยันการลบ?")) return;
    await userService.deleteUser(id);
    fetchUsers();
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await userService.importUsers(file);
      fetchUsers();
      alert("นำเข้าสำเร็จ");
    } catch {
      alert("เกิดข้อผิดพลาด");
    }
    e.target.value = "";
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <ProtectedLayout
      title="จัดการผู้ใช้"
      subtitle={`ทั้งหมด ${total.toLocaleString()} คน`}
      allowedRoles={["admin"]}
    >
      <main className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <Input
              placeholder="ค้นหาชื่อ, username, รหัส, email, ที่อยู่ ..."
              className="pl-9 h-9 text-[13px]"
              value={filter.search ?? ""}
              onChange={(e) => setF("search", e.target.value || undefined)}
            />
          </div>
          <Select
            value={filter.role ?? "all"}
            onValueChange={(v) =>
              setF("role", v === "all" ? undefined : (v as Role))
            }
          >
            <SelectTrigger className="w-32 h-9 text-[13px]">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุก Role</SelectItem>
              <SelectItem value="student">Student</SelectItem>
              <SelectItem value="professor">Professor</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filter.gender ?? "all"}
            onValueChange={(v) => setF("gender", v === "all" ? undefined : v)}
          >
            <SelectTrigger className="w-28 h-9 text-[13px]">
              <SelectValue placeholder="เพศ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกเพศ</SelectItem>
              <SelectItem value="male">ชาย</SelectItem>
              <SelectItem value="female">หญิง</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="คณะ"
            className="w-32 h-9 text-[13px]"
            value={filter.faculty ?? ""}
            onChange={(e) => setF("faculty", e.target.value || undefined)}
          />
          <Input
            placeholder="สาขา"
            className="w-32 h-9 text-[13px]"
            value={filter.major ?? ""}
            onChange={(e) => setF("major", e.target.value || undefined)}
          />
          <Input
            placeholder="ปีเข้า (เช่น 2566)"
            type="number"
            className="w-32 h-9 text-[13px]"
            value={filter.entry_year ?? ""}
            onChange={(e) =>
              setF(
                "entry_year",
                e.target.value ? Number(e.target.value) : undefined,
              )
            }
          />
          <Input
            placeholder="ชั้นปี"
            type="number"
            className="w-24 h-9 text-[13px]"
            value={filter.year ?? ""}
            onChange={(e) =>
              setF("year", e.target.value ? Number(e.target.value) : undefined)
            }
          />
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="h-9 text-[13px] text-slate-500"
            onClick={() => {
              setFilter({});
              setPage(1);
            }}
          >
            ล้างตัวกรอง
          </Button>
          <div className="flex-1" />
          <input
            ref={importRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleImport}
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
            <Plus size={14} /> เพิ่มผู้ใช้
          </Button>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-slate-400">
              <Loader2 size={24} className="animate-spin mr-2" /> กำลังโหลด...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50">
                    {[
                      "ชื่อ-สกุล",
                      "Username",
                      "Role",
                      "เพศ",
                      "วันเกิด",
                      "รหัส",
                      "คณะ / สาขา",
                      "ชั้นปี",
                      "ปีเข้า (พ.ศ.)",
                      "GPAX",
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
                  {users.map((u) => (
                    <tr
                      key={u.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
                        {u.name}
                      </td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-[12px]">
                        {u.username}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${ROLE_BADGE[u.role]}`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-[12px]">
                        {u.student?.gender ?? u.professor?.gender ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-[12px]">
                        {u.student?.birthday ?? u.professor?.birthday ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-[12px]">
                        {u.student?.student_id ??
                          u.professor?.professor_id ??
                          "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-[12px]">
                        {u.student
                          ? `${u.student.faculty} / ${u.student.major}`
                          : u.professor
                            ? `${u.professor.faculty} / ${u.professor.department}`
                            : "—"}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-500 text-[12px]">
                        {u.student?.year ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-500 text-[12px]">
                        {u.student?.entry_year
                          ? u.student.entry_year + 543
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-500 text-[12px]">
                        {u.student?.gpax ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700"
                            onClick={() => {
                              setEditTarget(u);
                              setModalOpen(true);
                            }}
                          >
                            <Pencil size={13} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-slate-400 hover:text-red-500"
                            onClick={() => handleDelete(u.id)}
                          >
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td
                        colSpan={11}
                        className="py-16 text-center text-slate-400"
                      >
                        <Users size={32} className="mx-auto mb-2 opacity-30" />
                        ไม่พบผู้ใช้
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-700/60">
              <p className="text-[12px] text-slate-400">
                หน้า {page}/{totalPages} ({total} รายการ)
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft size={14} />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
      <UserModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        initial={editTarget}
      />
    </ProtectedLayout>
  );
}
