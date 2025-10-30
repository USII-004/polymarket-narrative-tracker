// lib/services/news.service.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class NewsService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.NEWS_API_KEY || '';
  }

  /**
   * Fetch news articles for specific topics
   */
  async fetchNews(topics: string[] = ['Politics', 'Crypto']): Promise<void> {
    try {
      console.log('Fetching news articles...');

      const topicKeywords: Record<string, string[]> = {
        Politics: ['Trump', 'Biden', 'election', 'Congress', 'poll', 'Senate', 'campaign'],
        Crypto: ['Bitcoin', 'Ethereum', 'crypto', 'SEC', 'ETF', 'blockchain', 'DeFi'],
      };

      for (const topic of topics) {
        const keywords = topicKeywords[topic] || [];
        const query = keywords.join(' OR ');

        try {
          const response = await fetch(
            `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=50&apiKey=${this.apiKey}`
          );

          if (!response.ok) {
            console.error(`News API error for ${topic}: ${response.statusText}`);
            continue;
          }

          const data = await response.json();
          const articles = data.articles || [];

          console.log(`Fetched ${articles.length} articles for ${topic}`);

          for (const article of articles) {
            await this.storeArticle(article, topic);
          }
        } catch (error) {
          console.error(`Error fetching ${topic} news:`, error);
        }
      }

      console.log('News fetching complete');
    } catch (error) {
      console.error('Error in fetchNews:', error);
      throw error;
    }
  }

  /**
   * Store article in database
   */
  private async storeArticle(article: any, topic: string): Promise<void> {
    try {
      // Check if article already exists
      const existing = await prisma.newsArticle.findUnique({
        where: { url: article.url },
      });

      if (existing) return;

      // Calculate sentiment
      const sentiment = this.calculateSentiment(article.title, article.description);

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
      console.error(`Error storing article: ${article.url}`, error);
    }
  }

  /**
   * Simple sentiment calculation
   */
  private calculateSentiment(title: string, description?: string): number {
    const text = `${title} ${description || ''}`.toLowerCase();

    const positiveWords = [
      'win', 'lead', 'surge', 'gain', 'rise', 'up', 'boost', 'approve',
      'success', 'rally', 'bullish', 'growth', 'positive', 'improve',
      'breakthrough', 'victory', 'advance', 'profit', 'optimistic'
    ];

    const negativeWords = [
      'lose', 'fall', 'drop', 'decline', 'down', 'crash', 'reject', 'fail',
      'crisis', 'bearish', 'loss', 'negative', 'concern', 'warning',
      'threat', 'risk', 'collapse', 'plunge', 'pessimistic'
    ];

    let sentiment = 0;

    positiveWords.forEach(word => {
      if (text.includes(word)) sentiment += 0.1;
    });

    negativeWords.forEach(word => {
      if (text.includes(word)) sentiment -= 0.1;
    });

    // Normalize to [-1, 1]
    return Math.max(-1, Math.min(1, sentiment));
  }

  /**
   * Get recent articles by topic
   */
  async getRecentArticles(topic: string, limit: number = 50) {
    return prisma.newsArticle.findMany({
      where: { topic },
      take: limit,
      orderBy: { publishedAt: 'desc' },
    });
  }

  /**
   * Get articles without narratives
   */
  async getUnclusteredArticles(topic: string, daysBack: number = 7) {
    return prisma.newsArticle.findMany({
      where: {
        topic,
        narrativeId: null,
        publishedAt: {
          gte: new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { publishedAt: 'desc' },
    });
  }

  /**
   * Get sentiment trends for topic
   */
  async getSentimentTrends(topic: string, daysBack: number = 7) {
    const articles = await prisma.newsArticle.findMany({
      where: {
        topic,
        publishedAt: {
          gte: new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { publishedAt: 'desc' },
    });

    // Group by day
    const dailySentiment: Record<string, { sum: number; count: number }> = {};

    articles.forEach(article => {
      const day = article.publishedAt.toISOString().split('T')[0];
      if (!dailySentiment[day]) {
        dailySentiment[day] = { sum: 0, count: 0 };
      }
      dailySentiment[day].sum += article.sentiment;
      dailySentiment[day].count += 1;
    });

    return Object.entries(dailySentiment).map(([date, data]) => ({
      date,
      avgSentiment: data.sum / data.count,
      articleCount: data.count,
    }));
  }
}

export const newsService = new NewsService();