"use client";

import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { AUTH_COOKIE } from "@/lib/cookie";
import { LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminTopBarProps {
  email: string;
  name: string | null;
}

export function AdminTopBar({ email, name }: AdminTopBarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0`;
    router.push("/");
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      <div />
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm">
          <User className="h-4 w-4 text-slate-500" />
          <span className="text-slate-700">{name ?? email}</span>
        </div>
        <Button variant="outline" size="sm" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </header>
  );
}
