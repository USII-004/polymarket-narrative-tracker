// app/api/cron/update-top20/route.ts
// Cron job to update top 20 every 4 hours

import { NextResponse } from 'next/server';
import { top20Service } from '@/lib/services/top20.service';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max

export async function GET(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🚀 Starting top 20 update (by 24h volume)...');
    console.log(`⏰ Time: ${new Date().toISOString()}`);
    console.log('');

    // Run the update
    const top20 = await top20Service.updateTop20();

    console.log('✅ Update completed successfully!');

    return NextResponse.json({
      success: true,
      message: 'Top 20 markets updated (by 24h volume)',
      marketsUpdated: top20.length,
      timestamp: new Date().toISOString(),
      updateFrequency: 'Every 4 hours',
      sortedBy: '24-hour volume',
      markets: top20.map((m: any, i: number) => ({
        rank: i + 1,
        title: m.question.substring(0, 60) + '...',
        volume24h: parseFloat(m.volume24hr).toLocaleString(),
        yesPrice: `${(parseFloat(m.outcomePrices[0]) * 100).toFixed(1)}%`,
        noPrice: `${(parseFloat(m.outcomePrices[1]) * 100).toFixed(1)}%`
      }))
    });

  } catch (error: any) {
    console.error('❌ Fatal error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}