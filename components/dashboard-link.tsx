"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function DashboardLink() {
  const pathname = usePathname();

  if (pathname?.startsWith("/dashboard")) {
    return null;
  }
  return (
    <div>
      <Link href="/dashboard">Go to Dashboard</Link>
    </div>
  );
}
