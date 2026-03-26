import { createClient } from "@/lib/supabase/server";
import { isUserAdmin } from "@/lib/supabase/admin-check";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import SearchTabs from "@/components/dashboard/SearchTab";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAdmin = await isUserAdmin(user?.id);

  return (
    <div className="flex-1 w-full flex flex-col gap-12">
      <div className="w-full">
        <div className="text-sm p-3 px-5 rounded-md text-foreground flex gap-3 items-center">
          <div className="flex gap-2">
            {isAdmin && (
              <Link href="/admin">
                <Button variant="outline" size="sm">
                  Admin Dashboard
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold">Your Dashboard</h1>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Link href="/upload-tab" className="block">
            <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow">
              <h2 className="text-xl font-semibold mb-2">Upload New Tab</h2>

              <p className="text-muted-foreground">
                Upload a Guitar Pro file to start creating 3D visualizations
              </p>
            </div>
          </Link>

          <Link href="/my-tabs" className="block">
            <div className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
              <h2 className="text-xl font-semibold mb-2">My Tabs</h2>

              <p className="text-muted-foreground">
                View and manage your uploaded tablatures
              </p>
            </div>
          </Link>

          <Link href="/tracks" className="block">
            <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow">
              <h2 className="text-xl font-semibold mb-2">My Tracks</h2>

              <p className="text-muted-foreground">
                Browse your individual tracks and 3D renders
              </p>
            </div>
          </Link>
          

          {isAdmin && (
            <div className="mt-8">
              <h2 className="text-2xl font-semibold mb-4">
                Admin Quick Actions
              </h2>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="border-2 border-yellow-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-2">Manage Users</h3>

                  <p className="text-muted-foreground text-sm mb-4">
                    View and manage user accounts
                  </p>

                  <Link href="/admin/users" className="block">
                    <Button variant="outline" size="sm">
                      Go to Users
                    </Button>
                  </Link>
                </div>

                <div className="border-2 border-yellow-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-2">System Stats</h3>

                  <p className="text-muted-foreground text-sm mb-4">
                    View system performance and usage
                  </p>

                  <Link href="/admin/stats">
                    <Button variant="outline" size="sm">
                      View Stats
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        <SearchTabs />
      </div>
    </div>
  );
}
