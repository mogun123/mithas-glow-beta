"use client"

import { useState } from "react"
import {
  ShoppingBag,
  Heart,
  MapPin,
  CreditCard,
  Settings,
  HelpCircle,
  LogOut,
  ChevronRight,
  Bell,
  Shield,
  Wallet,
  Store,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { useUserProfile } from "@/hooks/use-user"
import Link from "next/link"

const menuItems = [
  { icon: ShoppingBag, label: "My Orders", href: "/orders", badge: "3" },
  { icon: Heart, label: "Wishlist", href: "/wishlist" },
  { icon: MapPin, label: "Addresses", href: "/addresses" },
  { icon: CreditCard, label: "Payment Methods", href: "/payments" },
  { icon: Wallet, label: "My Wallet", href: "/wallet" },
  { icon: Store, label: "Become a Seller", href: "/seller" },
]

const settingsItems = [
  { icon: Bell, label: "Notifications", href: "/settings/notifications" },
  { icon: Shield, label: "Privacy & Security", href: "/settings/privacy" },
  { icon: Settings, label: "App Settings", href: "/settings" },
  { icon: HelpCircle, label: "Help & Support", href: "/help" },
]

export function ProfileScreen() {
  const { profile, isLoading } = useUserProfile()
  const [darkMode, setDarkMode] = useState(false)

  const user = profile || {
    name: "Guest User",
    email: "guest@example.com",
    avatar_url: null,
    phone: null,
    membership: "Standard",
  }

  return (
    <div className="p-4 pb-24 space-y-6">
      {/* Profile Header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={user.avatar_url || "/placeholder.svg"} />
              <AvatarFallback className="text-2xl">{user.name?.[0]?.toUpperCase() || "G"}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-xl font-bold">{user.name}</h2>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <Badge variant="secondary" className="mt-1">
                {user.membership} Member
              </Badge>
            </div>
            <Link href="/profile/edit">
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">12</p>
            <p className="text-xs text-muted-foreground">Orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">5</p>
            <p className="text-xs text-muted-foreground">Wishlist</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">250</p>
            <p className="text-xs text-muted-foreground">Points</p>
          </CardContent>
        </Card>
      </div>

      {/* Menu Items */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground px-1">Account</h3>
        <Card>
          <CardContent className="p-0 divide-y">
            {menuItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <item.icon className="h-5 w-5 text-muted-foreground" />
                  <span>{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {item.badge && (
                    <Badge variant="destructive" className="h-5 px-1.5">
                      {item.badge}
                    </Badge>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Settings */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground px-1">Settings</h3>
        <Card>
          <CardContent className="p-0 divide-y">
            {/* Dark Mode Toggle */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Settings className="h-5 w-5 text-muted-foreground" />
                <span>Dark Mode</span>
              </div>
              <Switch checked={darkMode} onCheckedChange={setDarkMode} />
            </div>

            {settingsItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <item.icon className="h-5 w-5 text-muted-foreground" />
                  <span>{item.label}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Logout */}
      <Button variant="outline" className="w-full text-destructive hover:text-destructive bg-transparent">
        <LogOut className="h-4 w-4 mr-2" />
        Logout
      </Button>

      <p className="text-center text-xs text-muted-foreground">Version 1.0.0</p>
    </div>
  )
}
