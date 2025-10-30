// app/api/narratives/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const topic = searchParams.get('topic') || 'Politics';
    const limit = parseInt(searchParams.get('limit') || '10');

    const narratives = await prisma.narrative.findMany({
      where: { topic },
      take: limit,
      orderBy: [
        { articleCount: 'desc' },
        { createdAt: 'desc' },
      ],
      include: {
        articles: {
          take: 3,
          orderBy: { publishedAt: 'desc' },
        },
        links: {
          include: {
            market: true,
          },
          orderBy: {
            similarity: 'desc',
          },
          take: 3,
        },
      },
    });

    return NextResponse.json({ narratives });
  } catch (error) {
    console.error('Error fetching narratives:', error);
    return NextResponse.json(
      { error: 'Failed to fetch narratives' },
      { status: 500 }
    );
  }
}

