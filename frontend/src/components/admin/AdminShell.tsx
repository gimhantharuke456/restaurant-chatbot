"use client";

import { useState } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { AdminTopBar } from "./AdminTopBar";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminShellProps {
  children: React.ReactNode;
  email: string;
  name: string | null;
}

export function AdminShell({ children, email, name }: AdminShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-40 transform transition-transform md:relative md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <AdminSidebar />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex h-16 items-center border-b bg-white px-4 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        <AdminTopBar email={email} name={name} />

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
