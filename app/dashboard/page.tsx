import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/logo";
import { getPortfolio } from "@/app/actions/portfolio";
import { COLLATERAL_RULES, type AssetType } from "@/lib/collateral-data";

type DBHolding = {
  id: string;
  name: string;
  units: number;
  currentValue: number;
  pledgeableValue: number;
  isPledgeable: boolean;
  haircut: number;
  assetType: string;
};

const INR = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);

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

  const holdings: DBHolding[] = portfolio?.holdings ?? [];
  const totalValue = holdings.reduce((s, h) => s + h.currentValue, 0);
  const pledgeableValue = holdings.reduce((s, h) => s + h.pledgeableValue, 0);
  const pledgeableCount = holdings.filter((h) => h.isPledgeable).length;

  return (
    <div className="min-h-screen bg-pa-black">

      {/* Header */}
      <header className="border-b border-pa-border-1 bg-pa-black/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
          <Logo size="sm" />
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
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="text-pa-text-3 hover:text-pa-text-1 hover:bg-pa-surface-2 text-xs"
              >
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
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-pa-surface-1 border border-pa-border-1 rounded-2xl p-5">
                <p className="text-pa-text-3 text-[11px] tracking-wide uppercase mb-2">Portfolio Value</p>
                <p className="text-pa-text-1 text-[20px] font-semibold tracking-[-0.02em]">{INR(totalValue)}</p>
                <p className="text-pa-text-4 text-[12px] mt-1">{holdings.length} holdings</p>
              </div>
              <div className="bg-pa-surface-1 border border-pa-profit/20 rounded-2xl p-5">
                <p className="text-pa-text-3 text-[11px] tracking-wide uppercase mb-2">Pledgeable Value</p>
                <p className="text-pa-profit text-[20px] font-semibold tracking-[-0.02em]">{INR(pledgeableValue)}</p>
                <p className="text-pa-text-4 text-[12px] mt-1">{pledgeableCount} of {holdings.length} eligible</p>
              </div>
              <div className="bg-pa-surface-1 border border-pa-border-1 rounded-2xl p-5 col-span-2 sm:col-span-1">
                <p className="text-pa-text-3 text-[11px] tracking-wide uppercase mb-2">Haircut Impact</p>
                <p className="text-pa-text-1 text-[20px] font-semibold tracking-[-0.02em]">{INR(totalValue - pledgeableValue)}</p>
                <p className="text-pa-text-4 text-[12px] mt-1">locked as margin buffer</p>
              </div>
            </div>

            {/* Next step CTA */}
            <div className="bg-pa-surface-1 border border-pa-border-2 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-pa-text-1 font-medium text-[15px] tracking-[-0.01em]">
                  Ready to run strategy scenarios?
                </p>
                <p className="text-pa-text-2 text-[13px] mt-1">
                  Model covered calls, cash-secured puts, and spreads against your{" "}
                  <span className="text-pa-profit font-medium">
                    ₹{pledgeableValue > 0 ? Math.round(pledgeableValue).toLocaleString("en-IN") : "—"}
                  </span>{" "}
                  pledgeable margin.
                </p>
              </div>
              <Link href="/dashboard/strategies">
                <Button className="bg-white hover:bg-pa-text-1 text-black font-medium shrink-0 text-[13px]">
                  Run Scenarios →
                </Button>
              </Link>
            </div>

            {/* Holdings list */}
            <div className="bg-pa-surface-1 border border-pa-border-1 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-pa-border-1 flex items-center justify-between">
                <p className="text-pa-text-1 text-[14px] font-medium">Holdings</p>
                <Link href="/dashboard/upload">
                  <Button variant="ghost" size="sm" className="text-pa-text-3 hover:text-pa-text-1 text-xs">
                    Update →
                  </Button>
                </Link>
              </div>

              <div className="hidden sm:grid grid-cols-[1fr_90px_90px_90px] gap-2 px-5 py-2.5 border-b border-pa-border-1/40">
                <p className="text-pa-text-3 text-[11px] tracking-wide uppercase">Scheme</p>
                <p className="text-pa-text-3 text-[11px] tracking-wide uppercase text-right">Value</p>
                <p className="text-pa-text-3 text-[11px] tracking-wide uppercase text-right">Type</p>
                <p className="text-pa-text-3 text-[11px] tracking-wide uppercase text-right">Pledgeable</p>
              </div>

              <div className="divide-y divide-pa-border-1/60">
                {holdings.slice(0, 8).map((h) => {
                  const rule = COLLATERAL_RULES[h.assetType as AssetType];
                  return (
                    <div
                      key={h.id}
                      className="px-5 py-3.5 sm:grid sm:grid-cols-[1fr_90px_90px_90px] sm:gap-2 flex items-center justify-between"
                    >
                      <div className="min-w-0">
                        <p className="text-pa-text-1 text-[14px] truncate">{h.name}</p>
                        <p className="text-pa-text-3 text-[12px] mt-0.5">
                          {h.units.toLocaleString("en-IN")} units
                        </p>
                      </div>
                      <p className="text-pa-text-1 text-[13px] sm:text-right hidden sm:block">
                        {INR(h.currentValue)}
                      </p>
                      <div className="sm:text-right hidden sm:flex sm:justify-end">
                        <Badge
                          variant="outline"
                          className={`text-[11px] px-2 py-0 ${
                            h.isPledgeable
                              ? "border-pa-profit/30 text-pa-profit"
                              : "border-pa-border-2 text-pa-text-4"
                          }`}
                        >
                          {rule?.label ?? h.assetType}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-pa-text-1 text-[13px] sm:hidden">{INR(h.currentValue)}</p>
                        <p className={`text-[13px] font-medium ${h.isPledgeable ? "text-pa-profit" : "text-pa-text-4"}`}>
                          {h.isPledgeable ? INR(h.pledgeableValue) : "—"}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {holdings.length > 8 && (
                  <div className="px-5 py-3">
                    <p className="text-pa-text-4 text-[12px]">+{holdings.length - 8} more holdings</p>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="border border-dashed border-pa-border-2 rounded-2xl p-20 text-center space-y-4">
            <p className="text-pa-text-2 text-[14px] font-medium">No portfolio yet</p>
            <p className="text-pa-text-3 text-[13px] max-w-xs mx-auto leading-relaxed">
              Upload a CSV, Excel file, or enter your holdings manually to see how much
              margin your mutual funds can unlock.
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
