"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import type { ParsedHolding } from "@/lib/portfolio-parser";

export async function savePortfolio(name: string, holdings: ParsedHolding[]) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  // One portfolio per user in v1 — replace on re-upload
  await db.portfolio.deleteMany({ where: { userId } });

  const portfolio = await db.portfolio.create({
    data: {
      userId,
      name,
      holdings: {
        create: holdings.map((h) => ({
          name: h.name,
          schemeCode: h.schemeCode ?? null,
          isin: h.isin ?? null,
          units: h.units,
          nav: h.nav,
          currentValue: h.currentValue,
          assetType: h.assetType,
          isPledgeable: h.isPledgeable,
          haircut: h.haircut,
          pledgeableValue: h.pledgeableValue,
        })),
      },
    },
    select: { id: true },
  });

  redirect("/dashboard");
}

export async function getPortfolio() {
  const session = await auth();
  if (!session?.user?.id) return null;

  return db.portfolio.findFirst({
    where: { userId: session.user.id },
    include: { holdings: { orderBy: { currentValue: "desc" } } },
    orderBy: { updatedAt: "desc" },
  });
}