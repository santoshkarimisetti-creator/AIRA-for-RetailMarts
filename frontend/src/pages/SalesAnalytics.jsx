import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { fetchSalesAnalytics } from '../services/api'
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  Tooltip as RechartsTooltip, 
  CartesianGrid 
} from 'recharts'
import { 
  TrendingUp, 
  DollarSign, 
  Package, 
  ShoppingBag, 
  Calendar, 
  Award, 
  Clock, 
  RefreshCw, 
  ArrowRight,
  Sparkles,
  Loader2
} from 'lucide-react'

const CATEGORY_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#6366f1', '#14b8a6']

export default function SalesAnalytics() {
  const [period, setPeriod] = useState('30d') // '7d' | '30d' | '6m'
  const [loading, setLoading] = useState(false)
  const [chartData, setChartData] = useState([])
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalUnits: 0,
    aov: 0,
    dateRangeLabel: 'Fetching live DB records...',
    peakHour: '6:00 PM - 8:30 PM (Evening Rush)'
  })
  const [categories, setCategories] = useState([])
  const [topSellers, setTopSellers] = useState([])

  const loadData = async (selectedPeriod) => {
    setLoading(true)
    try {
      const res = await fetchSalesAnalytics(selectedPeriod)
      if (res) {
        if (res.dailyChart) setChartData(res.dailyChart)
        if (res.summary) setSummary(res.summary)
        if (res.categoryPerformance) setCategories(res.categoryPerformance)
        if (res.topSellers) setTopSellers(res.topSellers)
      }
    } catch (err) {
      console.warn('[SalesAnalytics] Failed to fetch analytics from DB:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData(period)
  }, [period])

  return (
    <div className="space-y-6 animate-fade-in pb-24 dashboard-workspace-bg max-w-7xl mx-auto">
      {/* Title & 3 Filter Buttons Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
            <span>Sales Intelligence & Revenue Analytics</span>
            {loading && <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />}
          </h1>
          <p className="text-xs text-slate-500">
            Real-time PostgreSQL transaction metrics, festive demand trends, and category distribution.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link 
            to="/app/product-stats" 
            className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-2 shadow-sm transition-colors"
          >
            <DollarSign className="w-4 h-4" />
            <span>Product Profit & Stats Ledger</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>

          {/* 3 Responsive Period Filter Buttons (7 Days | 30 Days | 6 Months) */}
          <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-xs">
            <button
              onClick={() => setPeriod('7d')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                period === '7d'
                  ? 'bg-blue-600 text-white shadow-sm scale-102'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setPeriod('30d')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                period === '30d'
                  ? 'bg-blue-600 text-white shadow-sm scale-102'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              30 Days
            </button>
            <button
              onClick={() => setPeriod('6m')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                period === '6m'
                  ? 'bg-blue-600 text-white shadow-sm scale-102'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              6 Months
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards - Dynamically Driven from DB for Selected Period */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: AOV */}
        <div className="p-5 rounded-2xl card-light space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Average Order Value (AOV)</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600"><DollarSign className="w-4 h-4" /></div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            ₹{Number(summary.aov || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold">
            Across {Number(summary.totalOrders || 0).toLocaleString('en-IN')} orders ({Number(summary.totalUnits || 0).toLocaleString('en-IN')} units)
          </span>
        </div>

        {/* Card 2: Period Total Revenue */}
        <div className="p-5 rounded-2xl card-light space-y-1 border border-blue-100 bg-blue-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs text-blue-700 font-semibold uppercase tracking-wider">
              {period === '7d' ? 'Last 7 Days Sales' : period === '6m' ? 'Last 6 Months Sales' : 'Last 30 Days Sales'}
            </span>
            <div className="p-2 rounded-xl bg-blue-100 text-blue-600"><TrendingUp className="w-4 h-4" /></div>
          </div>
          <div className="text-2xl font-extrabold text-blue-600">
            ₹{Number(summary.totalRevenue || 0).toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            {summary.dateRangeLabel}
          </span>
        </div>

        {/* Card 3: Peak Sales Rush */}
        <div className="p-5 rounded-2xl card-light space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Peak Sales Window</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600"><Clock className="w-4 h-4" /></div>
          </div>
          <div className="text-2xl font-extrabold text-purple-600">
            {summary.peakHour || '6:00 PM - 8:30 PM'}
          </div>
          <span className="text-[11px] text-slate-500 font-semibold">
            Primary household grocery footfall
          </span>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Revenue Trend Area Chart */}
        <div className="lg:col-span-8 p-6 rounded-2xl card-light">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <span>Revenue & Order Volume Trend</span>
                {period === '30d' && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                    🎉 Dussehra Surge on Oct 20
                  </span>
                )}
                {period === '6m' && (
                  <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                    Rakhi, Ganesh & Dussehra Festive Spikes
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                View: {summary.dateRangeLabel}
              </p>
            </div>
            <div className="flex items-center space-x-2 text-xs font-mono text-slate-600">
              <span className="w-3 h-3 rounded-full bg-blue-500" />
              <span>Revenue (₹)</span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 25 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="day" 
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  interval={period === '30d' ? 2 : 0}
                  angle={period === '30d' ? -35 : 0}
                  textAnchor={period === '30d' ? 'end' : 'middle'}
                  height={period === '30d' ? 45 : 30}
                />
                <YAxis 
                  tick={{ fill: '#64748b', fontSize: 11 }} 
                  tickFormatter={(val) => val >= 100000 ? `₹${(val / 100000).toFixed(1)}L` : `₹${Math.round(val / 1000)}k`}
                />
                <RechartsTooltip 
                  formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Revenue']}
                  labelFormatter={(lbl) => `${lbl}`}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', border: 'none', fontSize: '12px' }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#2563eb" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Share Donut Chart */}
        <div className="lg:col-span-4 p-6 rounded-2xl card-light flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Revenue Share by Category</h3>
            <p className="text-xs text-slate-500 mb-4">PostgreSQL category aggregations</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={categories.length > 0 ? categories : [{ name: 'Grocery', value: 100 }]} 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={50} 
                    outerRadius={80} 
                    dataKey="value"
                    paddingAngle={3}
                  >
                    {categories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Revenue']}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', border: 'none', fontSize: '11px' }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category Legends */}
          <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100 text-[11px]">
            {categories.slice(0, 6).map((c, idx) => (
              <div key={idx} className="flex items-center space-x-1.5 truncate">
                <span 
                  className="w-2.5 h-2.5 rounded-full shrink-0" 
                  style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }} 
                />
                <span className="text-slate-700 truncate font-medium">{c.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top 5 High-Demand Products */}
      {topSellers.length > 0 && (
        <div className="p-6 rounded-2xl card-light">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Top Performing Products</h3>
              <p className="text-xs text-slate-500">Fastest selling inventory based on logged sales</p>
            </div>
            <Award className="w-5 h-5 text-amber-500" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-2.5 px-3">Product Name</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Selling Price</th>
                  <th className="py-2.5 px-3">Units Sold</th>
                  <th className="py-2.5 px-3">Total Revenue</th>
                  <th className="py-2.5 px-3">Stock Left</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {topSellers.map((prod, idx) => (
                  <tr key={prod.id || idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-900">{prod.name}</td>
                    <td className="py-3 px-3 text-slate-600">{prod.category}</td>
                    <td className="py-3 px-3 text-slate-900 font-bold">₹{prod.price}</td>
                    <td className="py-3 px-3 text-blue-600 font-bold">{prod.unitsSold} units</td>
                    <td className="py-3 px-3 text-emerald-600 font-bold">₹{Number(prod.revenue || 0).toLocaleString('en-IN')}</td>
                    <td className="py-3 px-3 text-slate-700">{prod.stock}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        prod.status === 'Healthy' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {prod.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
