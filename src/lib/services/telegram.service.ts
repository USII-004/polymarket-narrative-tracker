// lib/services/telegram.service.ts

import TelegramBot from 'node-telegram-bot-api';
import { PrismaClient } from '@prisma/client';
import { getSentimentEmoji } from '../utils/sentiment';

const prisma = new PrismaClient();

export class TelegramService {
  private bot: TelegramBot;
  private chatId: string;

  constructor() {
    const token = process.env.TELEGRAM_BOT_TOKEN!;
    this.chatId = process.env.TELEGRAM_CHAT_ID!;
    this.bot = new TelegramBot(token, { polling: false });
  }

  /**
   * Initialize bot with polling (for development)
   */
  initPolling() {
    this.bot.stopPolling();
    this.bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN!, { polling: true });
    this.setupCommands();
  }

  /**
   * Setup bot commands
   */
  private setupCommands() {
    // /start command
    this.bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      await this.bot.sendMessage(
        chatId,
        '🚀 Welcome to PolyMarket Narrative Tracker!\n\n' +
        'Available commands:\n' +
        '/trending - View top trending narratives\n' +
        '/crypto - View crypto narratives\n' +
        '/politics - View political narratives\n' +
        '/market <query> - Search for markets\n' +
        '/subscribe - Subscribe to alerts\n' +
        '/unsubscribe - Unsubscribe from alerts'
      );
    });

    // /trending command
    this.bot.onText(/\/trending/, async (msg) => {
      const chatId = msg.chat.id;
      const narratives = await this.getTopNarratives(10);
      const message = this.formatNarratives(narratives, '🔥 Trending Narratives');
      await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    });

    // /crypto command
    this.bot.onText(/\/crypto/, async (msg) => {
      const chatId = msg.chat.id;
      const narratives = await this.getNarrativesByTopic('Crypto', 10);
      const message = this.formatNarratives(narratives, '₿ Crypto Narratives');
      await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    });

    // /politics command
    this.bot.onText(/\/politics/, async (msg) => {
      const chatId = msg.chat.id;
      const narratives = await this.getNarrativesByTopic('Politics', 10);
      const message = this.formatNarratives(narratives, '🗳️ Political Narratives');
      await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    });

    // /market command
    this.bot.onText(/\/market (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const query = match![1];
      const markets = await this.searchMarkets(query);
      const message = this.formatMarkets(markets);
      await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    });

    // /subscribe command
    this.bot.onText(/\/subscribe/, async (msg) => {
      const chatId = msg.chat.id;
      await this.subscribeUser(chatId.toString(), msg.from?.username);
      await this.bot.sendMessage(
        chatId,
        '✅ Subscribed to narrative alerts! You will receive updates when:\n' +
        '• New narratives are detected\n' +
        '• Significant sentiment changes occur\n' +
        '• Market odds shift dramatically'
      );
    });

    // /unsubscribe command
    this.bot.onText(/\/unsubscribe/, async (msg) => {
      const chatId = msg.chat.id;
      await this.unsubscribeUser(chatId.toString());
      await this.bot.sendMessage(chatId, '❌ Unsubscribed from alerts');
    });
  }

  /**
   * Send alert message
   */
  async sendAlert(alert: any): Promise<void> {
    try {
      const message = this.formatAlert(alert);
      await this.bot.sendMessage(this.chatId, message, { parse_mode: 'Markdown' });
      
      // Mark alert as sent
      await prisma.alert.update({
        where: { id: alert.id },
        data: { sent: true },
      });
    } catch (error) {
      console.error('Error sending Telegram alert:', error);
    }
  }

  /**
   * Send alerts to all subscribers
   */
  async broadcastAlert(alert: any): Promise<void> {
    try {
      const subscribers = await prisma.telegramSubscriber.findMany({
        where: { active: true },
      });

      const message = this.formatAlert(alert);

      for (const subscriber of subscribers) {
        try {
          await this.bot.sendMessage(subscriber.chatId, message, { 
            parse_mode: 'Markdown' 
          });
        } catch (error) {
          console.error(`Failed to send to ${subscriber.chatId}:`, error);
        }
      }

      // Mark alert as sent
      await prisma.alert.update({
        where: { id: alert.id },
        data: { sent: true },
      });
    } catch (error) {
      console.error('Error broadcasting alert:', error);
    }
  }

  /**
   * Format alert message
   */
  private formatAlert(alert: any): string {
    const emoji = {
      NewNarrative: '🆕',
      SentimentChange: '📊',
      MarketShift: '📈',
    }[alert.type] || '🔔';

    return `${emoji} *${alert.type.replace(/([A-Z])/g, ' $1').trim()}*\n\n${alert.message}`;
  }

  /**
   * Format narratives for display
   */
  private formatNarratives(narratives: any[], title: string): string {
    if (narratives.length === 0) {
      return '📭 No narratives found';
    }

    let message = `*${title}*\n\n`;

    narratives.forEach((narrative, index) => {
      const emoji = getSentimentEmoji(narrative.avgSentiment);
      const sentiment = narrative.avgSentiment.toFixed(2);
      
      message += `${index + 1}. ${emoji} *${narrative.title}*\n`;
      message += `   Sentiment: ${sentiment} | Articles: ${narrative.articleCount}\n`;
      
      if (narrative.links && narrative.links.length > 0) {
        message += `   🎯 Linked to ${narrative.links.length} market(s)\n`;
      }
      
      message += '\n';
    });

    return message;
  }

  /**
   * Format markets for display
   */
  private formatMarkets(markets: any[]): string {
    if (markets.length === 0) {
      return '📭 No markets found';
    }

    let message = '*Markets Found*\n\n';

    markets.forEach((market, index) => {
      message += `${index + 1}. *${market.title}*\n`;
      message += `   YES: ${(market.yesPrice * 100).toFixed(1)}% | `;
      message += `NO: ${(market.noPrice * 100).toFixed(1)}%\n`;
      message += `   Volume: $${(market.volume / 1000).toFixed(1)}K\n\n`;
    });

    return message;
  }

  /**
   * Get top narratives
   */
  private async getTopNarratives(limit: number) {
    return prisma.narrative.findMany({
      take: limit,
      orderBy: [
        { articleCount: 'desc' },
        { createdAt: 'desc' },
      ],
      include: {
        links: true,
      },
    });
  }

  /**
   * Get narratives by topic
   */
  private async getNarrativesByTopic(topic: string, limit: number) {
    return prisma.narrative.findMany({
      where: { topic },
      take: limit,
      orderBy: [
        { articleCount: 'desc' },
        { createdAt: 'desc' },
      ],
      include: {
        links: true,
      },
    });
  }

  /**
   * Search markets
   */
  private async searchMarkets(query: string) {
    return prisma.polymarketMarket.findMany({
      where: {
        title: {
          contains: query,
          mode: 'insensitive',
        },
      },
      take: 5,
      orderBy: { volume: 'desc' },
    });
  }

  /**
   * Subscribe user
   */
  private async subscribeUser(chatId: string, username?: string) {
    await prisma.telegramSubscriber.upsert({
      where: { chatId },
      update: { active: true },
      create: {
        chatId,
        username,
        topics: ['All'],
        active: true,
      },
    });
  }

  /**
   * Unsubscribe user
   */
  private async unsubscribeUser(chatId: string) {
    await prisma.telegramSubscriber.update({
      where: { chatId },
      data: { active: false },
    });
  }
}

export const telegramService = new TelegramService();