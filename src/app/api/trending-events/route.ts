// app/api/trending-events/route.ts
// Get trending events (markets entering/exiting top 20)

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    const events = await prisma.trendingEvent.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ 
      events,
      count: events.length
    });
  } catch (error) {
    console.error('Error fetching trending events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trending events' },
      { status: 500 }
    );
  }
}