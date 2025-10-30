// lib/services/alert.service.ts

import { PrismaClient } from '@prisma/client';
import { telegramService } from './telegram.service';

const prisma = new PrismaClient();

export class AlertService {
  /**
   * Check for new narratives and create alerts
   */
  async checkNewNarratives(): Promise<void> {
    try {
      // Get narratives created in last hour
      const recentNarratives = await prisma.narrative.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 60 * 60 * 1000),
          },
        },
        include: {
          links: {
            include: {
              market: true,
            },
            take: 1,
          },
        },
      });

      for (const narrative of recentNarratives) {
        // Check if alert already exists
        const existing = await prisma.alert.findFirst({
          where: {
            type: 'NewNarrative',
            message: {
              contains: narrative.title,
            },
          },
        });

        if (!existing) {
          await this.createNewNarrativeAlert(narrative);
        }
      }
    } catch (error) {
      console.error('Error checking new narratives:', error);
    }
  }

  /**
   * Check for significant sentiment changes
   */
  async checkSentimentChanges(): Promise<void> {
    try {
      const narratives = await prisma.narrative.findMany({
        where: {
          updatedAt: {
            gte: new Date(Date.now() - 6 * 60 * 60 * 1000), // Last 6 hours
          },
        },
        include: {
          articles: {
            orderBy: { publishedAt: 'desc' },
            take: 10,
          },
          links: {
            include: {
              market: true,
            },
            take: 1,
          },
        },
      });

      for (const narrative of narratives) {
        if (narrative.articles.length < 5) continue;

        // Calculate recent sentiment (last 5 articles)
        const recentSentiment =
          narrative.articles
            .slice(0, 5)
            .reduce((sum, a) => sum + a.sentiment, 0) / 5;

        // Calculate older sentiment (articles 5-10)
        const olderSentiment =
          narrative.articles
            .slice(5, 10)
            .reduce((sum, a) => sum + a.sentiment, 0) / 5;

        const sentimentChange = Math.abs(recentSentiment - olderSentiment);

        // Alert if sentiment changed significantly
        if (sentimentChange > 0.4) {
          await this.createSentimentChangeAlert(
            narrative,
            recentSentiment,
            olderSentiment
          );
        }
      }
    } catch (error) {
      console.error('Error checking sentiment changes:', error);
    }
  }

  /**
   * Check for market odds shifts
   */
  async checkMarketShifts(): Promise<void> {
    try {
      // This would require storing historical market data
      // For now, we'll create a simplified version
      
      const markets = await prisma.polymarketMarket.findMany({
        where: {
          lastUpdated: {
            gte: new Date(Date.now() - 60 * 60 * 1000),
          },
        },
        include: {
          links: {
            include: {
              narrative: true,
            },
            take: 3,
          },
        },
      });

      // In production, you'd compare current prices with historical prices
      // and detect significant changes (e.g., >10% shift in 24h)
      
      console.log(`Checked ${markets.length} markets for shifts`);
    } catch (error) {
      console.error('Error checking market shifts:', error);
    }
  }

  /**
   * Create new narrative alert
   */
  private async createNewNarrativeAlert(narrative: any): Promise<void> {
    try {
      let message = `🆕 *New Narrative Detected*\n\n`;
      message += `*${narrative.title}*\n\n`;
      message += `📊 Sentiment: ${narrative.avgSentiment.toFixed(2)}\n`;
      message += `📰 Articles: ${narrative.articleCount}\n`;
      message += `🏷️ Topic: ${narrative.topic}\n`;

      if (narrative.links.length > 0) {
        const market = narrative.links[0].market;
        message += `\n🎯 *Linked Market*\n`;
        message += `${market.title}\n`;
        message += `YES: ${(market.yesPrice * 100).toFixed(1)}% | `;
        message += `NO: ${(market.noPrice * 100).toFixed(1)}%\n`;
      }

      const alert = await prisma.alert.create({
        data: {
          type: 'NewNarrative',
          message,
          topic: narrative.topic,
          metadata: JSON.stringify({ narrativeId: narrative.id }),
        },
      });

      // Send to Telegram
      await telegramService.broadcastAlert(alert);
    } catch (error) {
      console.error('Error creating new narrative alert:', error);
    }
  }

  /**
   * Create sentiment change alert
   */
  private async createSentimentChangeAlert(
    narrative: any,
    recentSentiment: number,
    olderSentiment: number
  ): Promise<void> {
    try {
      const direction = recentSentiment > olderSentiment ? '📈 Rising' : '📉 Falling';
      const change = ((recentSentiment - olderSentiment) * 100).toFixed(0);

      let message = `📊 *Sentiment Shift Detected*\n\n`;
      message += `*${narrative.title}*\n\n`;
      message += `${direction}: ${parseFloat(change) > 0 ? '+' : ''}${change}%\n`;
      message += `Current: ${recentSentiment.toFixed(2)}\n`;
      message += `Previous: ${olderSentiment.toFixed(2)}\n`;
      message += `🏷️ Topic: ${narrative.topic}\n`;

      if (narrative.links.length > 0) {
        const market = narrative.links[0].market;
        message += `\n🎯 *Related Market*\n`;
        message += `${market.title}\n`;
        message += `YES: ${(market.yesPrice * 100).toFixed(1)}%\n`;
      }

      const alert = await prisma.alert.create({
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

      // Send to Telegram
      await telegramService.broadcastAlert(alert);
    } catch (error) {
      console.error('Error creating sentiment change alert:', error);
    }
  }

  /**
   * Process all pending alerts
   */
  async processPendingAlerts(): Promise<void> {
    try {
      await this.checkNewNarratives();
      await this.checkSentimentChanges();
      await this.checkMarketShifts();
    } catch (error) {
      console.error('Error processing alerts:', error);
    }
  }

  /**
   * Get recent alerts
   */
  async getRecentAlerts(limit: number = 20) {
    return prisma.alert.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const alertService = new AlertService();