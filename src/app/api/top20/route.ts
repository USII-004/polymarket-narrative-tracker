// app/api/top20/route.ts
// Get current top 20 markets by daily volume

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const top20 = await prisma.market.findMany({
      where: { isCurrentTop20: true },
      orderBy: { volume24h: 'desc' },
      take: 20
    });

    // Calculate total 24h volume
    const totalVolume24h = top20.reduce((sum, m) => sum + m.volume24h, 0);

    return NextResponse.json({ 
      markets: top20,
      lastUpdated: top20[0]?.lastUpdated || new Date(),
      count: top20.length,
      totalVolume24h,
      sortedBy: 'volume24h'
    });
  } catch (error) {
    console.error('Error fetching top 20:', error);
    return NextResponse.json(
      { error: 'Failed to fetch top 20 markets' },
      { status: 500 }
    );
  }
}