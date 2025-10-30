// app/api/cron/send-alerts/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkNewNarratives() {
  const recentNarratives = await prisma.narrative.findMany({
    where: {
      createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
    },
    include: {
      links: {
        include: { market: true },
        take: 1,
      },
    },
  });

  for (const narrative of recentNarratives) {
    const existing = await prisma.alert.findFirst({
      where: {
        type: 'NewNarrative',
        message: { contains: narrative.title },
      },
    });

    if (!existing) {
      let message = `🆕 *New Narrative Detected*\n\n*${narrative.title}*\n\n`;
      message += `📊 Sentiment: ${narrative.avgSentiment.toFixed(2)}\n`;
      message += `📰 Articles: ${narrative.articleCount}\n`;
      message += `🏷️ Topic: ${narrative.topic}\n`;

      if (narrative.links.length > 0) {
        const market = narrative.links[0].market;
        message += `\n🎯 *Linked Market*\n${market.title}\n`;
        message += `YES: ${(market.yesPrice * 100).toFixed(1)}% | NO: ${(market.noPrice * 100).toFixed(1)}%`;
      }

      await prisma.alert.create({
        data: {
          type: 'NewNarrative',
          message,
          topic: narrative.topic,
          metadata: JSON.stringify({ narrativeId: narrative.id }),
        },
      });
    }
  }
}

async function checkSentimentChanges() {
  const narratives = await prisma.narrative.findMany({
    where: {
      updatedAt: { gte: new Date(Date.now() - 6 * 60 * 60 * 1000) },
    },
    include: {
      articles: {
        orderBy: { publishedAt: 'desc' },
        take: 10,
      },
      links: {
        include: { market: true },
        take: 1,
      },
    },
  });

  for (const narrative of narratives) {
    if (narrative.articles.length < 5) continue;

    const recentSentiment = narrative.articles.slice(0, 5)
      .reduce((sum, a) => sum + a.sentiment, 0) / 5;
    const olderSentiment = narrative.articles.slice(5, 10)
      .reduce((sum, a) => sum + a.sentiment, 0) / 5;
    const sentimentChange = Math.abs(recentSentiment - olderSentiment);

    if (sentimentChange > 0.4) {
      const direction = recentSentiment > olderSentiment ? '📈 Rising' : '📉 Falling';
      const change = ((recentSentiment - olderSentiment) * 100).toFixed(0);

      let message = `📊 *Sentiment Shift Detected*\n\n*${narrative.title}*\n\n`;
      message += `${direction}: ${change > '0' ? '+' : ''}${change}%\n`;
      message += `Current: ${recentSentiment.toFixed(2)}\n`;
      message += `Previous: ${olderSentiment.toFixed(2)}\n`;
      message += `🏷️ Topic: ${narrative.topic}`;

      if (narrative.links.length > 0) {
        const market = narrative.links[0].market;
        message += `\n\n🎯 *Related Market*\n${market.title}\n`;
        message += `YES: ${(market.yesPrice * 100).toFixed(1)}%`;
      }

      await prisma.alert.create({
        data: {
          type: 'SentimentChange',
          message,
          topic: narrative.topic,
          metadata: JSON.stringify({
            narrativeId: narrative.id,
            recentSentiment,
            olderSentiment,
          }),
        },
      });
    }
  }
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await checkNewNarratives();
    await checkSentimentChanges();

    return NextResponse.json({ 
      success: true, 
      message: 'Alerts processed successfully' 
    });
  } catch (error) {
    console.error('Error processing alerts:', error);
    return NextResponse.json(
      { error: 'Failed to process alerts' },
      { status: 500 }
    );
  }
}