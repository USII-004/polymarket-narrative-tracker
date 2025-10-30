// scripts/manual-fetch.ts
// Manually fetch real data from APIs without waiting for cron

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function fetchPolymarketData() {
  console.log('📊 Fetching PolyMarket data...');
  
  const baseUrl = 'https://gamma-api.polymarket.com';
  const categories = ['Politics', 'Crypto'];
  let totalFetched = 0;

  for (const category of categories) {
    try {
      const response = await fetch(`${baseUrl}/markets?limit=100&active=true`);
      
      if (!response.ok) {
        console.error(`❌ PolyMarket API error: ${response.statusText}`);
        continue;
      }

      const markets = await response.json();
      
      const categoryKeywords: Record<string, string[]> = {
        Politics: ['trump', 'biden', 'election', 'president', 'congress', 'senate', 'vote', 'campaign', 'republican', 'democrat'],
        Crypto: ['bitcoin', 'ethereum', 'crypto', 'sec', 'etf', 'blockchain', 'defi', 'btc', 'eth', 'solana'],
      };

      const keywords = categoryKeywords[category] || [];
      const relevantMarkets = markets.filter((m: any) =>
        keywords.some(kw => m.question?.toLowerCase().includes(kw))
      );

      console.log(`   Found ${relevantMarkets.length} ${category} markets`);

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
        totalFetched++;
      }
    } catch (error) {
      console.error(`❌ Error fetching ${category} markets:`, error);
    }
  }

  console.log(`✅ Fetched ${totalFetched} total markets\n`);
}

async function fetchNewsData() {
  console.log('📰 Fetching news articles...');
  
  const apiKey = process.env.NEWS_API_KEY;
  
  if (!apiKey) {
    console.log('⚠️  NEWS_API_KEY not found. Skipping news fetch.');
    console.log('   Get a free key at: https://newsapi.org\n');
    return;
  }

  const topics = ['Politics', 'Crypto'];
  const topicKeywords: Record<string, string[]> = {
    Politics: ['Trump', 'Biden', 'election', 'Congress', 'poll'],
    Crypto: ['Bitcoin', 'Ethereum', 'crypto', 'SEC', 'ETF'],
  };

  let totalFetched = 0;

  for (const topic of topics) {
    try {
      const keywords = topicKeywords[topic] || [];
      const query = keywords.join(' OR ');
      
      const response = await fetch(
        `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=50&apiKey=${apiKey}`
      );

      if (!response.ok) {
        console.error(`❌ News API error for ${topic}: ${response.statusText}`);
        continue;
      }

      const data = await response.json();
      const articles = data.articles || [];

      console.log(`   Found ${articles.length} ${topic} articles`);

      for (const article of articles) {
        try {
          const existing = await prisma.newsArticle.findUnique({
            where: { url: article.url },
          });
          
          if (existing) continue;

          // Simple sentiment calculation
          const text = `${article.title} ${article.description || ''}`.toLowerCase();
          const positiveWords = ['win', 'lead', 'surge', 'gain', 'rise', 'up', 'boost', 'approve', 'success', 'rally', 'soar'];
          const negativeWords = ['lose', 'fall', 'drop', 'decline', 'down', 'crash', 'reject', 'fail', 'crisis', 'plunge'];
          
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
          totalFetched++;
        } catch (error) {
          // Skip duplicate articles
          continue;
        }
      }
    } catch (error) {
      console.error(`❌ Error fetching ${topic} news:`, error);
    }
  }

  console.log(`✅ Fetched ${totalFetched} new articles\n`);
}

async function main() {
  console.log('🚀 Starting manual data fetch...\n');

  await fetchPolymarketData();
  await fetchNewsData();

  console.log('✨ Data fetch completed!\n');
  console.log('📊 Database summary:');
  
  const marketCount = await prisma.polymarketMarket.count();
  const articleCount = await prisma.newsArticle.count();
  const narrativeCount = await prisma.narrative.count();
  
  console.log(`   - Markets: ${marketCount}`);
  console.log(`   - Articles: ${articleCount}`);
  console.log(`   - Narratives: ${narrativeCount}\n`);

  if (articleCount > 0 && marketCount > 0) {
    console.log('✅ Ready to generate narratives!');
    console.log('   Run: curl -X GET http://localhost:3000/api/cron/process-narratives \\');
    console.log('        -H "Authorization: Bearer your-cron-secret"\n');
  }

  console.log('🌐 Refresh your dashboard: http://localhost:3000\n');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });