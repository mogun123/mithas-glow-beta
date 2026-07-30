"use client"

import { usePathname, useRouter } from 'next/navigation';
import { Home, ShoppingBag, Calendar, Sparkles } from 'lucide-react';
import { cn } from "@/components/ui/utils";

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/products", icon: ShoppingBag, label: "Products" },
    {
      href: "/coach",
      icon: Sparkles,
      label: "AI Coach",
      isCenter: true,
    },
    { href: "/booking", icon: Calendar, label: "Booking" },
  ];

  const handleNavClick = (href: string) => {
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    router.push(href);
  };

  return (
    <footer
      className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto p-3 z-50 rounded-t-3xl"
      style={{
        background: 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(28px) saturate(180%)',
        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        borderTop: '1px solid rgba(168,85,247,0.12)',
        boxShadow:
          '0 -4px 28px rgba(236,72,153,.08), inset 0 1px 0 rgba(255,255,255,.92)',
      }}
    >
      <nav className="flex justify-around items-end pb-1 pt-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const isCenter = item.isCenter;

          if (isCenter) {
            return (
              <div
                key={item.href}
                className="w-16 h-16 -mt-8 flex flex-col items-center justify-center"
              >
                <div
                  onClick={() => handleNavClick(item.href)}
                  className="nav-tap-btn w-16 h-16 rounded-2xl relative cursor-pointer flex flex-col items-center justify-center"
                  style={{
                    background:
                      'linear-gradient(135deg,#ec4899,#a855f7,#6366f1)',
                    boxShadow: isActive
                      ? '0 0 28px rgba(168,85,247,.55), 0 8px 24px rgba(236,72,153,.38)'
                      : '0 8px 24px rgba(168,85,247,.38)',
                  }}
                >
                  <item.icon className="w-7 h-7 text-white" />
                  <span className="text-[10px] mt-0.5 font-bold text-white tracking-tight">
                    {item.label}
                  </span>
                </div>
              </div>
            );
          }

          return (
            <div
              key={item.href}
              onClick={() => handleNavClick(item.href)}
              className="nav-tap-btn flex flex-col items-center justify-center gap-1 cursor-pointer px-2 py-1"
              style={{ width: '22%' }}
            >
              <item.icon
                className={cn(
                  "w-6 h-6 transition-colors duration-200",
                  isActive ? "text-purple-600" : "text-gray-400"
                )}
                strokeWidth={isActive ? 2.3 : 1.8}
              />
              <span
                className={cn(
                  "text-[11px] font-semibold tracking-tight transition-colors duration-200",
                  isActive ? "text-purple-700" : "text-gray-400"
                )}
              >
                {item.label}
              </span>
            </div>
          );
        })}
      </nav>
    </footer>
  );
}
