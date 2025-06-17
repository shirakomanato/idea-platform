"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAppStore } from "@/lib/store"

export default function HomePage() {
  const { user } = useAppStore()
  const router = useRouter()

  useEffect(() => {
    if (user) {
      router.push("/dashboard")
    } else {
      router.push("/connect")
    }
  }, [user, router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  )
}
