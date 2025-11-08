// app/api/stats/route.ts
// System statistics

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const [
      currentTop20Count,
      totalSnapshots,
      recentEvents,
      oldestSnapshot,
      totalMarkets
    ] = await Promise.all([
      prisma.market.count({ where: { isCurrentTop20: true } }),
      prisma.marketSnapshot.count(),
      prisma.trendingEvent.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      }),
      prisma.marketSnapshot.findFirst({
        orderBy: { capturedAt: 'asc' }
      }),
      prisma.market.count()
    ]);

    const topMarket = await prisma.market.findFirst({
      where: { isCurrentTop20: true },
      orderBy: { volume24h: 'desc' }
    });

    const totalVolume24h = await prisma.market.aggregate({
      where: { isCurrentTop20: true },
      _sum: { volume24h: true }
    });

    return NextResponse.json({
      currentTop20: currentTop20Count,
      totalMarkets,
      totalSnapshots,
      recentEvents,
      dataStartDate: oldestSnapshot?.capturedAt,
      totalVolume24h: totalVolume24h._sum.volume24h || 0,
      topMarket: topMarket ? {
        title: topMarket.title,
        volume24h: topMarket.volume24h,
        yesPrice: topMarket.yesPrice,
        noPrice: topMarket.noPrice
      } : null,
      lastUpdated: topMarket?.lastUpdated,
      sortedBy: '24-hour volume',
      updateFrequency: 'Every 4 hours'
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}