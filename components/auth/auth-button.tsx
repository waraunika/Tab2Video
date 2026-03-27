import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/auth/logout-button";
import Image from "next/image";
import { DashboardLink } from "../dashboard-link";

export async function AuthButton() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex gap-2">
        <Button asChild size="sm" variant={"outline"}>
          <Link href="/auth/login">Sign in</Link>
        </Button>
        <Button asChild size="sm" variant={"default"}>
          <Link href="/auth/sign-up">Sign up</Link>
        </Button>
      </div>
    );
  }

  const getUserCredits = () => {
    if (user.user_metadata?.display_name) {
      return user.user_metadata.display_name;
    }
    return user.email;
  };

  let avatarUrl = null;
  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("Error fetching avatar:", profileError);
  } else if (profileData) {
    avatarUrl = profileData.avatar_url;
  }

  return (
    <div className="flex items-center gap-4 justify-between w-full">
      <DashboardLink />

      <div className="flex items-center gap-3">
        
        <span>Good to see you, {getUserCredits()}!</span>
        {avatarUrl && (
          <div className="relative w-8 h-8 rounded-full overflow-hidden">
            <Image
              src={avatarUrl}
              alt="User avatar"
              fill
              className="object-cover"
            />
          </div>
        )}
        <LogoutButton />
      </div>
    </div>
  );
}