// app/api/cron/fetch-data/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// PolyMarket fetch logic
async function fetchPolymarketData() {
  const baseUrl = 'https://gamma-api.polymarket.com';
  const categories = ['Politics', 'Crypto'];

  for (const category of categories) {
    try {
      const response = await fetch(`${baseUrl}/markets?limit=100&active=true`);
      if (!response.ok) continue;

      const markets = await response.json();
      const categoryKeywords: Record<string, string[]> = {
        Politics: ['trump', 'biden', 'election', 'president', 'congress', 'vote', 'campaign'],
        Crypto: ['bitcoin', 'ethereum', 'crypto', 'sec', 'etf', 'blockchain', 'defi'],
      };

      const keywords = categoryKeywords[category] || [];
      const relevantMarkets = markets.filter((m: any) =>
        keywords.some(kw => m.question?.toLowerCase().includes(kw))
      );

      for (const market of relevantMarkets) {
        await prisma.polymarketMarket.upsert({
          where: { id: market.id },
          update: {
            title: market.question,
            category,
            yesPrice: parseFloat(market.outcomePrices?.[0] || '0.5'),
            noPrice: parseFloat(market.outcomePrices?.[1] || '0.5'),
            volume: parseFloat(market.volume || '0'),
            lastUpdated: new Date(),
          },
          create: {
            id: market.id,
            title: market.question,
            category,
            yesPrice: parseFloat(market.outcomePrices?.[0] || '0.5'),
            noPrice: parseFloat(market.outcomePrices?.[1] || '0.5'),
            volume: parseFloat(market.volume || '0'),
            lastUpdated: new Date(),
          },
        });
      }
    } catch (error) {
      console.error(`Error fetching ${category} markets:`, error);
    }
  }
}

// News fetch logic
async function fetchNewsData() {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) return;

  const topics = ['Politics', 'Crypto'];
  const topicKeywords: Record<string, string[]> = {
    Politics: ['Trump', 'Biden', 'election', 'Congress', 'poll'],
    Crypto: ['Bitcoin', 'Ethereum', 'crypto', 'SEC', 'ETF'],
  };

  for (const topic of topics) {
    try {
      const keywords = topicKeywords[topic] || [];
      const query = keywords.join(' OR ');
      
      const response = await fetch(
        `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=50&apiKey=${apiKey}`
      );

      if (!response.ok) continue;

      const data = await response.json();
      const articles = data.articles || [];

      for (const article of articles) {
        try {
          const existing = await prisma.newsArticle.findUnique({
            where: { url: article.url },
          });
          if (existing) continue;

          // Simple sentiment calculation
          const text = `${article.title} ${article.description || ''}`.toLowerCase();
          const positiveWords = ['win', 'lead', 'surge', 'gain', 'rise', 'up', 'boost', 'approve', 'success', 'rally'];
          const negativeWords = ['lose', 'fall', 'drop', 'decline', 'down', 'crash', 'reject', 'fail', 'crisis'];
          
          let sentiment = 0;
          positiveWords.forEach(w => { if (text.includes(w)) sentiment += 0.1; });
          negativeWords.forEach(w => { if (text.includes(w)) sentiment -= 0.1; });
          sentiment = Math.max(-1, Math.min(1, sentiment));

          await prisma.newsArticle.create({
            data: {
              title: article.title,
              url: article.url,
              topic,
              source: article.source?.name || 'Unknown',
              publishedAt: new Date(article.publishedAt),
              sentiment,
              summary: article.description,
            },
          });
        } catch (error) {
          console.error('Error storing article:', error);
        }
      }
    } catch (error) {
      console.error(`Error fetching ${topic} news:`, error);
    }
  }
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await Promise.all([
      fetchPolymarketData(),
      fetchNewsData(),
    ]);

    return NextResponse.json({ 
      success: true, 
      message: 'Data fetched successfully' 
    });
  } catch (error) {
    console.error('Error in fetch-data cron:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}