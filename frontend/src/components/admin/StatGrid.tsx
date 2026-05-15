import { ReactNode } from "react";

interface StatGridProps {
  children: ReactNode;
}

export function StatGrid({ children }: StatGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {children}
    </div>
  );
}
