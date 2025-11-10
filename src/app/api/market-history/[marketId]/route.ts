// app/api/market-history/[marketId]/route.ts
// Get historical data for a specific market

import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(
  request: Request,
  context: { params: Promise<{ marketId: string }> }
) {
  try { 
    const { marketId } = await context.params; // ✅ Required for Next.js 15

    const { searchParams } = new URL(request.url);
    const hours = Number(searchParams.get("hours") || "96");

    // ✅ Fetch history snapshots
    const history = await prisma.marketSnapshot.findMany({
      where: {
        marketId,
        capturedAt: {
          gte: new Date(Date.now() - hours * 60 * 60 * 1000),
        },
      },
      orderBy: { capturedAt: "asc" },
    });

    // ✅ Fetch the actual market
    const market = await prisma.market.findUnique({
      where: { id: marketId },
    });

    if (!market) {
      return NextResponse.json(
        { error: "Market not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      market,
      history,
      dataPoints: history.length,
      timeRangeHours: hours,
    });
  } catch (err) {
    console.error("Error fetching market history:", err);
    return NextResponse.json(
      { error: "Failed to fetch market history" },
      { status: 500 }
    );
  }
}
