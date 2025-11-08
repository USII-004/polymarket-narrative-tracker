// app/api/markets/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'Politics';

    const markets = await prisma.polymarketMarket.findMany({
      where: { category },
      orderBy: { volume: 'desc' },
      include: {
        links: {
          include: {
            narrative: true,
          },
          orderBy: {
            similarity: 'desc',
          },
        },
      },
    });

    return NextResponse.json({ markets });
  } catch (error) {
    console.error('Error fetching markets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch markets' },
      { status: 500 }
    );
  }
}
