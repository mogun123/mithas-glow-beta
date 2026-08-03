"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ShoppingBag, Camera, Play, MessageCircle, User } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/shop", icon: ShoppingBag, label: "Shop" },
  { href: "/reels", icon: Play, label: "Reels" },
  { href: "/ai-mirror", icon: Camera, label: "Mirror" },
  { href: "/chat", icon: MessageCircle, label: "Chat" },
  { href: "/profile", icon: User, label: "Profile" },
]

export function BottomNav() {
  const pathname = usePathname()

  // Hide on auth pages
  if (pathname.startsWith("/auth")) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-lg md:hidden safe-area-inset-bottom">
      <div className="flex items-center justify-around h-20 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full rounded-lg transition-colors duration-200 group",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              )}
            >
              <Icon className={cn(
                "h-6 w-6 transition-transform duration-200",
                isActive ? "fill-current scale-110" : "group-hover:scale-105"
              )} />
              <span className={cn(
                "text-xs font-semibold transition-colors duration-200",
                isActive && "text-primary"
              )}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
