import { Suspense } from "react";
import { EnvVarWarning } from "./env-var-warning";
import { AuthButton } from "./auth-button";
import { ThemeSwitcher } from "./theme-switcher";
import { hasEnvVars } from "@/lib/utils";
import Logo from "./logo";

export default function Navbar() {
  return (
    <nav className="w-full flex justify-center border-b border-b-foreground/10 h-20">
      <div className="w-full flex justify-between items-center p-3 px-5 text-sm">
        {/* Left side - warning */}
        <Logo />

        {!hasEnvVars ? <EnvVarWarning /> : null}

        {/* Right side - Auth buttons and theme switcher */}
        <div className="flex gap-2 items-center">
          {hasEnvVars ? (
            <Suspense>
              <ThemeSwitcher />
              <AuthButton />
            </Suspense>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
