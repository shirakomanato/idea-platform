"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Lightbulb, FileText, Rocket, User, Heart } from "lucide-react"
import { useAppStore } from "@/lib/store"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { ROUTES } from "@/lib/routes"

export function BottomNavigation() {
  const { currentFilter, setCurrentFilter } = useAppStore()
  const pathname = usePathname()

  const navItems = [
    {
      id: "idea",
      label: "アイデア",
      icon: Lightbulb,
      path: ROUTES.DASHBOARD,
      filter: "idea" as const,
      prefetch: true, // メインページなので事前読み込み
    },
    {
      id: "pre-draft",
      label: "プリドラフト",
      icon: FileText,
      path: ROUTES.PRE_DRAFTS,
      filter: "pre-draft" as const,
      prefetch: false,
    },
    {
      id: "empathized",
      label: "共感済み",
      icon: Heart,
      path: ROUTES.EMPATHIZED,
      filter: "all" as const,
      prefetch: false,
    },
    {
      id: "proposal",
      label: "プロポーザル",
      icon: Rocket,
      path: ROUTES.PROPOSALS,
      filter: "proposal" as const,
      prefetch: false,
    },
    {
      id: "profile",
      label: "プロフィール",
      icon: User,
      path: ROUTES.PROFILE,
      filter: "all" as const,
      prefetch: false,
    },
  ]

  const handleNavClick = (item: (typeof navItems)[0]) => {
    setCurrentFilter(item.filter)
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border">
      <div className="flex items-center justify-around py-2 px-4 max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.path || (item.filter !== "all" && currentFilter === item.filter)

          return (
            <Link
              key={item.id}
              href={item.path}
              prefetch={item.prefetch}
              onClick={() => handleNavClick(item)}
              className={cn(
                "flex flex-col items-center space-y-1 py-2 px-3 rounded-md transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                isActive && "text-primary"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive && "text-primary")} />
              <span className="text-xs">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
