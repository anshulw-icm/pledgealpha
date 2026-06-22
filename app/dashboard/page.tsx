import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Logo } from "@/components/logo";
import { getPortfolio } from "@/app/actions/portfolio";
import PortfolioSection from "./portfolio-section";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const portfolio = await getPortfolio();

  const initials =
    session.user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? "PA";

  const holdings = portfolio?.holdings ?? [];
  const totalValue = holdings.reduce((s, h) => s + h.currentValue, 0);
  const pledgeableValue = holdings.reduce((s, h) => s + h.pledgeableValue, 0);
  const pledgeableCount = holdings.filter((h) => h.isPledgeable).length;

  return (
    <div className="min-h-screen bg-pa-black">

      {/* Header */}
      <header className="border-b border-pa-border-1 bg-pa-black/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
          <Logo size="sm" />
          <nav className="hidden sm:flex items-center gap-4 mx-auto">
            <Link href="/dashboard/trades" className="text-pa-text-3 text-[13px] hover:text-pa-text-1 transition-colors">
              Trades
            </Link>
            <Link href="/dashboard/yield?risk=moderate" className="text-pa-text-3 text-[13px] hover:text-pa-text-1 transition-colors">
              Yield
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <span className="text-pa-text-2 text-[13px] hidden sm:block">
              {session.user?.email}
            </span>
            <Avatar className="w-8 h-8">
              <AvatarImage src={session.user?.image ?? ""} />
              <AvatarFallback className="bg-pa-surface-3 text-pa-text-2 text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <Button type="submit" variant="ghost" size="sm" className="text-pa-text-3 hover:text-pa-text-1 hover:bg-pa-surface-2 text-xs">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-10 space-y-8">

        {/* Greeting */}
        <div>
          <h1 className="text-[22px] font-semibold text-pa-text-1 tracking-[-0.02em]">
            Welcome, {session.user?.name?.split(" ")[0]}
          </h1>
          <p className="text-pa-text-2 text-[13px] mt-1">
            {portfolio
              ? `${portfolio.name} · last updated ${new Date(portfolio.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`
              : "Upload your portfolio to begin the simulation."}
          </p>
        </div>

        {portfolio ? (
          <PortfolioSection
            holdings={holdings.map(h => ({
              id: h.id,
              name: h.name,
              units: h.units,
              currentValue: h.currentValue,
              pledgeableValue: h.pledgeableValue,
              isPledgeable: h.isPledgeable,
              haircut: h.haircut,
              assetType: h.assetType,
            }))}
            totalValue={totalValue}
            pledgeableValue={pledgeableValue}
            pledgeableCount={pledgeableCount}
          />
        ) : (
          /* Empty state */
          <div className="border border-dashed border-pa-border-2 rounded-2xl p-20 text-center space-y-4">
            <p className="text-pa-text-2 text-[14px] font-medium">No portfolio yet</p>
            <p className="text-pa-text-3 text-[13px] max-w-xs mx-auto leading-relaxed">
              Upload a CSV, Excel file, or enter your holdings manually — or load a demo portfolio instantly.
            </p>
            <Link href="/dashboard/upload">
              <Button className="bg-white hover:bg-pa-text-1 text-black font-medium mt-2 text-[13px]">
                Upload Portfolio →
              </Button>
            </Link>
          </div>
        )}

        <p className="text-center text-[12px] text-pa-text-4">
          PledgeAlpha is an educational and simulation platform. Not investment advice.
        </p>
      </main>
    </div>
  );
}
