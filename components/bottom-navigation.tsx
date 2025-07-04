"use client"

import Link from "next/link"
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
      prefetch: true,
      color: "google-blue" as const,
    },
    {
      id: "pre-draft",
      label: "ドラフト",
      icon: FileText,
      path: ROUTES.PRE_DRAFTS,
      filter: "pre-draft" as const,
      prefetch: false,
      color: "google-yellow" as const,
    },
    {
      id: "empathized",
      label: "共感済み",
      icon: Heart,
      path: ROUTES.EMPATHIZED,
      filter: "all" as const,
      prefetch: false,
      color: "google-red" as const,
    },
    {
      id: "proposal",
      label: "提案",
      icon: Rocket,
      path: ROUTES.PROPOSALS,
      filter: "proposal" as const,
      prefetch: false,
      color: "google-green" as const,
    },
    {
      id: "profile",
      label: "プロフィール",
      icon: User,
      path: ROUTES.PROFILE,
      filter: "all" as const,
      prefetch: false,
      color: "google-gray" as const,
    },
  ]

  const getColorClasses = (color: string, isActive: boolean) => {
    const colors = {
      "google-blue": isActive 
        ? "text-google-blue bg-primary/10" 
        : "text-google-gray hover:text-google-blue hover:bg-primary/5",
      "google-yellow": isActive 
        ? "text-accent bg-accent/10" 
        : "text-google-gray hover:text-accent hover:bg-accent/5",
      "google-red": isActive 
        ? "text-danger bg-danger/10" 
        : "text-google-gray hover:text-danger hover:bg-danger/5",
      "google-green": isActive 
        ? "text-secondary bg-secondary/10" 
        : "text-google-gray hover:text-secondary hover:bg-secondary/5",
      "google-gray": isActive 
        ? "text-google-gray bg-google-gray/10" 
        : "text-google-gray hover:text-google-gray hover:bg-google-gray/5",
    }
    return colors[color as keyof typeof colors] || colors["google-gray"]
  }

  const handleNavClick = (item: (typeof navItems)[0]) => {
    setCurrentFilter(item.filter)
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {/* Google-style backdrop blur and shadow */}
      <div className="absolute inset-0 bg-white/80 backdrop-blur-lg border-t border-gray-200/50 shadow-large" />
      
      {/* Navigation content */}
      <div className="relative">
        <div className="flex items-center justify-around py-3 px-4 max-w-md mx-auto">
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
                  "group relative flex flex-col items-center space-y-1 py-2.5 px-3.5 rounded-2xl transition-all duration-300 ease-out",
                  "transform active:scale-95",
                  getColorClasses(item.color, isActive)
                )}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br opacity-10 animate-fade-in" 
                       style={{
                         background: item.color === "google-blue" ? "linear-gradient(135deg, #4285F4, #1A73E8)" :
                                   item.color === "google-yellow" ? "linear-gradient(135deg, #FBBC04, #F9AB00)" :
                                   item.color === "google-red" ? "linear-gradient(135deg, #EA4335, #D33B2C)" :
                                   item.color === "google-green" ? "linear-gradient(135deg, #34A853, #2D9248)" :
                                   "linear-gradient(135deg, #5F6368, #3C4043)"
                       }} 
                  />
                )}
                
                {/* Icon with animation */}
                <div className={cn(
                  "relative transition-transform duration-300 ease-out",
                  isActive ? "scale-110" : "group-hover:scale-105"
                )}>
                  <Icon className="w-5 h-5" />
                  
                  {/* Ripple effect on active */}
                  {isActive && (
                    <div className="absolute inset-0 rounded-full animate-pulse-scale opacity-20"
                         style={{
                           background: item.color === "google-blue" ? "#4285F4" :
                                     item.color === "google-yellow" ? "#FBBC04" :
                                     item.color === "google-red" ? "#EA4335" :
                                     item.color === "google-green" ? "#34A853" :
                                     "#5F6368"
                         }} 
                    />
                  )}
                </div>
                
                {/* Label with better typography */}
                <span className={cn(
                  "text-xs font-medium leading-tight transition-all duration-300",
                  isActive ? "font-semibold" : "group-hover:font-medium"
                )}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
        
        {/* Bottom safe area for mobile devices */}
        <div className="h-safe-bottom" />
      </div>
    </div>
  )
}
