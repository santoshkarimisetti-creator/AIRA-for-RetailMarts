import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { fetchSalesHistory } from '../services/api'
import { 
  Receipt, 
  Calendar, 
  Search, 
  TrendingUp, 
  Package, 
  DollarSign, 
  ShoppingBag, 
  Filter, 
  RotateCcw, 
  Download, 
  ArrowRight,
  Clock,
  Sparkles,
  Loader2
} from 'lucide-react'

export default function SalesHistory() {
  const [salesRecords, setSalesRecords] = useState([])
  const [loading, setLoading] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [summaryMetrics, setSummaryMetrics] = useState({
    totalRevenue: 0,
    totalUnits: 0,
    totalOrders: 0
  })

  // Filter States
  const [dateFilter, setDateFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const loadHistory = async (dateVal = dateFilter, searchVal = searchTerm) => {
    setLoading(true)
    try {
      const params = {
        limit: 250
      }
      if (dateVal && dateVal.trim()) params.date_filter = dateVal.trim()
      if (searchVal && searchVal.trim()) params.search = searchVal.trim()

      const res = await fetchSalesHistory(params)
      if (res && res.records) {
        setSalesRecords(res.records)
        setTotalCount(res.count || res.records.length)
        setSummaryMetrics({
          totalRevenue: res.totalRevenue || 0,
          totalUnits: res.totalUnits || 0,
          totalOrders: res.count || res.records.length
        })
      }
    } catch (err) {
      console.warn('[SalesHistory] Failed to load records from DB:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHistory(dateFilter, searchTerm)
  }, [dateFilter])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    loadHistory(dateFilter, searchTerm)
  }

  const handleResetFilters = () => {
    setDateFilter('')
    setSearchTerm('')
    loadHistory('', '')
  }

  const exportCSV = () => {
    if (salesRecords.length === 0) return
    const headers = ["Transaction ID", "Date & Time", "Product Name", "SKU", "Category", "Quantity Sold", "Price/Unit (₹)", "Total Amount (₹)", "Total Profit (₹)"]
    const rows = salesRecords.map(s => [
      `"${s.orderId}"`,
      `"${s.saleDate}"`,
      `"${s.productName}"`,
      s.sku,
      s.category,
      s.unitsSold,
      s.pricePerUnit,
      s.totalAmount,
      s.totalProfit
    ])

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `AIRA_Sales_History_${dateFilter || 'All'}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6 animate-fade-in pb-24 dashboard-workspace-bg max-w-7xl mx-auto">
      {/* Title & Quick Actions Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
            <Receipt className="w-6 h-6 text-blue-600" />
            <span>Sales & Transaction History</span>
            {loading && <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />}
          </h1>
          <p className="text-xs text-slate-500">
            Real-time audit ledger of customer purchases, timestamps, margins, and item-level transactions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link 
            to="/app/pos" 
            className="px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center space-x-2 shadow-sm transition-colors"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Open POS Counter</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>

          <button
            onClick={exportCSV}
            className="px-4 py-2.5 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center space-x-2 shadow-xs transition-colors"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar: Specific Date & Specific Item */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Specific Date Filter */}
          <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
            <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="font-semibold text-slate-600">Date:</span>
            <input 
              type="date" 
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-transparent text-slate-900 font-mono text-xs focus:outline-none"
            />
          </div>

          {/* Specific Item Search Filter */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input 
              type="text"
              placeholder="Filter by product name, SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
            />
          </div>

          <button 
            type="submit"
            className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs"
          >
            Filter
          </button>

          {(dateFilter || searchTerm) && (
            <button 
              type="button"
              onClick={handleResetFilters}
              className="px-2.5 py-1.5 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-semibold flex items-center space-x-1"
              title="Clear all filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </form>

        {/* Quick Date Shortcut Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-slate-600">
          <span className="text-slate-400 font-medium mr-1">Quick:</span>
          <button
            onClick={() => setDateFilter('2026-10-31')}
            className={`px-2.5 py-1 rounded-lg border transition-colors ${
              dateFilter === '2026-10-31' 
                ? 'bg-blue-50 border-blue-300 text-blue-700 font-bold' 
                : 'border-slate-200 hover:bg-slate-100'
            }`}
          >
            Today (Oct 31)
          </button>
          <button
            onClick={() => setDateFilter('2026-10-20')}
            className={`px-2.5 py-1 rounded-lg border transition-colors ${
              dateFilter === '2026-10-20' 
                ? 'bg-amber-50 border-amber-300 text-amber-800 font-bold' 
                : 'border-slate-200 hover:bg-slate-100'
            }`}
          >
            🎉 Dussehra (Oct 20)
          </button>
          <button
            onClick={() => setDateFilter('2026-08-28')}
            className={`px-2.5 py-1 rounded-lg border transition-colors ${
              dateFilter === '2026-08-28' 
                ? 'bg-purple-50 border-purple-300 text-purple-700 font-bold' 
                : 'border-slate-200 hover:bg-slate-100'
            }`}
          >
            Rakhi (Aug 28)
          </button>
          <button
            onClick={() => { setDateFilter(''); setSearchTerm(''); loadHistory('', ''); }}
            className={`px-2.5 py-1 rounded-lg border transition-colors ${
              !dateFilter 
                ? 'bg-slate-900 border-slate-900 text-white font-bold' 
                : 'border-slate-200 hover:bg-slate-100'
            }`}
          >
            All Time
          </button>
        </div>
      </div>

      {/* Filtered Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="p-4 rounded-2xl card-light space-y-1 border border-blue-100 bg-blue-50/20">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">Filtered Revenue</span>
            <div className="p-2 rounded-xl bg-blue-100 text-blue-600"><TrendingUp className="w-4 h-4" /></div>
          </div>
          <div className="text-xl font-extrabold text-blue-600">
            ₹{Number(summaryMetrics.totalRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-500">Live PostgreSQL sum</div>
        </div>

        {/* Transactions / Orders */}
        <div className="p-4 rounded-2xl card-light space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">Transactions</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600"><Receipt className="w-4 h-4" /></div>
          </div>
          <div className="text-xl font-extrabold text-slate-900">
            {Number(summaryMetrics.totalOrders || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-emerald-600 font-semibold">Matched sales rows</div>
        </div>

        {/* Units Sold */}
        <div className="p-4 rounded-2xl card-light space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">Units Sold</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600"><Package className="w-4 h-4" /></div>
          </div>
          <div className="text-xl font-extrabold text-amber-700">
            {Number(summaryMetrics.totalUnits || 0).toLocaleString('en-IN')} units
          </div>
          <div className="text-[10px] text-slate-500">Customer basket volume</div>
        </div>

        {/* Average Order Value */}
        <div className="p-4 rounded-2xl card-light space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">Avg Transaction Value</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600"><DollarSign className="w-4 h-4" /></div>
          </div>
          <div className="text-xl font-extrabold text-slate-900">
            ₹{summaryMetrics.totalOrders > 0 
              ? (summaryMetrics.totalRevenue / summaryMetrics.totalOrders).toFixed(2)
              : '0.00'
            }
          </div>
          <div className="text-[10px] text-slate-500">Revenue per ticket</div>
        </div>
      </div>

      {/* Transaction Records Table */}
      <div className="rounded-2xl card-light overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recorded Sales Transactions</h3>
            <p className="text-[11px] text-slate-500">Showing {salesRecords.length} records matching current filter</p>
          </div>
          <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-mono font-bold">
            {dateFilter ? `Date: ${dateFilter}` : 'All Dates'}
          </span>
        </div>

        {salesRecords.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Receipt className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800">No Sales Records Found</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No sales logged matching the selected date or search term. Try clearing filters or recording a new sale.
            </p>
            <button
              onClick={handleResetFilters}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Receipt / Order ID</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Qty</th>
                  <th className="py-3 px-4 text-right">Unit Price</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4 text-right">Net Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {salesRecords.map((s, idx) => (
                  <tr key={s.id || idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-blue-600">{s.orderId}</td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">{s.saleDate}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{s.productName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">SKU: {s.sku}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-semibold">
                        {s.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-800">{s.unitsSold}</td>
                    <td className="py-3 px-4 text-right text-slate-700 font-mono">₹{s.pricePerUnit}</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-600 font-mono">
                      ₹{Number(s.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-700 font-mono">
                      +₹{Number(s.totalProfit).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

