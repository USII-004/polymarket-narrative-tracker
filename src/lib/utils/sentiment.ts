// lib/utils/sentiment.ts

/**
 * Get emoji representation of sentiment
 */
export function getSentimentEmoji(sentiment: number): string {
  if (sentiment >= 0.5) return '🟢';
  if (sentiment >= 0.2) return '🟡';
  if (sentiment >= -0.2) return '⚪';
  if (sentiment >= -0.5) return '🟠';
  return '🔴';
}

/**
 * Get sentiment label
 */
export function getSentimentLabel(sentiment: number): string {
  if (sentiment >= 0.5) return 'Very Positive';
  if (sentiment >= 0.2) return 'Positive';
  if (sentiment >= -0.2) return 'Neutral';
  if (sentiment >= -0.5) return 'Negative';
  return 'Very Negative';
}

/**
 * Get sentiment color for UI
 */
export function getSentimentColor(sentiment: number): string {
  if (sentiment >= 0.5) return 'text-green-600';
  if (sentiment >= 0.2) return 'text-lime-600';
  if (sentiment >= -0.2) return 'text-gray-600';
  if (sentiment >= -0.5) return 'text-orange-600';
  return 'text-red-600';
}

/**
 * Calculate sentiment from text (simple keyword-based)
 */
export function calculateSentiment(text: string): number {
  const lowerText = text.toLowerCase();

  const positiveWords = [
    'win', 'lead', 'surge', 'gain', 'rise', 'up', 'boost', 'approve',
    'success', 'rally', 'bullish', 'growth', 'positive', 'improve',
    'breakthrough', 'victory', 'advance', 'profit', 'optimistic',
    'strong', 'better', 'best', 'excellent', 'great', 'good'
  ];

  const negativeWords = [
    'lose', 'fall', 'drop', 'decline', 'down', 'crash', 'reject', 'fail',
    'crisis', 'bearish', 'loss', 'negative', 'concern', 'warning',
    'threat', 'risk', 'collapse', 'plunge', 'pessimistic',
    'weak', 'worse', 'worst', 'poor', 'bad', 'terrible'
  ];

  let score = 0;

  positiveWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches) score += matches.length * 0.1;
  });

  negativeWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches) score -= matches.length * 0.1;
  });

  // Normalize to [-1, 1]
  return Math.max(-1, Math.min(1, score));
}

/**
 * Analyze sentiment trend
 */
export function analyzeSentimentTrend(
  sentiments: number[]
): {
  current: number;
  trend: 'rising' | 'falling' | 'stable';
  change: number;
} {
  if (sentiments.length === 0) {
    return { current: 0, trend: 'stable', change: 0 };
  }

  const current = sentiments[sentiments.length - 1];
  
  if (sentiments.length < 2) {
    return { current, trend: 'stable', change: 0 };
  }

  // Calculate average of first half vs second half
  const midpoint = Math.floor(sentiments.length / 2);
  const firstHalf = sentiments.slice(0, midpoint);
  const secondHalf = sentiments.slice(midpoint);

  const firstAvg = firstHalf.reduce((sum, s) => sum + s, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, s) => sum + s, 0) / secondHalf.length;

  const change = secondAvg - firstAvg;

  let trend: 'rising' | 'falling' | 'stable' = 'stable';
  if (change > 0.1) trend = 'rising';
  else if (change < -0.1) trend = 'falling';

  return { current, trend, change };
}

/**
 * Format sentiment as percentage
 */
export function formatSentimentPercentage(sentiment: number): string {
  return `${(sentiment * 100).toFixed(1)}%`;
}

/**
 * Get sentiment description
 */
export function getSentimentDescription(sentiment: number): string {
  const emoji = getSentimentEmoji(sentiment);
  const label = getSentimentLabel(sentiment);
  const percentage = formatSentimentPercentage(sentiment);
  
  return `${emoji} ${label} (${percentage})`;
}