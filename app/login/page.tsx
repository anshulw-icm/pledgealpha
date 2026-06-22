import { auth, signIn } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/logo";

export default async function LoginPage() {
  const session = await auth();
  if (session) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-pa-black flex flex-col">

      {/* Minimal nav */}
      <header className="h-14 flex items-center px-6 border-b border-pa-border-1/60">
        <Link href="/" className="flex items-center gap-2">
          <Logo size="sm" />
        </Link>
      </header>

      {/* Sign-in content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm flex flex-col gap-8">

          {/* Headline */}
          <div className="text-center">
            <h1 className="text-[26px] font-semibold text-pa-text-1 tracking-[-0.025em] leading-tight mb-2">
              Welcome back
            </h1>
            <p className="text-[15px] text-pa-text-2">
              Sign in to your PledgeAlpha account
            </p>
          </div>

          {/* Card */}
          <div className="bg-pa-surface-1 border border-pa-border-1 rounded-2xl p-6 flex flex-col gap-5">
            <form
              action={async () => {
                "use server";
                await signIn("github", { redirectTo: "/dashboard" });
              }}
            >
              <button
                type="submit"
                className="w-full h-11 rounded-xl bg-white text-black text-[15px] font-medium tracking-[-0.01em] hover:bg-pa-text-1 transition-colors cursor-pointer flex items-center justify-center gap-2.5"
              >
                <svg height="16" viewBox="0 0 16 16" width="16" fill="currentColor">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                </svg>
                Continue with GitHub
              </button>
            </form>

            <div className="border-t border-pa-border-1 pt-4">
              <p className="text-[12px] text-pa-text-3 text-center leading-relaxed">
                Educational platform. All outputs are simulations.<br />Not investment advice.
              </p>
            </div>
          </div>

          <p className="text-[12px] text-pa-text-4 text-center">
            <Link href="/" className="hover:text-pa-text-2 transition-colors">
              ← Back to home
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
