import Link from "next/link";
import { Button } from "./ui/button";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";
import { DashboardLink } from "./dashboard-link";

export async function AuthButton() {
  const supabase = await createClient();

  const { data } = await supabase.auth.getClaims();

  const user = data?.claims;

  function getUserCredits() {
    if (user) {
      if (user.user_metadata) {
        if (user.user_metadata.display_name) {
          return user.user_metadata.display_name;
        }
      }
      return user.email;
    }
  }

  return user ? (
    <div className="flex items-center gap-4 justify-between w-full">
      <DashboardLink />

      <div>
        Good to see you, {getUserCredits()}! <LogoutButton />
      </div>
    </div>
  ) : (
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
