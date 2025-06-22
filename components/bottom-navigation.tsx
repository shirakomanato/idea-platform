"use client"

import { Button } from "@/components/ui/button"
import { Lightbulb, FileText, Rocket, User, Heart } from "lucide-react"
import { useAppStore } from "@/lib/store"
import { useRouter, usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export function BottomNavigation() {
  const { currentFilter, setCurrentFilter } = useAppStore()
  const router = useRouter()
  const pathname = usePathname()

  const navItems = [
    {
      id: "idea",
      label: "アイデア",
      icon: Lightbulb,
      path: "/dashboard",
      filter: "idea" as const,
    },
    {
      id: "pre-draft",
      label: "プリドラフト",
      icon: FileText,
      path: "/pre-drafts",
      filter: "pre-draft" as const,
    },
    {
      id: "empathized",
      label: "共感済み",
      icon: Heart,
      path: "/empathized",
      filter: "all" as const,
    },
    {
      id: "proposal",
      label: "プロポーザル",
      icon: Rocket,
      path: "/proposals",
      filter: "proposal" as const,
    },
    {
      id: "profile",
      label: "プロフィール",
      icon: User,
      path: "/me",
      filter: "all" as const,
    },
  ]

  const handleNavClick = (item: (typeof navItems)[0]) => {
    setCurrentFilter(item.filter)
    router.push(item.path)
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border">
      <div className="flex items-center justify-around py-2 px-4 max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.path || (item.filter !== "all" && currentFilter === item.filter)

          return (
            <Button
              key={item.id}
              variant="ghost"
              size="sm"
              onClick={() => handleNavClick(item)}
              className={cn("flex flex-col items-center space-y-1 h-auto py-2 px-3", isActive && "text-primary")}
            >
              <Icon className={cn("w-5 h-5", isActive && "text-primary")} />
              <span className="text-xs">{item.label}</span>
            </Button>
          )
        })}
      </div>
    </div>
  )
}
