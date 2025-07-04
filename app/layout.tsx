import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { NotificationProvider } from "@/lib/contexts/notification-context"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "For the Idea Junkies",
  description: "アイデア共創プラットフォーム - Web3 × AI",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <NotificationProvider>
            {children}
            <Toaster />
          </NotificationProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
