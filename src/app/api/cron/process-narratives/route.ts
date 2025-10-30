// app/api/cron/process-narratives/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Generate embedding via OpenAI
async function getEmbedding(text: string): Promise<number[]> {
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
        input: text.slice(0, 8000),
      }),
    });

    if (!response.ok) throw new Error('OpenAI API error');
    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    return [];
  }
}

// Calculate cosine similarity
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;
  
  let dotProduct = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);
  
  return (normA === 0 || normB === 0) ? 0 : dotProduct / (normA * normB);
}

// Generate narratives
async function generateNarratives(topic: string) {
  const articles = await prisma.newsArticle.findMany({
    where: {
      topic,
      narrativeId: null,
      publishedAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
    },
    orderBy: { publishedAt: 'desc' },
    take: 100,
  });

  if (articles.length === 0) return;

  // Generate embeddings
  const articlesWithEmbeddings = [];
  for (const article of articles) {
    const embedding = await getEmbedding(article.title);
    if (embedding.length > 0) {
      articlesWithEmbeddings.push({ ...article, embedding });
    }
    await new Promise(resolve => setTimeout(resolve, 200)); // Rate limit
  }

  // Cluster by similarity
  const used = new Set<string>();
  const clusters: any[] = [];

  for (const article of articlesWithEmbeddings) {
    if (used.has(article.id)) continue;

    const cluster = [article];
    used.add(article.id);

    for (const other of articlesWithEmbeddings) {
      if (used.has(other.id)) continue;
      const similarity = cosineSimilarity(article.embedding, other.embedding);
      if (similarity >= 0.75) {
        cluster.push(other);
        used.add(other.id);
      }
    }

    if (cluster.length >= 2) {
      clusters.push(cluster);
    }
  }

  // Create narratives
  for (const cluster of clusters) {
    const avgSentiment = cluster.reduce((sum: number, a: any) => sum + a.sentiment, 0) / cluster.length;
    const title = cluster[0].title.slice(0, 100);

    const narrative = await prisma.narrative.create({
      data: {
        title,
        topic,
        keywords: [],
        avgSentiment,
        embedding: JSON.stringify(cluster[0].embedding),
        articleCount: cluster.length,
      },
    });

    await prisma.newsArticle.updateMany({
      where: { id: { in: cluster.map((a: any) => a.id) } },
      data: { narrativeId: narrative.id },
    });
  }
}

// Link narratives to markets
async function linkNarrativesToMarkets(topic: string) {
  const narratives = await prisma.narrative.findMany({
    where: {
      topic,
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });

  const markets = await prisma.polymarketMarket.findMany({
    where: { category: topic },
  });

  for (const narrative of narratives) {
    const narrativeEmbedding = narrative.embedding 
      ? JSON.parse(narrative.embedding) 
      : await getEmbedding(narrative.title);

    for (const market of markets) {
      const marketEmbedding = await getEmbedding(market.title);
      const similarity = cosineSimilarity(narrativeEmbedding, marketEmbedding);

      if (similarity >= 0.75) {
        await prisma.narrativeMarketLink.upsert({
          where: {
            narrativeId_marketId: {
              narrativeId: narrative.id,
              marketId: market.id,
            },
          },
          update: { similarity },
          create: {
            narrativeId: narrative.id,
            marketId: market.id,
            similarity,
          },
        });
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 200)); // Rate limit
  }
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await generateNarratives('Politics');
    await generateNarratives('Crypto');
    await linkNarrativesToMarkets('Politics');
    await linkNarrativesToMarkets('Crypto');

    return NextResponse.json({ 
      success: true, 
      message: 'Narratives processed successfully' 
    });
  } catch (error) {
    console.error('Error processing narratives:', error);
    return NextResponse.json(
      { error: 'Failed to process narratives' },
      { status: 500 }
    );
  }
}