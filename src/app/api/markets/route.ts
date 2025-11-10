// app/api/markets/route.ts
// Return list of markets filtered by category (default: Politics)

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'Politics';

    const markets = await prisma.market.findMany({
      where: { category },
      orderBy: { volume24h: 'desc' }, // ✅ field exists in schema
      take: 50, // optional safety limit
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
