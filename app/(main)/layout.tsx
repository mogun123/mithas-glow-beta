/**
 * Main App Layout
 * With navigation and bottom tabs
 */

import type { ReactNode } from "react"
import "./globals.css"
import { Header } from "@/components/navigation/header"
import { BottomNav } from "@/components/navigation/bottom-nav"

export default function MainLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div
      className="min-h-screen flex flex-col font-sans antialiased overflow-x-hidden"
      style={{ backgroundColor: "#F7F5F0" }}
    >
      <Header />
      <main className="flex-1">{children}</main>
      <BottomNav />
    </div>
  )
}
