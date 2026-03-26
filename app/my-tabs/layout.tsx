import { Suspense } from "react";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Welcome to your Home Page",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();

  const { data: { user } } = await (await supabase).auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }
  
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col items-center">
        <Navbar />
        <div className="flex-1 flex flex-col max-w-5xl p-5">
          <Suspense>
            <div className="container mx-auto px-4 py-8">
              {children}
            </div>
          </Suspense>
        </div>
      </div>
    </main>
  );
}
