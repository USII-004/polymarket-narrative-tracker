// lib/services/top20.service.ts
// Fully fixed and normalized service for fetching top 20 markets by 24h volume

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

interface PolyMarketResponse {
  id: string;
  question: string;

  description?: string;
  category?: string;
  image?: string;

  volume?: string | number;

  // Gamma API volume fields
  volume24hr?: number;
  volume24hrClob?: number;
  volume24hrAmm?: number;

  outcomePrices?: string[] | string;

  active: boolean;
  closed: boolean;
  endDate?: string;
}

export class Top20Service {
  private readonly API_URL = 'https://gamma-api.polymarket.com/markets';

  /**
   * Update top 20 markets by 24-hour volume
   */
  async updateTop20() {
    console.log('🔄 Fetching top 20 markets by daily volume...');
    console.log(`⏰ ${new Date().toISOString()}`);

    try {
      // 1. Fetch markets
      const markets = await this.fetchActiveMarkets();

      // 2. Normalize + validate
      const validMarkets = this.filterValidMarkets(markets);
      console.log(`✅ Valid markets: ${validMarkets.length}`);

      if (validMarkets.length === 0) {
        console.warn('⚠️ No valid markets after filtering. Check API response shape.');
      }

      // 3. Select top 20
      const top20 = this.selectTop20ByDailyVolume(validMarkets);

      // 4. Load previous DB state
      const currentTop20 = await this.getCurrentTop20();

      // 5. Snapshot previous state
      if (currentTop20.length > 0) {
        await this.createSnapshot(currentTop20);
      }

      // 6. Trending events
      await this.detectTrendingEvents(currentTop20, top20);

      // 7. Write new top 20
      await this.updateDatabase(top20);

      // 8. Cleanup old data
      await this.cleanup();

      console.log('✅ Finished Top 20 update.');
      return top20;
    } catch (err: any) {
      console.error('❌ Fatal error in updateTop20:', err.message);
      throw err;
    }
  }

  /**
   * Fetch markets from Polymarket gamma API
   */
  private async fetchActiveMarkets(): Promise<PolyMarketResponse[]> {
    const url =
      `${this.API_URL}?active=true&closed=false&limit=200&end_date_before=2025-12-31`;

    console.log(`📡 Fetching: ${url}`);

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'PolyMarket-Top20-Tracker/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Polymarket API error: ${response.status} ${response.statusText}`);
    }

    const json = await response.json();

    // Handle both wrapped `{ markets: [...] }` and direct array `[ ... ]`
    const markets = json.markets ?? json;

    console.log(`📦 Received ${markets.length} markets`);
    console.log('🧩 Sample:', markets[0]);

    return markets;
  }

  /**
   * Clean + validate markets
   */
  private filterValidMarkets(markets: any[]) {
    return markets
      .map((m) => {
        // ✅ 1. Parse outcomePrices (Gamma sends strings)
        let prices: string[] = [];
        try {
          prices = Array.isArray(m.outcomePrices)
            ? m.outcomePrices
            : JSON.parse(m.outcomePrices || '[]');
        } catch {
          return null; // invalid JSON → reject
        }
        if (prices.length < 2) return null;

        // ✅ 2. Normalize 24h volume
        const volume24h =
          Number(m.volume24hr) ||
          (Number(m.volume24hrClob) || 0) +
            (Number(m.volume24hrAmm) || 0);

        if (volume24h <= 0) return null;

        // ✅ 3. Title + ID check
        if (!m.id || !m.question) return null;

        // ✅ 4. Price checks
        const yes = parseFloat(prices[0]);
        const no = parseFloat(prices[1]);
        if (isNaN(yes) || isNaN(no)) return null;

        // ✅ 5. Active check
        if (!m.active || m.closed) return null;

        // ✅ normalize & return
        return {
          ...m,
          outcomePrices: prices,
          volume24h,
        };
      })
      .filter(Boolean);
  }

  /**
   * Sort & pick top 20
   */
  private selectTop20ByDailyVolume(markets: any[]) {
    const sorted = markets.sort((a, b) => b.volume24h - a.volume24h);
    const top20 = sorted.slice(0, 20);

    console.log('\n📊 Top 20 by 24h Volume:');
    top20.forEach((m, i) => {
      const yesPct = (parseFloat(m.outcomePrices[0]) * 100).toFixed(1);
      console.log(
        `${i + 1}. ${m.question.slice(0, 60)}...  |  vol=${m.volume24h.toLocaleString()}  YES=${yesPct}%`
      );
    });

    return top20;
  }

  private getCurrentTop20() {
    return prisma.market.findMany({
      where: { isCurrentTop20: true },
      orderBy: { volume24h: 'desc' },
    });
  }

  private async createSnapshot(markets: any[]) {
    for (let i = 0; i < markets.length; i++) {
      try {
        await prisma.marketSnapshot.create({
          data: {
            marketId: markets[i].id,
            title: markets[i].title,
            yesPrice: markets[i].yesPrice,
            noPrice: markets[i].noPrice,
            volume24h: markets[i].volume24h,
            totalVolume: markets[i].totalVolume,
            rank: i + 1,
          },
        });
      } catch (e: any) {
        console.error('Snapshot error:', e.message);
      }
    }
    console.log(`📸 Snapshot complete: ${markets.length} entries`);
  }

  private async detectTrendingEvents(oldTop20: any[], newTop20: any[]) {
    const oldIds = new Set(oldTop20.map((m) => m.id));
    const newIds = new Set(newTop20.map((m) => m.id));

    let entered = 0;
    let exited = 0;

    // ENTERED
    for (let i = 0; i < newTop20.length; i++) {
      const m = newTop20[i];
      if (!oldIds.has(m.id)) {
        await prisma.trendingEvent.create({
          data: {
            marketId: m.id,
            marketTitle: m.question,
            eventType: 'ENTERED',
            newRank: i + 1,
            volume24h: m.volume24h,
          },
        });
        entered++;
      }
    }

    // EXITED
    for (const old of oldTop20) {
      if (!newIds.has(old.id)) {
        await prisma.trendingEvent.create({
          data: {
            marketId: old.id,
            marketTitle: old.title,
            eventType: 'EXITED',
            oldRank: oldTop20.findIndex((x) => x.id === old.id) + 1,
            volume24h: old.volume24h,
          },
        });
        exited++;
      }
    }

    console.log(`🔍 Trending events → ENTERED: ${entered}, EXITED: ${exited}`);
  }

  private async updateDatabase(top20: any[]) {
    await prisma.market.updateMany({
      where: { isCurrentTop20: true },
      data: { isCurrentTop20: false },
    });

    let updated = 0;

    for (const m of top20) {
      const yes = parseFloat(m.outcomePrices[0]);
      const no = parseFloat(m.outcomePrices[1]);

      await prisma.market.upsert({
        where: { id: m.id },
        update: {
          title: m.question,
          category: m.category || 'General',
          description: m.description,
          yesPrice: yes,
          noPrice: no,
          volume24h: m.volume24h,
          totalVolume: Number(m.volume || 0),
          isCurrentTop20: true,
          lastUpdated: new Date(),
          image: m.image,
          endDate: m.endDate ? new Date(m.endDate) : null,
        },
        create: {
          id: m.id,
          title: m.question,
          category: m.category || 'General',
          description: m.description,
          yesPrice: yes,
          noPrice: no,
          volume24h: m.volume24h,
          totalVolume: Number(m.volume || 0),
          isCurrentTop20: true,
          image: m.image,
          endDate: m.endDate ? new Date(m.endDate) : null,
        },
      });

      updated++;
    }

    console.log(`💾 Updated ${updated}/${top20.length} markets`);
  }

  private async cleanup() {
    const snap = await prisma.marketSnapshot.deleteMany({
      where: {
        capturedAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    });

    const markets = await prisma.market.deleteMany({
      where: {
        isCurrentTop20: false,
        lastUpdated: {
          lt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    });

    const events = await prisma.trendingEvent.deleteMany({
      where: {
        createdAt: {
          lt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        },
      },
    });

    console.log(
      `🧹 Cleanup → snapshots=${snap.count}, markets=${markets.count}, events=${events.count}`
    );
  }

  async getTop20() {
    return prisma.market.findMany({
      where: { isCurrentTop20: true },
      orderBy: { volume24h: 'desc' },
      take: 20,
    });
  }

  async getTrendingEvents(limit: number = 20) {
    return prisma.trendingEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getMarketHistory(marketId: string, hours: number = 96) {
    return prisma.marketSnapshot.findMany({
      where: {
        marketId,
        capturedAt: {
          gte: new Date(Date.now() - hours * 60 * 60 * 1000),
        },
      },
      orderBy: { capturedAt: 'asc' },
    });
  }
}

export const top20Service = new Top20Service();
