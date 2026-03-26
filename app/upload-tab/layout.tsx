import { Suspense } from "react";
import Navbar from "@/components/Navbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col items-center">
        <Navbar />
        <div className="flex-1 flex flex-col w-full p-5">
          <Suspense>{children}</Suspense>          
        </div>
      </div>
    </main>
  );
}
