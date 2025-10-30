// lib/services/narrative.service.ts

import { PrismaClient } from '@prisma/client';
import { getEmbedding, cosineSimilarity } from '../utils/embeddings';

const prisma = new PrismaClient();

export class NarrativeService {
  /**
   * Generate narratives from unclustered articles
   */
  async generateNarratives(topic: string): Promise<void> {
    try {
      console.log(`Generating narratives for ${topic}...`);

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

      if (articles.length === 0) {
        console.log('No unclustered articles found');
        return;
      }

      console.log(`Processing ${articles.length} articles`);

      // Generate embeddings for articles
      const articlesWithEmbeddings = [];
      for (const article of articles) {
        try {
          const embedding = await getEmbedding(article.title);
          if (embedding.length > 0) {
            articlesWithEmbeddings.push({ ...article, embedding });
          }
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          console.error(`Error generating embedding for article ${article.id}:`, error);
        }
      }

      console.log(`Generated embeddings for ${articlesWithEmbeddings.length} articles`);

      // Cluster articles by similarity
      const clusters = this.clusterArticles(articlesWithEmbeddings, 0.75);
      console.log(`Found ${clusters.length} clusters`);

      // Create narratives from clusters
      for (const cluster of clusters) {
        await this.createNarrativeFromCluster(cluster, topic);
      }

      console.log(`Created ${clusters.length} narratives`);
    } catch (error) {
      console.error('Error generating narratives:', error);
      throw error;
    }
  }

  /**
   * Cluster articles by embedding similarity
   */
  private clusterArticles(
    articles: Array<any>,
    threshold: number = 0.75
  ): Array<Array<any>> {
    const used = new Set<string>();
    const clusters: Array<Array<any>> = [];

    for (const article of articles) {
      if (used.has(article.id)) continue;

      const cluster = [article];
      used.add(article.id);

      for (const other of articles) {
        if (used.has(other.id)) continue;

        const similarity = cosineSimilarity(article.embedding, other.embedding);
        if (similarity >= threshold) {
          cluster.push(other);
          used.add(other.id);
        }
      }

      // Only keep clusters with at least 2 articles
      if (cluster.length >= 2) {
        clusters.push(cluster);
      }
    }

    return clusters;
  }

  /**
   * Create narrative from article cluster
   */
  private async createNarrativeFromCluster(
    cluster: Array<any>,
    topic: string
  ): Promise<void> {
    try {
      // Calculate average sentiment
      const avgSentiment = cluster.reduce((sum, a) => sum + a.sentiment, 0) / cluster.length;

      // Use first article's title as narrative title (could be improved with summarization)
      const title = cluster[0].title.slice(0, 100);

      // Extract keywords from titles
      const keywords = this.extractKeywords(cluster.map(a => a.title));

      // Create narrative
      const narrative = await prisma.narrative.create({
        data: {
          title,
          topic,
          keywords,
          avgSentiment,
          embedding: JSON.stringify(cluster[0].embedding),
          articleCount: cluster.length,
        },
      });

      // Link articles to narrative
      await prisma.newsArticle.updateMany({
        where: { id: { in: cluster.map(a => a.id) } },
        data: { narrativeId: narrative.id },
      });

      console.log(`Created narrative: ${title} (${cluster.length} articles)`);
    } catch (error) {
      console.error('Error creating narrative:', error);
    }
  }

  /**
   * Extract keywords from titles
   */
  private extractKeywords(titles: string[]): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
      'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'
    ]);

    const wordFreq: Record<string, number> = {};

    titles.forEach(title => {
      const words = title.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/);

      words.forEach(word => {
        if (word.length > 3 && !stopWords.has(word)) {
          wordFreq[word] = (wordFreq[word] || 0) + 1;
        }
      });
    });

    // Get top 5 most frequent words
    return Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }

  /**
   * Update narrative sentiment based on new articles
   */
  async updateNarrativeSentiment(narrativeId: string): Promise<void> {
    try {
      const narrative = await prisma.narrative.findUnique({
        where: { id: narrativeId },
        include: {
          articles: {
            orderBy: { publishedAt: 'desc' },
            take: 20,
          },
        },
      });

      if (!narrative || narrative.articles.length === 0) return;

      const avgSentiment = narrative.articles.reduce((sum, a) => sum + a.sentiment, 0) / narrative.articles.length;

      await prisma.narrative.update({
        where: { id: narrativeId },
        data: {
          avgSentiment,
          articleCount: narrative.articles.length,
        },
      });
    } catch (error) {
      console.error('Error updating narrative sentiment:', error);
    }
  }

  /**
   * Get narratives by topic
   */
  async getNarrativesByTopic(topic: string, limit: number = 10) {
    return prisma.narrative.findMany({
      where: { topic },
      take: limit,
      orderBy: [
        { articleCount: 'desc' },
        { createdAt: 'desc' },
      ],
      include: {
        articles: {
          take: 3,
          orderBy: { publishedAt: 'desc' },
        },
        links: {
          include: { market: true },
          orderBy: { similarity: 'desc' },
          take: 3,
        },
      },
    });
  }

  /**
   * Get trending narratives
   */
  async getTrendingNarratives(limit: number = 10) {
    return prisma.narrative.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      take: limit,
      orderBy: [
        { articleCount: 'desc' },
        { createdAt: 'desc' },
      ],
      include: {
        articles: {
          take: 3,
          orderBy: { publishedAt: 'desc' },
        },
        links: {
          include: { market: true },
          orderBy: { similarity: 'desc' },
          take: 3,
        },
      },
    });
  }

  /**
   * Get narrative by ID
   */
  async getNarrativeById(id: string) {
    return prisma.narrative.findUnique({
      where: { id },
      include: {
        articles: {
          orderBy: { publishedAt: 'desc' },
        },
        links: {
          include: { market: true },
          orderBy: { similarity: 'desc' },
        },
      },
    });
  }
}

export const narrativeService = new NarrativeService();