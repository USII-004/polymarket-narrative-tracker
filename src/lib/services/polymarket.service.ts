// lib/services/polymarket.service.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface PolymarketMarketData {
  id: string;
  question: string;
  category: string;
  outcomes: string[];
  outcomePrices: string[];
  volume: string;
  active: boolean;
}

export class PolymarketService {
  private baseUrl = 'https://gamma-api.polymarket.com';

  /**
   * Fetch active markets from PolyMarket API
   */
  async fetchActiveMarkets(categories: string[] = ['Politics', 'Crypto']): Promise<void> {
    try {
      console.log('Fetching active PolyMarket markets...');

      for (const category of categories) {
        const response = await fetch(
          `${this.baseUrl}/markets?limit=100&active=true`
        );

        if (!response.ok) {
          throw new Error(`PolyMarket API error: ${response.statusText}`);
        }

        const markets = await response.json();

        // Filter by category and store
        const relevantMarkets = markets.filter((m: any) => 
          this.isCategoryMatch(m, category)
        );

        for (const market of relevantMarkets) {
          await this.storeMarket(market, category);
        }

        console.log(`Stored ${relevantMarkets.length} ${category} markets`);
      }
    } catch (error) {
      console.error('Error fetching PolyMarket data:', error);
      throw error;
    }
  }

  /**
   * Check if market belongs to category (basic keyword matching)
   */
  private isCategoryMatch(market: any, category: string): boolean {
    const title = market.question?.toLowerCase() || '';
    
    const categoryKeywords: Record<string, string[]> = {
      Politics: [
        'trump', 'biden', 'election', 'president', 'congress', 'senate',
        'democrat', 'republican', 'vote', 'campaign', 'political', 'governor',
        'prime minister', 'parliament', 'policy', 'government'
      ],
      Crypto: [
        'bitcoin', 'btc', 'ethereum', 'eth', 'crypto', 'sec', 'etf',
        'blockchain', 'defi', 'nft', 'token', 'coin', 'binance', 'coinbase',
        'solana', 'cardano', 'regulation', 'mining'
      ]
    };

    const keywords = categoryKeywords[category] || [];
    return keywords.some(keyword => title.includes(keyword));
  }

  /**
   * Store or update market in database
   */
  private async storeMarket(market: any, category: string): Promise<void> {
    try {
      // Extract yes/no prices (assuming binary outcome)
      const yesPrice = parseFloat(market.outcomePrices?.[0] || '0.5');
      const noPrice = parseFloat(market.outcomePrices?.[1] || '0.5');
      const volume = parseFloat(market.volume || '0');

      await prisma.polymarketMarket.upsert({
        where: { id: market.id },
        update: {
          title: market.question,
          category,
          yesPrice,
          noPrice,
          volume,
          lastUpdated: new Date(),
        },
        create: {
          id: market.id,
          title: market.question,
          category,
          yesPrice,
          noPrice,
          volume,
          lastUpdated: new Date(),
        },
      });
    } catch (error) {
      console.error(`Error storing market ${market.id}:`, error);
    }
  }

  /**
   * Get all active markets by category
   */
  async getMarketsByCategory(category: string) {
    return prisma.polymarketMarket.findMany({
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
  }

  /**
   * Get market by ID with linked narratives
   */
  async getMarketById(id: string) {
    return prisma.polymarketMarket.findUnique({
      where: { id },
      include: {
        links: {
          include: {
            narrative: {
              include: {
                articles: {
                  take: 5,
                  orderBy: { publishedAt: 'desc' },
                },
                posts: {
                  take: 5,
                  orderBy: { createdAt: 'desc' },
                },
              },
            },
          },
          orderBy: {
            similarity: 'desc',
          },
        },
      },
    });
  }

  /**
   * Get trending markets (high volume, recent updates)
   */
  async getTrendingMarkets(limit: number = 10) {
    return prisma.polymarketMarket.findMany({
      take: limit,
      orderBy: [
        { volume: 'desc' },
        { lastUpdated: 'desc' },
      ],
      include: {
        links: {
          include: {
            narrative: true,
          },
          take: 3,
        },
      },
    });
  }
}

export const polymarketService = new PolymarketService();