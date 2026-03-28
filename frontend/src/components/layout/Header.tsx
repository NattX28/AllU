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
    <header
      className="sticky top-0 z-20 flex items-center justify-between px-6 py-3"
      style={{
        background: "var(--glass-bg)",
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        borderBottom: "1px solid var(--glass-border-subtle)",
        boxShadow:
          "0 1px 0 var(--glass-border-subtle), 0 4px 16px rgba(0,0,0,0.03)",
      }}>
      <div className="fade-up">
        <h1
          className="text-[17px] font-semibold leading-tight"
          style={{
            fontFamily: "'DM Sans', 'Sarabun', sans-serif",
            letterSpacing: "-0.02em",
            color: "var(--foreground)",
          }}>
          {title}
        </h1>
        {subtitle && (
          <p
            className="text-[12px] mt-0.5"
            style={{ color: "var(--muted-foreground)" }}>
            {subtitle}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        {/* Notification */}

        {/* Dark/Light toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="rounded-[10px] w-9 h-9"
          style={{ color: "var(--muted-foreground)" }}
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </Button>
      </div>
    </header>
  )
}
