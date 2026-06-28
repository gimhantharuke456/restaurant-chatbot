"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2, CalendarDays, UtensilsCrossed, CreditCard, Star, BarChart3, Bot, Tag, Clock, CalendarOff } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/restaurant", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/restaurant/reservations", label: "Reservations", icon: CalendarDays },
  { href: "/restaurant/payments", label: "Payments", icon: CreditCard },
  { href: "/restaurant/reviews", label: "Reviews", icon: Star },
  { href: "/restaurant/menu", label: "Menu", icon: UtensilsCrossed },
  { href: "/restaurant/promotions", label: "Promotions", icon: Tag },
  { href: "/restaurant/availability", label: "Availability", icon: Clock },
  { href: "/restaurant/holidays", label: "Holidays", icon: CalendarOff },
  { href: "/restaurant/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/restaurant/ai", label: "AI Assistant", icon: Bot },
  { href: "/restaurant/profile", label: "My Restaurant", icon: Building2 },
];

export function PortalSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-col bg-card text-foreground border-r border-border">
      <div className="flex h-16 items-center border-b border-border px-6">
        <span className="text-xl font-bold tracking-tight text-primary">Restaurant Portal</span>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
