"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAppStore } from "@/lib/store"
import { WalletConnect } from "@/components/wallet-connect"

export default function ConnectPage() {
  const { user, isConnected, hasHydrated } = useAppStore()
  const router = useRouter()

  useEffect(() => {
    // Already connected, redirect to dashboard
    if (hasHydrated && isConnected && user) {
      router.push("/dashboard")
    }
  }, [hasHydrated, isConnected, user, router])

  // Don't render wallet connect if already connected
  if (hasHydrated && isConnected && user) {
    return null
  }

  return <WalletConnect />
}
