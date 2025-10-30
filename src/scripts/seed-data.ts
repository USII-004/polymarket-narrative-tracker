// scripts/seed-data.ts
// Run this to populate your database with initial data

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...\n');

  // 1. Seed some PolyMarket markets
  console.log('📊 Seeding markets...');
  
  const markets = [
    {
      id: 'trump-2024-election',
      title: 'Will Donald Trump win the 2024 U.S. Presidential election?',
      category: 'Politics',
      yesPrice: 0.58,
      noPrice: 0.42,
      volume: 15000000,
    },
    {
      id: 'biden-approval-rating',
      title: 'Will Biden\'s approval rating be above 45% by end of Q1 2025?',
      category: 'Politics',
      yesPrice: 0.35,
      noPrice: 0.65,
      volume: 5000000,
    },
    {
      id: 'bitcoin-100k-2025',
      title: 'Will Bitcoin reach $100,000 in 2025?',
      category: 'Crypto',
      yesPrice: 0.72,
      noPrice: 0.28,
      volume: 25000000,
    },
    {
      id: 'eth-etf-approval',
      title: 'Will an Ethereum spot ETF be approved by SEC in 2025?',
      category: 'Crypto',
      yesPrice: 0.68,
      noPrice: 0.32,
      volume: 12000000,
    },
    {
      id: 'congress-flip-2024',
      title: 'Will Republicans control both House and Senate after 2024 elections?',
      category: 'Politics',
      yesPrice: 0.51,
      noPrice: 0.49,
      volume: 8000000,
    },
  ];

  for (const market of markets) {
    await prisma.polymarketMarket.upsert({
      where: { id: market.id },
      update: market,
      create: { ...market, lastUpdated: new Date() },
    });
  }
  
  console.log(`✅ Created ${markets.length} markets\n`);

  // 2. Seed some news articles
  console.log('📰 Seeding news articles...');
  
  const articles = [
    {
      title: 'Trump Leads in New Swing State Polls Ahead of 2024 Election',
      url: 'https://example.com/trump-polls-1',
      topic: 'Politics',
      source: 'Political News',
      sentiment: 0.6,
      summary: 'Recent polling shows Trump gaining ground in key battleground states.',
    },
    {
      title: 'Trump Campaign Announces Major Fundraising Success',
      url: 'https://example.com/trump-fundraising',
      topic: 'Politics',
      source: 'Campaign Update',
      sentiment: 0.7,
      summary: 'Trump campaign raises record amounts in Q4 2024.',
    },
    {
      title: 'Presidential Polls Show Tight Race in Wisconsin',
      url: 'https://example.com/wisconsin-polls',
      topic: 'Politics',
      source: 'State Politics',
      sentiment: 0.1,
      summary: 'Wisconsin remains a crucial battleground state.',
    },
    {
      title: 'Bitcoin Surges Past $95,000 on ETF Optimism',
      url: 'https://example.com/bitcoin-surge-1',
      topic: 'Crypto',
      source: 'Crypto News',
      sentiment: 0.8,
      summary: 'Bitcoin reaches new all-time highs amid institutional interest.',
    },
    {
      title: 'Institutional Investors Pile into Bitcoin as Price Rallies',
      url: 'https://example.com/bitcoin-institutional',
      topic: 'Crypto',
      source: 'Finance Daily',
      sentiment: 0.75,
      summary: 'Major institutions increase Bitcoin holdings.',
    },
    {
      title: 'Bitcoin Mining Difficulty Reaches New Record High',
      url: 'https://example.com/bitcoin-mining',
      topic: 'Crypto',
      source: 'Mining Report',
      sentiment: 0.3,
      summary: 'Network difficulty adjustment shows strong miner participation.',
    },
    {
      title: 'SEC Commissioner Hints at Ethereum ETF Approval Timeline',
      url: 'https://example.com/eth-etf-1',
      topic: 'Crypto',
      source: 'Regulatory News',
      sentiment: 0.65,
      summary: 'SEC may approve Ethereum spot ETF in coming months.',
    },
    {
      title: 'Ethereum ETF Applications Pile Up at SEC',
      url: 'https://example.com/eth-etf-2',
      topic: 'Crypto',
      source: 'Crypto Regulatory',
      sentiment: 0.5,
      summary: 'Multiple asset managers submit Ethereum ETF proposals.',
    },
    {
      title: 'Biden Approval Ratings Slip in Latest National Poll',
      url: 'https://example.com/biden-approval-1',
      topic: 'Politics',
      source: 'Polling Center',
      sentiment: -0.4,
      summary: 'President\'s approval rating drops to 42% nationally.',
    },
    {
      title: 'Congressional Control Remains Uncertain as Elections Approach',
      url: 'https://example.com/congress-race',
      topic: 'Politics',
      source: 'Election Watch',
      sentiment: 0.0,
      summary: 'Senate and House races remain highly competitive.',
    },
  ];

  for (const article of articles) {
    await prisma.newsArticle.create({
      data: {
        ...article,
        publishedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random date within last week
      },
    });
  }
  
  console.log(`✅ Created ${articles.length} news articles\n`);

  // 3. Create some narratives
  console.log('🧠 Creating narratives...');
  
  const narratives = [
    {
      title: 'Trump Gains Momentum in 2024 Presidential Race',
      topic: 'Politics',
      keywords: ['trump', 'polls', 'election', '2024', 'campaign'],
      avgSentiment: 0.65,
      articleCount: 2,
    },
    {
      title: 'Bitcoin Rallies Toward $100K Milestone',
      topic: 'Crypto',
      keywords: ['bitcoin', 'price', 'rally', 'institutional', 'etf'],
      avgSentiment: 0.77,
      articleCount: 3,
    },
    {
      title: 'Ethereum ETF Approval Speculation Intensifies',
      topic: 'Crypto',
      keywords: ['ethereum', 'etf', 'sec', 'approval', 'regulation'],
      avgSentiment: 0.57,
      articleCount: 2,
    },
    {
      title: 'Biden Administration Faces Approval Challenges',
      topic: 'Politics',
      keywords: ['biden', 'approval', 'rating', 'poll'],
      avgSentiment: -0.4,
      articleCount: 1,
    },
  ];

  const createdNarratives = [];
  for (const narrative of narratives) {
    const created = await prisma.narrative.create({
      data: narrative,
    });
    createdNarratives.push(created);
  }
  
  console.log(`✅ Created ${narratives.length} narratives\n`);

  // 4. Link narratives to markets
  console.log('🔗 Linking narratives to markets...');
  
  const links = [
    {
      narrativeId: createdNarratives[0].id, // Trump narrative
      marketId: 'trump-2024-election',
      similarity: 0.92,
    },
    {
      narrativeId: createdNarratives[1].id, // Bitcoin narrative
      marketId: 'bitcoin-100k-2025',
      similarity: 0.88,
    },
    {
      narrativeId: createdNarratives[2].id, // Ethereum ETF narrative
      marketId: 'eth-etf-approval',
      similarity: 0.90,
    },
    {
      narrativeId: createdNarratives[3].id, // Biden narrative
      marketId: 'biden-approval-rating',
      similarity: 0.85,
    },
  ];

  for (const link of links) {
    await prisma.narrativeMarketLink.create({
      data: link,
    });
  }
  
  console.log(`✅ Created ${links.length} narrative-market links\n`);

  // 5. Create some alerts
  console.log('🚨 Creating sample alerts...');
  
  const alerts = [
    {
      type: 'NewNarrative',
      message: '🆕 *New Narrative Detected*\n\n*Trump Gains Momentum in 2024 Presidential Race*\n\n📊 Sentiment: 0.65\n📰 Articles: 2\n🏷️ Topic: Politics\n\n🎯 *Linked Market*\nWill Donald Trump win the 2024 U.S. Presidential election?\nYES: 58.0% | NO: 42.0%',
      topic: 'Politics',
    },
    {
      type: 'NewNarrative',
      message: '🆕 *New Narrative Detected*\n\n*Bitcoin Rallies Toward $100K Milestone*\n\n📊 Sentiment: 0.77\n📰 Articles: 3\n🏷️ Topic: Crypto\n\n🎯 *Linked Market*\nWill Bitcoin reach $100,000 in 2025?\nYES: 72.0% | NO: 28.0%',
      topic: 'Crypto',
    },
    {
      type: 'SentimentChange',
      message: '📊 *Sentiment Shift Detected*\n\n*Ethereum ETF Approval Speculation Intensifies*\n\n📈 Rising: +25%\nCurrent: 0.57\nPrevious: 0.32\n🏷️ Topic: Crypto\n\n🎯 *Related Market*\nWill an Ethereum spot ETF be approved by SEC in 2025?\nYES: 68.0%',
      topic: 'Crypto',
    },
  ];

  for (const alert of alerts) {
    await prisma.alert.create({
      data: alert,
    });
  }
  
  console.log(`✅ Created ${alerts.length} alerts\n`);

  // 6. Link articles to narratives
  console.log('📎 Linking articles to narratives...');
  
  const articleUpdates = [
    { url: 'https://example.com/trump-polls-1', narrativeId: createdNarratives[0].id },
    { url: 'https://example.com/trump-fundraising', narrativeId: createdNarratives[0].id },
    { url: 'https://example.com/bitcoin-surge-1', narrativeId: createdNarratives[1].id },
    { url: 'https://example.com/bitcoin-institutional', narrativeId: createdNarratives[1].id },
    { url: 'https://example.com/bitcoin-mining', narrativeId: createdNarratives[1].id },
    { url: 'https://example.com/eth-etf-1', narrativeId: createdNarratives[2].id },
    { url: 'https://example.com/eth-etf-2', narrativeId: createdNarratives[2].id },
    { url: 'https://example.com/biden-approval-1', narrativeId: createdNarratives[3].id },
  ];

  for (const update of articleUpdates) {
    await prisma.newsArticle.update({
      where: { url: update.url },
      data: { narrativeId: update.narrativeId },
    });
  }
  
  console.log(`✅ Linked ${articleUpdates.length} articles to narratives\n`);

  console.log('✨ Database seeding completed successfully!\n');
  console.log('📊 Summary:');
  console.log(`   - Markets: ${markets.length}`);
  console.log(`   - Articles: ${articles.length}`);
  console.log(`   - Narratives: ${narratives.length}`);
  console.log(`   - Links: ${links.length}`);
  console.log(`   - Alerts: ${alerts.length}\n`);
  console.log('🚀 Your dashboard should now display data!');
  console.log('   Visit: http://localhost:3000\n');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });