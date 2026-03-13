"use client"

import { useTheme } from "next-themes"
import { Sun, Moon, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"

interface HeaderProps {
  title: string
  subtitle?: string
}

export default function Header({ title, subtitle }: HeaderProps) {
  const { theme, setTheme } = useTheme()

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700/60">
      <div>
        <h1 className="text-[18px] font-semibold text-slate-800 dark:text-slate-100 leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[13px] text-slate-400 mt-0.5">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Notification placeholder */}
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full text-slate-500">
          <Bell size={18} />
        </Button>

        {/* Dark/Light toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full text-slate-500"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </Button>
      </div>
    </header>
  )
}
