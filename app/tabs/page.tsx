import { createClient } from "@/lib/supabase/server";
import SearchTabs from "@/components/dashboard/SearchTab";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function MyTabsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return <div>Please log in.</div>;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold">My Tabs</h1>
      <p className="text-muted-foreground">
        Manage your uploaded tablatures
      </p>
      <SearchTabs userId={user.id} />
      <div className="mt-4">
        <Link href="/upload-tab">
          <Button>Upload New Tab</Button>
        </Link>
      </div>
    </div>
  );
}