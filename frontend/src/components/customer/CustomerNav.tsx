"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { AUTH_COOKIE } from "@/lib/cookie";
import { CalendarDays, User, LogOut, UtensilsCrossed, Home, Bell, Trophy, MessageSquareWarning, MessageCircle, Heart, Clock, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/chat", label: "Chat", icon: MessageCircle },
  { href: "/reservations", label: "Reservations", icon: CalendarDays },
  { href: "/payments", label: "Payments", icon: CreditCard },
  { href: "/favorites", label: "Favorites", icon: Heart },
  { href: "/waitlist", label: "Waitlist", icon: Clock },
  { href: "/loyalty", label: "Loyalty", icon: Trophy },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/complaints", label: "Complaints", icon: MessageSquareWarning },
  { href: "/profile", label: "Profile", icon: User },
];

interface CustomerNavProps {
  name: string | null;
  email: string;
}

export function CustomerNav({ name, email }: CustomerNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await signOut(auth);
    document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0`;
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 backdrop-blur px-4 md:px-6">
      <div className="flex items-center gap-6">
        <Link href="/chat" className="flex items-center gap-2 font-semibold text-sm">
          <UtensilsCrossed className="h-5 w-5 text-primary" />
          <span className="hidden sm:inline">Restaurant Chatbot</span>
        </Link>

        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                pathname === href
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <span className="hidden md:block text-sm text-muted-foreground truncate max-w-[160px]">
          {name ?? email}
        </span>
        <Button variant="ghost" size="icon" onClick={handleLogout} title="Sign out">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
