import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getPortfolio } from "@/app/actions/portfolio";
import StrategiesClient from "./strategies-client";

export default async function StrategiesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const portfolio = await getPortfolio();
  if (!portfolio) redirect("/dashboard/upload");

  const marginAvailable = portfolio.holdings.reduce((s, h) => s + h.pledgeableValue, 0);

  return <StrategiesClient marginAvailable={marginAvailable} />;
}
