"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import { cn } from "@/lib/utils"

interface ProgressProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  value?: number
  indicatorClassName?: string
  showPercentage?: boolean
  variant?: "default" | "gradient" | "striped"
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value = 0, indicatorClassName, showPercentage = false, variant = "default", ...props }, ref) => {
  const percentage = Math.round(Math.min(100, Math.max(0, value)))
  
  const getIndicatorStyles = () => {
    switch (variant) {
      case "gradient":
        return cn(
          "h-full w-full flex-1 transition-all duration-500 ease-out",
          "bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500",
          percentage > 66 ? "from-green-500 to-emerald-500" : 
          percentage > 33 ? "from-yellow-500 to-orange-500" : 
          "from-red-500 to-pink-500"
        )
      case "striped":
        return cn(
          "h-full w-full flex-1 transition-all duration-500 ease-out",
          "bg-primary relative overflow-hidden",
          "before:absolute before:inset-0",
          "before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent",
          "before:translate-x-[-100%] before:animate-[shimmer_2s_infinite]"
        )
      default:
        return cn(
          "h-full w-full flex-1 bg-primary transition-all duration-500 ease-out",
          indicatorClassName
        )
    }
  }

  return (
    <div className="relative w-full">
      <ProgressPrimitive.Root
        ref={ref}
        className={cn(
          "relative h-4 w-full overflow-hidden rounded-full bg-secondary",
          "shadow-inner",
          className
        )}
        {...props}
      >
        <ProgressPrimitive.Indicator
          className={getIndicatorStyles()}
          style={{ 
            transform: `translateX(-${100 - percentage}%)`,
          }}
        />
      </ProgressPrimitive.Root>
      {showPercentage && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-medium text-foreground mix-blend-difference">
            {percentage}%
          </span>
        </div>
      )}
    </div>
  )
})

Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }