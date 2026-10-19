import React, { useMemo, useState } from 'react';
import { Calendar, TrendingUp, Zap, Clock, Award, CheckCircle, BarChart2 } from 'lucide-react';
import { Card, ReviewLog } from '../types/anki';

interface StatsViewProps {
  cards: Card[];
  reviewLogs: ReviewLog[];
}

export const StatsView: React.FC<StatsViewProps> = ({ cards, reviewLogs }) => {
  const [hoveredDay, setHoveredDay] = useState<{ date: string; label: string; count: number } | null>(null);

  // Group reviews by day string (YYYY-MM-DD)
  const reviewsByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const log of reviewLogs) {
      const d = new Date(log.reviewTime);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
      map.set(key, (map.get(key) || 0) + 1);
    }
    return map;
  }, [reviewLogs]);

  // Generate last 70 days for heatmap
  const heatmapDays = useMemo(() => {
    const days: { dateStr: string; label: string; count: number }[] = [];
    const now = new Date();
    // 10 weeks = 70 days
    for (let i = 69; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
      const count = reviewsByDay.get(key) || 0;
      days.push({
        dateStr: key,
        label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        count,
      });
    }
    return days;
  }, [reviewsByDay]);

  // Retention rate calculation
  const stats = useMemo(() => {
    const totalLogs = reviewLogs.length;
    const successfulLogs = reviewLogs.filter((l) => l.rating === 3 || l.rating === 4).length;
    const retentionRate = totalLogs > 0 ? Math.round((successfulLogs / totalLogs) * 100) : 100;

    // Today's logs
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();
    const todayLogs = reviewLogs.filter((l) => l.reviewTime >= todayMs);
    const todayCount = todayLogs.length;

    // Total study time spent in minutes
    const totalTimeMs = reviewLogs.reduce((sum, l) => sum + (l.timeSpentMs || 0), 0);
    const totalMinutes = Math.max(1, Math.round(totalTimeMs / 60000));

    // Card categorization: New vs Learning vs Young vs Mature
    let mature = 0;
    let young = 0;
    let learning = 0;
    let newCards = 0;

    for (const c of cards) {
      if (c.state === 'new') newCards++;
      else if (c.state === 'learning' || c.state === 'relearning') learning++;
      else if (c.interval >= 21) mature++;
      else young++;
    }

    return {
      totalLogs,
      retentionRate,
      todayCount,
      totalMinutes,
      mature,
      young,
      learning,
      newCards,
      totalCards: cards.length,
    };
  }, [cards, reviewLogs]);

  // Upcoming 14-day review forecast
  const forecastDays = useMemo(() => {
    const days: { label: string; count: number }[] = [];
    const now = new Date();

    for (let i = 0; i < 14; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      d.setHours(0, 0, 0, 0);
      const startOfDay = d.getTime();
      const endOfDay = startOfDay + 24 * 60 * 60 * 1000 - 1;

      // Cards due on this day
      const count = cards.filter(
        (c) => c.state !== 'new' && c.dueDate >= startOfDay && c.dueDate <= endOfDay
      ).length;

      days.push({
        label: i === 0 ? 'Today' : i === 1 ? 'Tmrw' : `${d.getDate()}/${d.getMonth() + 1}`,
        count,
      });
    }

    const maxCount = Math.max(1, ...days.map((d) => d.count));
    return { days, maxCount };
  }, [cards]);

  // Heatmap intensity color
  const getCellColor = (count: number) => {
    if (count === 0) return 'bg-slate-800/50 hover:bg-slate-700/60';
    if (count < 5) return 'bg-emerald-900/60 border border-emerald-700/40';
    if (count < 15) return 'bg-emerald-700/80 border border-emerald-600/50';
    if (count < 30) return 'bg-emerald-500 text-white';
    return 'bg-cyan-400 text-black font-bold';
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl border border-slate-800 bg-[#161B22] shadow-sm">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
            <Award className="w-4 h-4 text-emerald-400" />
            <span>Retention Rate</span>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold font-mono text-emerald-400">
            {stats.retentionRate}%
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Based on {stats.totalLogs} reviews</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-[#161B22] shadow-sm">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
            <Zap className="w-4 h-4 text-indigo-400" />
            <span>Reviewed Today</span>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold font-mono text-indigo-400">
            {stats.todayCount}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Cards recalled today</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-[#161B22] shadow-sm">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>Study Time</span>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold font-mono text-cyan-400">
            {stats.totalMinutes}m
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Active review session time</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-[#161B22] shadow-sm">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
            <TrendingUp className="w-4 h-4 text-purple-400" />
            <span>Mature Cards</span>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold font-mono text-purple-400">
            {stats.mature}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">&gt;21 day interval mastery</p>
        </div>
      </div>

      {/* Review Activity Heatmap */}
      <div className="rounded-2xl border border-slate-800 bg-[#161B22] p-5 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-400" />
            <h2 className="text-base font-semibold text-white">Review Activity Heatmap</h2>
          </div>
          {hoveredDay && (
            <span className="text-xs text-indigo-300 font-mono">
              {hoveredDay.label}: {hoveredDay.count} reviews
            </span>
          )}
        </div>

        {/* Heatmap Grid (10 columns x 7 days) */}
        <div className="flex flex-wrap gap-1.5 justify-center sm:justify-start">
          {heatmapDays.map((d) => (
            <div
              key={d.dateStr}
              onMouseEnter={() => setHoveredDay({ date: d.dateStr, label: d.label, count: d.count })}
              onMouseLeave={() => setHoveredDay(null)}
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-xs transition-colors cursor-pointer ${getCellColor(
                d.count
              )}`}
              title={`${d.label}: ${d.count} reviews`}
            />
          ))}
        </div>

        {/* Heatmap Legend */}
        <div className="mt-4 flex items-center justify-between text-[11px] text-slate-500 pt-3 border-t border-slate-800/80">
          <span>Last 70 days</span>
          <div className="flex items-center gap-1.5">
            <span>Less</span>
            <div className="w-3 h-3 rounded-xs bg-slate-800" />
            <div className="w-3 h-3 rounded-xs bg-emerald-900" />
            <div className="w-3 h-3 rounded-xs bg-emerald-700" />
            <div className="w-3 h-3 rounded-xs bg-emerald-500" />
            <div className="w-3 h-3 rounded-xs bg-cyan-400" />
            <span>More</span>
          </div>
        </div>
      </div>

      {/* Two-Column Grid: Future Forecast & Card State Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Upcoming 14-Day Forecast */}
        <div className="rounded-2xl border border-slate-800 bg-[#161B22] p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BarChart2 className="w-4 h-4 text-cyan-400" />
              <h2 className="text-base font-semibold text-white">14-Day Due Forecast</h2>
            </div>
            <p className="text-xs text-slate-400 mb-6">
              Projected daily reviews scheduled by the SM-2 algorithm.
            </p>
          </div>

          <div className="flex items-end gap-1.5 h-36 pt-4 border-b border-slate-800 pb-2">
            {forecastDays.days.map((d, idx) => {
              const heightPercent = Math.max(8, Math.round((d.count / forecastDays.maxCount) * 100));
              return (
                <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                  <span className="text-[10px] font-mono text-slate-400 group-hover:text-cyan-300 mb-1 opacity-0 group-hover:opacity-100 transition">
                    {d.count}
                  </span>
                  <div
                    className={`w-full rounded-t transition-all ${
                      idx === 0
                        ? 'bg-indigo-500'
                        : d.count > 0
                        ? 'bg-slate-700 group-hover:bg-cyan-500'
                        : 'bg-slate-800/40'
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  />
                  <span className="text-[9px] text-slate-500 mt-2 truncate w-full text-center">
                    {d.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Card Maturity Distribution */}
        <div className="rounded-2xl border border-slate-800 bg-[#161B22] p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <h2 className="text-base font-semibold text-white">Card Distribution</h2>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Current lifecycle progression of your entire flashcard collection.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-blue-400">New (Unstudied)</span>
                <span className="font-mono text-slate-300">{stats.newCards}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{
                    width: `${stats.totalCards > 0 ? (stats.newCards / stats.totalCards) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-rose-400">Learning & Relearning</span>
                <span className="font-mono text-slate-300">{stats.learning}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-rose-500 rounded-full"
                  style={{
                    width: `${stats.totalCards > 0 ? (stats.learning / stats.totalCards) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-emerald-400">Young (&lt;21 days)</span>
                <span className="font-mono text-slate-300">{stats.young}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{
                    width: `${stats.totalCards > 0 ? (stats.young / stats.totalCards) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-purple-400">Mature (&ge;21 days)</span>
                <span className="font-mono text-slate-300">{stats.mature}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full"
                  style={{
                    width: `${stats.totalCards > 0 ? (stats.mature / stats.totalCards) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
