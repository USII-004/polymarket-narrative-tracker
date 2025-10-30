'use client'

import React, { useState, useEffect } from 'react';
import { TrendingUp, AlertCircle, DollarSign, BarChart3, RefreshCw, Zap, Activity, Clock, ArrowUpRight, ArrowDownRight, Sparkles } from 'lucide-react';

interface Narrative {
  id: string;
  title: string;
  topic: string;
  avgSentiment: number;
  articleCount: number;
  createdAt: string;
  links: Array<{
    market: {
      id: string;
      title: string;
      yesPrice: number;
      noPrice: number;
    };
    similarity: number;
  }>;
}

interface Market {
  id: string;
  title: string;
  category: string;
  yesPrice: number;
  noPrice: number;
  volume: number;
}

interface Alert {
  id: string;
  type: string;
  message: string;
  topic: string;
  createdAt: string;
}

export default function ModernDashboard() {
  const [narratives, setNarratives] = useState<Narrative[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<'Politics' | 'Crypto'>('Politics');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, [selectedTopic]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [narrativesRes, marketsRes, alertsRes] = await Promise.all([
        fetch(`/api/narratives?topic=${selectedTopic}&limit=10`),
        fetch(`/api/markets?category=${selectedTopic}`),
        fetch('/api/alerts?limit=10')
      ]);

      const narrativesData = await narrativesRes.json();
      const marketsData = await marketsRes.json();
      const alertsData = await alertsRes.json();

      setNarratives(narrativesData.narratives || []);
      setMarkets(marketsData.markets || []);
      setAlerts(alertsData.alerts || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setTimeout(() => setRefreshing(false), 500);
  };

  const getSentimentColor = (sentiment: number) => {
    if (sentiment > 0.3) return 'text-emerald-400';
    if (sentiment < -0.3) return 'text-rose-400';
    return 'text-slate-400';
  };

  const getSentimentBg = (sentiment: number) => {
    if (sentiment > 0.3) return 'bg-emerald-500/10 border-emerald-500/20';
    if (sentiment < -0.3) return 'bg-rose-500/10 border-rose-500/20';
    return 'bg-slate-500/10 border-slate-500/20';
  };

  const getSentimentIcon = (sentiment: number) => {
    if (sentiment > 0.3) return <ArrowUpRight className="w-4 h-4 text-emerald-400" />;
    if (sentiment < -0.3) return <ArrowDownRight className="w-4 h-4 text-rose-400" />;
    return <Activity className="w-4 h-4 text-slate-400" />;
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'NewNarrative': return <Sparkles className="w-5 h-5 text-violet-400" />;
      case 'SentimentChange': return <Activity className="w-5 h-5 text-blue-400" />;
      case 'MarketShift': return <TrendingUp className="w-5 h-5 text-amber-400" />;
      default: return <AlertCircle className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-violet-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute -bottom-40 right-1/3 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Header */}
      <header className="relative border-b border-white/5 bg-black/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-purple-500 rounded-2xl blur-xl opacity-50"></div>
                <div className="relative bg-gradient-to-r from-violet-600 to-purple-600 p-3 rounded-2xl">
                  <BarChart3 className="w-8 h-8 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">
                  Narrative Tracker
                </h1>
                <p className="text-violet-300 text-sm mt-1 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  AI-Powered Market Intelligence
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all text-white disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              
              <div className="flex gap-2 bg-black/30 p-1.5 rounded-xl border border-white/10">
                <button
                  onClick={() => setSelectedTopic('Politics')}
                  className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                    selectedTopic === 'Politics'
                      ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/50'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  🗳️ Politics
                </button>
                <button
                  onClick={() => setSelectedTopic('Crypto')}
                  className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                    selectedTopic === 'Crypto'
                      ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/50'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  ₿ Crypto
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 w-16 h-16 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
              </div>
              <p className="text-violet-300 text-lg font-medium">Loading intelligence...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity blur-xl"></div>
                <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-violet-500/50 transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-violet-500/10 rounded-xl">
                      <TrendingUp className="w-6 h-6 text-violet-400" />
                    </div>
                    <span className="text-2xl">🔥</span>
                  </div>
                  <p className="text-slate-400 text-sm font-medium">Active Narratives</p>
                  <p className="text-white text-3xl font-bold mt-1">{narratives.length}</p>
                </div>
              </div>

              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-green-600 rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity blur-xl"></div>
                <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-emerald-500/50 transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-emerald-500/10 rounded-xl">
                      <DollarSign className="w-6 h-6 text-emerald-400" />
                    </div>
                    <span className="text-2xl">💰</span>
                  </div>
                  <p className="text-slate-400 text-sm font-medium">Active Markets</p>
                  <p className="text-white text-3xl font-bold mt-1">{markets.length}</p>
                </div>
              </div>

              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-600 to-orange-600 rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity blur-xl"></div>
                <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-amber-500/50 transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-amber-500/10 rounded-xl">
                      <AlertCircle className="w-6 h-6 text-amber-400" />
                    </div>
                    <span className="text-2xl">🚨</span>
                  </div>
                  <p className="text-slate-400 text-sm font-medium">Recent Alerts</p>
                  <p className="text-white text-3xl font-bold mt-1">{alerts.length}</p>
                </div>
              </div>

              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity blur-xl"></div>
                <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-blue-500/50 transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-blue-500/10 rounded-xl">
                      <Clock className="w-6 h-6 text-blue-400" />
                    </div>
                    <span className="text-2xl">⚡</span>
                  </div>
                  <p className="text-slate-400 text-sm font-medium">Avg Sentiment</p>
                  <p className="text-white text-3xl font-bold mt-1">
                    {narratives.length > 0 
                      ? (narratives.reduce((sum, n) => sum + n.avgSentiment, 0) / narratives.length).toFixed(2)
                      : '0.00'}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content - Narratives */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                      <span className="text-3xl">🔥</span>
                      Trending Narratives
                    </h2>
                    <span className="text-sm text-slate-400 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                      {narratives.length} active
                    </span>
                  </div>

                  <div className="space-y-4">
                    {narratives.map((narrative, index) => (
                      <div
                        key={narrative.id}
                        className="group relative bg-white/5 backdrop-blur-xl rounded-xl p-5 border border-white/10 hover:border-violet-500/50 transition-all hover:shadow-2xl hover:shadow-violet-500/10"
                      >
                        {/* Rank Badge */}
                        <div className="absolute -left-2 -top-2 w-8 h-8 bg-gradient-to-br from-violet-600 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg">
                          {index + 1}
                        </div>

                        <div className="flex items-start gap-4">
                          {/* Sentiment Indicator */}
                          <div className={`flex-shrink-0 p-3 rounded-xl border ${getSentimentBg(narrative.avgSentiment)}`}>
                            {getSentimentIcon(narrative.avgSentiment)}
                          </div>

                          <div className="flex-1 min-w-0">
                            <h3 className="text-white font-semibold text-lg mb-2 group-hover:text-violet-300 transition-colors">
                              {narrative.title}
                            </h3>

                            <div className="flex flex-wrap items-center gap-4 text-sm mb-3">
                              <span className="flex items-center gap-1.5 text-slate-400">
                                <span>📰</span>
                                {narrative.articleCount} articles
                              </span>
                              <span className={`flex items-center gap-1.5 font-medium ${getSentimentColor(narrative.avgSentiment)}`}>
                                <Activity className="w-4 h-4" />
                                {narrative.avgSentiment > 0 ? '+' : ''}{narrative.avgSentiment.toFixed(2)}
                              </span>
                              <span className="px-2.5 py-1 bg-white/5 rounded-lg text-slate-300 text-xs border border-white/10">
                                {narrative.topic}
                              </span>
                            </div>

                            {narrative.links && narrative.links.length > 0 && (
                              <div className="mt-4 pt-4 border-t border-white/10">
                                <p className="text-xs text-violet-400 font-medium mb-2 flex items-center gap-1.5">
                                  <Zap className="w-3.5 h-3.5" />
                                  Linked Markets
                                </p>
                                <div className="space-y-2">
                                  {narrative.links.slice(0, 2).map((link) => (
                                    <div
                                      key={link.market.id}
                                      className="bg-white/5 rounded-lg p-3 border border-white/10 hover:border-violet-500/30 transition-all"
                                    >
                                      <p className="text-sm text-slate-300 mb-2 font-medium">
                                        {link.market.title}
                                      </p>
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                          <span className="text-xs text-emerald-400 font-semibold">
                                            YES {(link.market.yesPrice * 100).toFixed(1)}%
                                          </span>
                                          <span className="text-xs text-rose-400 font-semibold">
                                            NO {(link.market.noPrice * 100).toFixed(1)}%
                                          </span>
                                        </div>
                                        <span className="text-xs text-slate-500">
                                          Match {(link.similarity * 100).toFixed(0)}%
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {narratives.length === 0 && (
                      <div className="text-center py-16">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/5 border border-white/10 mb-4">
                          <TrendingUp className="w-10 h-10 text-slate-500" />
                        </div>
                        <p className="text-slate-400 text-lg font-medium">No narratives found</p>
                        <p className="text-slate-600 text-sm mt-2">Data is being processed...</p>
                        <button
                          onClick={handleRefresh}
                          className="mt-4 px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium transition-all"
                        >
                          Refresh Data
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Top Markets */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                  <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <span className="text-2xl">📊</span>
                    Top Markets
                  </h2>
                  <div className="space-y-3">
                    {markets.slice(0, 5).map((market, index) => (
                      <div
                        key={market.id}
                        className="group bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10 hover:border-violet-500/50 transition-all hover:shadow-lg hover:shadow-violet-500/10"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-violet-600 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium mb-3 line-clamp-2 group-hover:text-violet-300 transition-colors">
                              {market.title}
                            </p>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-emerald-400 text-xs font-bold">
                                YES {(market.yesPrice * 100).toFixed(1)}%
                              </span>
                              <span className="text-rose-400 text-xs font-bold">
                                NO {(market.noPrice * 100).toFixed(1)}%
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-emerald-500 to-violet-500 rounded-full transition-all"
                                  style={{ width: `${market.yesPrice * 100}%` }}
                                ></div>
                              </div>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">
                              Vol: ${(market.volume / 1000).toFixed(1)}K
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}

                    {markets.length === 0 && (
                      <p className="text-slate-400 text-sm text-center py-8">No markets found</p>
                    )}
                  </div>
                </div>

                {/* Recent Alerts */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                  <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <span className="text-2xl">🚨</span>
                    Recent Alerts
                  </h2>
                  <div className="space-y-3">
                    {alerts.slice(0, 5).map((alert) => (
                      <div
                        key={alert.id}
                        className="group bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10 hover:border-amber-500/50 transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-0.5">
                            {getAlertIcon(alert.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-violet-400 font-medium mb-1">
                              {alert.type.replace(/([A-Z])/g, ' $1').trim()}
                            </p>
                            <p className="text-white text-sm line-clamp-2 mb-2">
                              {alert.message.split('\n')[0].replace(/\*/g, '')}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <Clock className="w-3 h-3" />
                              {new Date(alert.createdAt).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {alerts.length === 0 && (
                      <p className="text-slate-400 text-sm text-center py-8">No alerts yet</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="relative mt-16 border-t border-white/5 bg-black/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-slate-500 text-sm">
            Powered by AI • Real-time Market Intelligence • PolyMarket Integration
          </p>
        </div>
      </footer>
    </div>
  );
}