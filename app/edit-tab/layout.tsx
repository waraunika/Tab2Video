// app/edit-tab/layout.tsx
import { Suspense } from "react";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Edit Tab",
  description: "Edit your tablature",
};

export default async function EditTabLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await (await supabase).auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <div className="w-full flex flex-col">
      <Navbar />
      <div className="flex-1 w-full mx-auto">
        <div className="w-full max-w-[80%] mx-auto">
          <Suspense>
            <div className="w-full">{children}</div>
          </Suspense>
        </div>
      </div>
    </div>
  );
}
