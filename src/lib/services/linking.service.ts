// lib/services/linking.service.ts

import { PrismaClient } from '@prisma/client';
import { getEmbedding, cosineSimilarity } from '../utils/embeddings';

const prisma = new PrismaClient();

export class LinkingService {
  /**
   * Link narratives to relevant PolyMarket markets
   */
  async linkNarrativesToMarkets(topic: string): Promise<void> {
    try {
      console.log(`Linking ${topic} narratives to markets...`);

      // Get narratives without embeddings or recently created
      const narratives = await prisma.narrative.findMany({
        where: {
          topic,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      });

      // Get all markets for this topic
      const markets = await prisma.polymarketMarket.findMany({
        where: { category: topic },
      });

      console.log(`Processing ${narratives.length} narratives and ${markets.length} markets`);

      // Generate embeddings for markets if needed
      const marketsWithEmbeddings = await Promise.all(
        markets.map(async (market) => {
          const embedding = await getEmbedding(market.title);
          return { ...market, embedding };
        })
      );

      // Link each narrative to similar markets
      for (const narrative of narratives) {
        await this.linkNarrative(narrative, marketsWithEmbeddings);
      }

      console.log('Linking complete');
    } catch (error) {
      console.error('Error linking narratives to markets:', error);
      throw error;
    }
  }

  /**
   * Link a single narrative to markets
   */
  private async linkNarrative(
    narrative: any,
    markets: Array<any>
  ): Promise<void> {
    try {
      // Get or generate narrative embedding
      let narrativeEmbedding: number[];
      
      if (narrative.embedding) {
        narrativeEmbedding = JSON.parse(narrative.embedding);
      } else {
        narrativeEmbedding = await getEmbedding(narrative.title);
        await prisma.narrative.update({
          where: { id: narrative.id },
          data: { embedding: JSON.stringify(narrativeEmbedding) },
        });
      }

      // Find similar markets
      const similarities = markets.map((market) => ({
        marketId: market.id,
        similarity: cosineSimilarity(narrativeEmbedding, market.embedding),
      }));

      // Filter by threshold and sort
      const relevantMarkets = similarities
        .filter((item) => item.similarity >= 0.75)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 5); // Top 5 most similar

      // Create links
      for (const { marketId, similarity } of relevantMarkets) {
        await prisma.narrativeMarketLink.upsert({
          where: {
            narrativeId_marketId: {
              narrativeId: narrative.id,
              marketId,
            },
          },
          update: { similarity },
          create: {
            narrativeId: narrative.id,
            marketId,
            similarity,
          },
        });
      }

      if (relevantMarkets.length > 0) {
        console.log(`Linked narrative "${narrative.title}" to ${relevantMarkets.length} markets`);
      }
    } catch (error) {
      console.error(`Error linking narrative ${narrative.id}:`, error);
    }
  }

  /**
   * Get narratives linked to a specific market
   */
  async getNarrativesForMarket(marketId: string) {
    const links = await prisma.narrativeMarketLink.findMany({
      where: { marketId },
      include: {
        narrative: {
          include: {
            articles: {
              take: 5,
              orderBy: { publishedAt: 'desc' },
            },
          },
        },
      },
      orderBy: { similarity: 'desc' },
    });

    return links.map((link) => ({
      ...link.narrative,
      similarity: link.similarity,
    }));
  }

  /**
   * Get markets linked to a specific narrative
   */
  async getMarketsForNarrative(narrativeId: string) {
    const links = await prisma.narrativeMarketLink.findMany({
      where: { narrativeId },
      include: {
        market: true,
      },
      orderBy: { similarity: 'desc' },
    });

    return links.map((link) => ({
      ...link.market,
      similarity: link.similarity,
    }));
  }

  /**
   * Get top narrative-market pairs by similarity
   */
  async getTopLinks(limit: number = 20) {
    return prisma.narrativeMarketLink.findMany({
      take: limit,
      orderBy: { similarity: 'desc' },
      include: {
        narrative: true,
        market: true,
      },
    });
  }
}

export const linkingService = new LinkingService();