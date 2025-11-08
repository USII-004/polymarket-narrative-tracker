"use client"

import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity, Clock, Flame, ArrowUpRight, ArrowDownRight, RefreshCw, Sparkles, DollarSign, BarChart3 } from 'lucide-react';

interface Market {
  id: string;
  title: string;
  category: string;
  yesPrice: number;
  noPrice: number;
  volume24h: number;
  totalVolume: number;
  lastUpdated: string;
  image?: string;
}

interface TrendingEvent {
  id: string;
  marketTitle: string;
  eventType: string;
  oldRank?: number;
  newRank?: number;
  volume24h: number;
  createdAt: string;
}

export default function Top20Dashboard() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [events, setEvents] = useState<TrendingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [marketsRes, eventsRes] = await Promise.all([
        fetch('/api/top20'),
        fetch('/api/trending-events?limit=15')
      ]);

      const marketsData = await marketsRes.json();
      const eventsData = await eventsRes.json();

      setMarkets(marketsData.markets || []);
      setEvents(eventsData.events || []);
      setLastUpdate(new Date(marketsData.lastUpdated || new Date()));
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

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) return `$${(volume / 1000000).toFixed(2)}M`;
    if (volume >= 1000) return `$${(volume / 1000).toFixed(1)}K`;
    return `$${volume.toFixed(0)}`;
  };

  const formatTimeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'ENTERED': return <ArrowUpRight className="w-5 h-5 text-emerald-400" />;
      case 'EXITED': return <ArrowDownRight className="w-5 h-5 text-rose-400" />;
      default: return <Activity className="w-5 h-5 text-slate-400" />;
    }
  };

  const totalVolume24h = markets.reduce((sum, m) => sum + m.volume24h, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin"></div>
          </div>
          <p className="text-violet-300 text-lg font-medium mt-4">Loading markets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-violet-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Header */}
      <header className="relative border-b border-white/5 bg-black/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-purple-500 rounded-2xl blur-xl opacity-50"></div>
                <div className="relative bg-gradient-to-r from-violet-600 to-purple-600 p-3 rounded-2xl">
                  <Flame className="w-8 h-8 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">
                  Top 20 PolyMarket
                </h1>
                <p className="text-violet-300 text-sm mt-1 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Highest 24h Volume • Updated Every 4 Hours
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-slate-400 bg-black/30 px-4 py-2 rounded-xl border border-white/10">
                <Clock className="w-4 h-4" />
                {formatTimeAgo(lastUpdate.toISOString())}
              </div>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all text-white disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-400 text-sm">Total 24h Volume</p>
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-white text-3xl font-bold">{formatVolume(totalVolume24h)}</p>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-400 text-sm">Active Markets</p>
              <BarChart3 className="w-5 h-5 text-violet-400" />
            </div>
            <p className="text-white text-3xl font-bold">{markets.length}</p>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-400 text-sm">Recent Events</p>
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <p className="text-white text-3xl font-bold">{events.length}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - Top 20 Markets */}
          <div className="lg:col-span-2">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <span className="text-3xl">🏆</span>
                  Top 20 by Daily Volume
                </h2>
                <span className="text-sm text-slate-400 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                  24h ranking
                </span>
              </div>

              <div className="space-y-3">
                {markets.map((market, index) => (
                  <div
                    key={market.id}
                    className="group relative bg-white/5 backdrop-blur-xl rounded-xl p-5 border border-white/10 hover:border-violet-500/50 transition-all hover:shadow-2xl hover:shadow-violet-500/10"
                  >
                    {/* Rank Badge */}
                    <div className="absolute -left-2 -top-2 w-10 h-10 bg-gradient-to-br from-violet-600 to-purple-600 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-lg">
                      {index + 1}
                    </div>

                    <div className="flex items-start gap-4 ml-6">
                      {market.image && (
                        <img
                          src={market.image}
                          alt=""
                          className="w-12 h-12 rounded-lg object-cover border border-white/10"
                        />
                      )}

                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-semibold text-lg mb-3 group-hover:text-violet-300 transition-colors">
                          {market.title}
                        </h3>

                        {/* Market Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {/* 24h Volume */}
                          <div className="bg-violet-500/10 rounded-lg p-3 border border-violet-500/20">
                            <p className="text-xs text-violet-400 mb-1">24h Volume</p>
                            <p className="text-white font-bold">
                              {formatVolume(market.volume24h)}
                            </p>
                          </div>

                          {/* YES Price */}
                          <div className="bg-emerald-500/10 rounded-lg p-3 border border-emerald-500/20">
                            <p className="text-xs text-emerald-400 mb-1">YES</p>
                            <p className="text-emerald-400 font-bold text-lg">
                              {(market.yesPrice * 100).toFixed(1)}%
                            </p>
                          </div>

                          {/* NO Price */}
                          <div className="bg-rose-500/10 rounded-lg p-3 border border-rose-500/20">
                            <p className="text-xs text-rose-400 mb-1">NO</p>
                            <p className="text-rose-400 font-bold text-lg">
                              {(market.noPrice * 100).toFixed(1)}%
                            </p>
                          </div>

                          {/* Total Volume */}
                          <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-500/20">
                            <p className="text-xs text-blue-400 mb-1">Total Vol</p>
                            <p className="text-blue-400 font-semibold text-sm">
                              {formatVolume(market.totalVolume)}
                            </p>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-slate-400">Price distribution</span>
                          </div>
                          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-500 to-violet-500 rounded-full transition-all"
                              style={{ width: `${market.yesPrice * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {markets.length === 0 && (
                  <div className="text-center py-16">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/5 border border-white/10 mb-4">
                      <TrendingUp className="w-10 h-10 text-slate-500" />
                    </div>
                    <p className="text-slate-400 text-lg font-medium">No markets found</p>
                    <p className="text-slate-600 text-sm mt-2">Data will appear after first update</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar - Trending Events */}
          <div className="space-y-6">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-amber-400" />
                Trending Events
              </h2>

              <div className="space-y-3">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10 transition-all hover:border-amber-500/30"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getEventIcon(event.eventType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-violet-400 font-medium mb-1">
                          {event.eventType === 'ENTERED' && '🎉 Entered Top 20'}
                          {event.eventType === 'EXITED' && '👋 Left Top 20'}
                        </p>
                        <p className="text-white text-sm mb-2 line-clamp-2 font-medium">
                          {event.marketTitle}
                        </p>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">
                            {event.newRank && `#${event.newRank}`}
                            {formatVolume(event.volume24h)}
                          </span>
                          <span className="text-slate-500">
                            {formatTimeAgo(event.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {events.length === 0 && (
                  <p className="text-slate-400 text-sm text-center py-8">
                    No recent events
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative mt-16 border-t border-white/5 bg-black/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-slate-500 text-sm">
            Updates every 4 hours • Sorted by 24-hour volume • Powered by PolyMarket API
          </p>
        </div>
      </footer>
    </div>
  );
}