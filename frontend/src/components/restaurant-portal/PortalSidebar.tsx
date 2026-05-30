"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2, CalendarDays, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/restaurant", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/restaurant/reservations", label: "Reservations", icon: CalendarDays },
  { href: "/restaurant/menu", label: "Menu", icon: UtensilsCrossed },
  { href: "/restaurant/profile", label: "My Restaurant", icon: Building2 },
];

export function PortalSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-col bg-slate-900 text-slate-100">
      <div className="flex h-16 items-center border-b border-slate-700 px-6">
        <span className="text-xl font-bold tracking-tight">Restaurant Portal</span>
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
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
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
