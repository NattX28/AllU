"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useAuth } from "@/contexts/AuthContext"
import { Eye, EyeOff, School, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const schema = z.object({
  username: z.string().min(1, "กรุณากรอก Username"),
  password: z.string().min(1, "กรุณากรอก Password"),
})
type FormValues = z.infer<typeof schema>

const ROLE_HOME: Record<string, string> = {
  student: "/dashboard",
  professor: "/professor/dashboard",
  admin: "/admin/users",
}

export default function LoginPage() {
  const { login } = useAuth()
  const router = useRouter()
  const [showPass, setShowPass] = useState(false)
  const [apiError, setApiError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormValues) => {
    setApiError("")
    setIsLoading(true)
    try {
      const res = await login(data)
      router.replace(ROLE_HOME[res.role] ?? "/dashboard")
    } catch {
      setApiError("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950">
      {/* Left panel — decorative */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] bg-[#AC3520] p-12 text-white">
        <div className="flex items-center gap-3">
          <School size={28} />
          <span className="text-xl font-bold tracking-wide">AllU</span>
        </div>

        <div>
          <h2 className="text-4xl font-bold leading-tight mb-4">
            ระบบบริหาร
            <br />
            จัดการการศึกษา
          </h2>
          <p className="text-white/70 text-[15px] leading-relaxed">
            Chiang Mai University
            <br />
            Academic Management System
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {[
            { label: "นักศึกษา", value: "15,000+" },
            { label: "รายวิชา", value: "800+" },
            { label: "อาจารย์", value: "600+" },
            { label: "สาขา", value: "120+" },
          ].map((s) => (
            <div key={s.label} className="bg-white/10 rounded-xl p-4">
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-white/60 text-sm">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-lg bg-[#AC3520] flex items-center justify-center">
              <School size={18} className="text-white" />
            </div>
            <span className="font-bold text-slate-800 dark:text-slate-100">
              AllU
            </span>
          </div>

          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1">
            เข้าสู่ระบบ
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">
            กรุณาเข้าสู่ระบบด้วยบัญชีมหาวิทยาลัย
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <Label
                htmlFor="username"
                className="text-slate-700 dark:text-slate-300 text-sm">
                Username
              </Label>
              <Input
                id="username"
                placeholder="เช่น 66040626..."
                autoComplete="username"
                className={cn(
                  "h-11",
                  errors.username &&
                    "border-red-400 focus-visible:ring-red-400",
                )}
                {...register("username")}
              />
              {errors.username && (
                <p className="text-xs text-red-500">
                  {errors.username.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="password"
                className="text-slate-700 dark:text-slate-300 text-sm">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className={cn(
                    "h-11 pr-10",
                    errors.password &&
                      "border-red-400 focus-visible:ring-red-400",
                  )}
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-500">
                  {errors.password.message}
                </p>
              )}
            </div>

            {apiError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3">
                <p className="text-sm text-red-600 dark:text-red-400">
                  {apiError}
                </p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-[#AC3520] hover:bg-[#922d1a] text-white font-medium">
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" />{" "}
                  กำลังเข้าสู่ระบบ...
                </span>
              ) : (
                "เข้าสู่ระบบ"
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-slate-400 mt-8">
            หากลืมรหัสผ่านกรุณาติดต่อ{" "}
            <span className="text-[#AC3520] cursor-pointer hover:underline">
              สำนักทะเบียน
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}
