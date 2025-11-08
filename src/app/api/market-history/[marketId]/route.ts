// app/api/market-history/[marketId]/route.ts
// Get historical data for a specific market

import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(
  request: Request,
  context: { params: { marketId: string } }
) {
  try {
    const { marketId } = context.params;

    const { searchParams } = new URL(request.url);
    const hours = parseInt(searchParams.get("hours") || "96"); // Default 4 days

    const history = await prisma.marketSnapshot.findMany({
      where: {
        marketId,
        capturedAt: {
          gte: new Date(Date.now() - hours * 60 * 60 * 1000),
        },
      },
      orderBy: { capturedAt: "asc" },
    });

    const market = await prisma.market.findUnique({
      where: { id: marketId },
    });

    return NextResponse.json({
      market,
      history,
      dataPoints: history.length,
      timeRange: `${hours} hours`,
    });
  } catch (error) {
    console.error("Error fetching market history:", error);

    return NextResponse.json(
      { error: "Failed to fetch market history" },
      { status: 500 }
    );
  }
}
