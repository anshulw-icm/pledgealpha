import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getYieldAnalysis } from "@/app/actions/yield";
import YieldClient from "./yield-client";
import type { RiskAppetite } from "@/app/actions/strategy";

const VALID_RISKS: RiskAppetite[] = ["conservative", "moderate", "aggressive"];

export default async function YieldPage({
  searchParams,
}: {
  searchParams: Promise<{ risk?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { risk } = await searchParams;
  const riskAppetite: RiskAppetite = VALID_RISKS.includes(risk as RiskAppetite)
    ? (risk as RiskAppetite)
    : "moderate";

  try {
    const data = await getYieldAnalysis(riskAppetite);
    return <YieldClient data={data} />;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load yield analysis.";
    return (
      <div className="min-h-screen bg-pa-black flex items-center justify-center p-6">
        <div className="bg-pa-surface-1 border border-pa-loss/30 rounded-2xl p-8 max-w-md w-full text-center space-y-5">
          <p className="text-pa-loss text-[14px]">{message}</p>
          <div className="flex gap-4 justify-center">
            <Link href="/dashboard/upload" className="text-pa-profit text-[13px] hover:underline">
              Upload Portfolio
            </Link>
            <Link href="/dashboard" className="text-pa-text-3 text-[13px] hover:text-pa-text-1">
              ← Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }
}
