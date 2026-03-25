import { redirect } from 'next/navigation'
import { createClient } from "@/lib/supabase/server";
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Auth",
  description: "Authorizing you in our system"
}

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()

  const { data: { user } } = await (await supabase).auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return <>{children}</>
}