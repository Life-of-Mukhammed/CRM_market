'use client';
import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/ui/StatCard';
import { useQuery } from '@tanstack/react-query';
import { reports } from '@/lib/api';
import { formatMoney } from '@/lib/utils';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from 'recharts';
import { DashboardStats } from '@/types';

type Period = 'today' | 'week' | 'month' | 'year';

const periodLabels: Record<Period, string> = {
  today: 'Бугун',
  week: 'Бу ҳафта',
  month: 'Бу ой',
  year: 'Бу йил',
};

export default function DirektorDashboard() {
  const [period, setPeriod] = useState<Period>('month');

  const { data, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard', period],
    queryFn: () => reports.dashboard({ period }).then((r) => r.data),
  });

  const chartData = data?.chartData || [];
  const topProducts = data?.topProducts || [];
  const kassirStats = data?.kassirStats || [];
  const lowStock = data?.lowStock || [];
  const s = data?.summary;

  const formatChartMoney = (val: number) =>
    val >= 1_000_000 ? `${(val / 1_000_000).toFixed(1)}M` : `${(val / 1000).toFixed(0)}K`;

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">Аналитика дашборд</h1>
            <p className="text-gray-500 text-sm mt-1">AYFA дўкон кўрсаткичлари</p>
          </div>
          <div className="flex gap-1 p-1 bg-gray-100 dark:bg-dark-700 rounded-xl">
            {(Object.keys(periodLabels) as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                  period === p
                    ? 'bg-white dark:bg-dark-800 shadow text-gray-900 dark:text-white'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                }`}
              >
                {periodLabels[p]}
              </button>
            ))}
          </div>
        </div>

        {/* Summary stats */}
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-200 dark:bg-dark-700 rounded-2xl animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Савдо сони" value={`${s?.salesCount || 0} та`} icon="🛒" color="blue" />
            <StatCard title="Умумий тушум" value={formatMoney(s?.totalRevenue || 0)} icon="💰" color="green" />
            <StatCard title="Таннарх" value={formatMoney(s?.totalCost || 0)} icon="📦" color="orange" />
            <StatCard
              title="Фойда"
              value={formatMoney(s?.grossProfit || 0)}
              icon={s?.grossProfit && s.grossProfit >= 0 ? '✅' : '❌'}
              color={s?.grossProfit && s.grossProfit >= 0 ? 'green' : 'red'}
            />
          </div>
        )}

        {/* Stock value */}
        {!isLoading && (
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              title="Омбордаги товар (таннарх)"
              value={formatMoney(s?.stockValueCost || 0)}
              sub="Сотиб олинган нархда"
              icon="🏬"
              color="purple"
            />
            <StatCard
              title="Омбордаги товар (сотув нархида)"
              value={formatMoney(s?.stockValueSale || 0)}
              sub="Сотилса келадиган тушум"
              icon="🏷️"
              color="blue"
            />
          </div>
        )}

        {/* Low stock alert */}
        {lowStock.length > 0 && (
          <div className="card p-4 border-l-4 border-l-red-500">
            <p className="font-bold text-red-600 flex items-center gap-2 mb-2">⚠️ Омборда тугаган маҳсулотлар</p>
            <div className="flex flex-wrap gap-2">
              {lowStock.map((p) => (
                <span key={p.id} className="badge bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400">
                  {p.name}: {p.quantity} {p.unit}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Revenue chart */}
          <div className="card p-5">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4">Тушум ва фойда динамикаси</h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4a2482" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#4a2482" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d4af37" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#d4af37" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.split('-').slice(1).join('/')} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={formatChartMoney} />
                <Tooltip formatter={(val: number) => formatMoney(val)} labelStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="revenue" name="Тушум" stroke="#4a2482" fill="url(#colorRevenue)" strokeWidth={2} />
                <Area type="monotone" dataKey="profit" name="Фойда" stroke="#d4af37" fill="url(#colorProfit)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Kassir comparison */}
          <div className="card p-5">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4">Кассирлар бўйича савдо</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={kassirStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={formatChartMoney} />
                <Tooltip formatter={(val: number) => formatMoney(val)} />
                <Bar dataKey="revenue" name="Тушум" fill="#4a2482" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top products */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-dark-700">
            <h3 className="font-bold text-gray-900 dark:text-white">🏆 Энг кўп сотилган маҳсулотлар</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-dark-700">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Маҳсулот</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Миқдор</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Тушум</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Фойда</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-dark-700">
                {topProducts.map((p, i) => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-dark-700">
                    <td className="px-4 py-3">
                      <span className={`font-black text-lg ${
                        i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-orange-600' : 'text-gray-300'
                      }`}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-sm text-gray-900 dark:text-white">{p.name}</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-400">
                      {p.quantity.toFixed(1)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-sm text-primary-700 dark:text-primary-400">
                      {formatMoney(p.revenue)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-sm text-green-600">
                      {formatMoney(p.profit)}
                    </td>
                  </tr>
                ))}
                {topProducts.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-8 text-gray-400">Маълумот йўқ</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
