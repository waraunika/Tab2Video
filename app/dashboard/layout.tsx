import { Suspense } from "react";
import Navbar from "@/components/Navbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex flex-col items-center">
<<<<<<< HEAD
      <div className="flex-1 w-full flex flex-col gap-20 items-center">
        <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
          <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
            <div className="flex gap-5 items-center font-semibold">
              <Link href={"/"}>Guitar Tab To Video</Link>
            </div>
            {!hasEnvVars ? (
              <EnvVarWarning />
            ) : (
              <Suspense>
                <ThemeSwitcher />
                <AuthButton />
              </Suspense>
            )}
          </div>
        </nav>
        <div className="flex-1 flex flex-col gap-20 max-w-5xl p-5">
          <Suspense>{children}</Suspense>
        </div>
=======
      <div className="flex-1 w-full flex flex-col items-center">
        <Navbar />
        <div className="flex-1 flex flex-col max-w-5xl p-5">
          <Suspense>
            <h1 className="text-3xl font-bold mb-8 text-zinc-800 dark:text-zinc-200 text-center">
              Upload Tab
            </h1>
>>>>>>> ad4abaa04b6249fb166fcd963e68051128c836e6

            <div className="container mx-auto px-4 py-8">
              {children}
            </div>
          </Suspense>
        </div>
      </div>
    </main>
  );
}
