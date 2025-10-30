# PolyMarket Narrative Tracker

AI-powered system that tracks Politics and Crypto narratives impacting PolyMarket prediction markets.

## 🚀 Features

- **Real-time Data Ingestion**: Continuously fetches news articles and social media posts
- **AI-Powered Narrative Clustering**: Uses OpenAI embeddings to group related content into coherent narratives
- **Market Correlation**: Links narratives to active PolyMarket markets with semantic similarity
- **Sentiment Analysis**: Tracks sentiment trends over time
- **Telegram Alerts**: Real-time notifications for narrative shifts and market movements
- **Interactive Dashboard**: Beautiful Next.js dashboard with live data visualization

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL database (or Supabase account)
- OpenAI API key
- News API key
- Telegram Bot Token
- Vercel account (for deployment)

## 🛠️ Installation

### 1. Clone and Install

```bash
git clone <your-repo>
cd polymarket-narrative-tracker
npm install
```

### 2. Database Setup

```bash
# Initialize Prisma
npx prisma generate

# Push schema to database
npx prisma db push

# (Optional) Open Prisma Studio
npx prisma studio
```

### 3. Environment Variables

Create a `.env` file in the root:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/polymarket"
OPENAI_API_KEY="sk-..."
NEWS_API_KEY="your-news-api-key"
TELEGRAM_BOT_TOKEN="your-bot-token"
TELEGRAM_CHAT_ID="your-chat-id"
CRON_SECRET="random-secret-string"
```

### 4. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000`

## 🤖 Telegram Bot Setup

### Create a Bot

1. Message [@BotFather](https://t.me/botfather) on Telegram
2. Send `/newbot` and follow instructions
3. Copy the bot token to `.env`

### Get Chat ID

1. Add your bot to a channel/group
2. Send a message
3. Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
4. Find `chat.id` in the response

### Run Bot

```bash
npm run telegram:start
```

## 📊 API Endpoints

### Public Endpoints

- `GET /api/narratives?topic=Politics&limit=10` - Get narratives by topic
- `GET /api/markets?category=Crypto` - Get markets by category
- `GET /api/alerts?limit=20` - Get recent alerts
- `GET /api/links?limit=20` - Get top narrative-market links

### Cron Endpoints (Protected)

- `GET /api/cron/fetch-data` - Fetch PolyMarket & news data
- `GET /api/cron/process-narratives` - Generate narratives & link to markets
- `GET /api/cron/send-alerts` - Check conditions & send Telegram alerts

**Authentication**: Include header `Authorization: Bearer <CRON_SECRET>`

## 🚢 Deployment

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
```

### Configure Cron Jobs

Add `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/fetch-data",
      "schedule": "0 */4 * * *"
    },
    {
      "path": "/api/cron/process-narratives",
      "schedule": "0 */6 * * *"
    },
    {
      "path": "/api/cron/send-alerts",
      "schedule": "0 * * * *"
    }
  ]
}
```

## 🔄 Data Pipeline

1. **Every 4 hours**: Fetch PolyMarket markets & news articles
2. **Every 6 hours**: Generate narrative clusters & link to markets
3. **Every hour**: Detect significant changes & send Telegram alerts

## 📱 Telegram Bot Commands

- `/start` - Welcome message and command list
- `/trending` - View top trending narratives
- `/crypto` - View crypto narratives
- `/politics` - View political narratives
- `/market <query>` - Search for markets
- `/subscribe` - Subscribe to alerts
- `/unsubscribe` - Unsubscribe from alerts

## 🧪 Testing

### Manual Data Fetch

```bash
curl -X GET http://localhost:3000/api/cron/fetch-data \
  -H "Authorization: Bearer your-cron-secret"
```

### Process Narratives

```bash
curl -X GET http://localhost:3000/api/cron/process-narratives \
  -H "Authorization: Bearer your-cron-secret"
```

### Send Test Alert

```bash
curl -X GET http://localhost:3000/api/cron/send-alerts \
  -H "Authorization: Bearer your-cron-secret"
```

## 📂 Project Structure

```
polymarket-narrative-tracker/
├── app/
│   ├── api/
│   │   ├── narratives/route.ts
│   │   ├── markets/route.ts
│   │   ├── alerts/route.ts
│   │   └── cron/
│   │       ├── fetch-data/route.ts
│   │       ├── process-narratives/route.ts
│   │       └── send-alerts/route.ts
│   ├── page.tsx (Dashboard)
│   └── layout.tsx
├── lib/
│   ├── services/
│   │   ├── polymarket.service.ts
│   │   ├── news.service.ts
│   │   ├── narrative.service.ts
│   │   ├── linking.service.ts
│   │   ├── telegram.service.ts
│   │   └── alert.service.ts
│   └── utils/
│       ├── sentiment.ts
│       └── embeddings.ts
├── prisma/
│   └── schema.prisma
├── scripts/
│   └── telegram-bot.ts
├── .env
├── package.json
└── vercel.json
```

## 🔐 Security Notes

- Never commit `.env` file
- Use environment variables for all secrets
- Protect cron endpoints with `CRON_SECRET`
- Rate limit external API calls
- Implement proper error handling

## 🐛 Troubleshooting

### Database Connection Issues

```bash
# Test connection
npx prisma db push

# Reset database (⚠️ deletes all data)
npx prisma migrate reset
```

### OpenAI API Rate Limits

- Add delays between embedding requests
- Use `batchGetEmbeddings` with proper rate limiting
- Consider caching embeddings in database

### Telegram Bot Not Responding

- Check bot token is correct
- Ensure bot has proper permissions in group/channel
- Verify chat ID is correct
- Check bot is not blocked

## 📈 Scaling Considerations

- **Database**: Add indexes for frequently queried fields
- **API Calls**: Implement caching layer (Redis)
- **Embeddings**: Store and reuse embeddings
- **Background Jobs**: Move to dedicated queue (Bull/BullMQ)
- **Rate Limiting**: Implement per-user rate limits

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- [PolyMarket](https://polymarket.com/) for the prediction market data
- [OpenAI](https://openai.com/) for embeddings and GPT models
- [Telegram](https://telegram.org/) for the bot platform
- [Vercel](https://vercel.com/) for hosting and cron jobs

---

Built with ❤️ for the prediction market community