import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { fetchSalesHistory } from '../services/api'
import ProductImage from '../components/common/ProductImage'
import { 
  Receipt, 
  Calendar, 
  Search, 
  TrendingUp, 
  Package, 
  DollarSign, 
  ShoppingBag, 
  RotateCcw, 
  Download, 
  ArrowRight,
  Clock,
  Sparkles,
  Loader2,
  Eye,
  X,
  Printer,
  Tag,
  Percent,
  CheckCircle2,
  ChevronRight
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

  // Selected Order for Detail Modal
  const [selectedOrder, setSelectedOrder] = useState(null)

  // Filter States
  const [dateFilter, setDateFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const loadHistory = async (dateVal = dateFilter, searchVal = searchTerm) => {
    setLoading(true)
    try {
      const params = {
        limit: 300
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
    const headers = ["Order ID", "Date & Time (IST)", "Items Count", "Total Units", "Subtotal (₹)", "Discount (₹)", "Tax (₹)", "Total Amount (₹)"]
    const rows = salesRecords.map(o => [
      `"${o.orderId}"`,
      `"${o.saleDate}"`,
      o.itemCount,
      o.totalUnits,
      o.subtotal,
      o.discountAmount,
      o.taxAmount,
      o.totalAmount
    ])

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `AIRA_Orders_History_${dateFilter || 'All'}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6 animate-fade-in pb-24 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white shadow-xl border border-blue-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wide bg-blue-500/20 text-blue-300 border border-blue-400/30">
              Order Transactions Log
            </span>
            <span className="text-xs text-slate-400">Live PostgreSQL Database</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1 flex items-center space-x-3">
            <span>Sales & Order History</span>
            <Receipt className="w-6 h-6 text-blue-400 shrink-0" />
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            View completed customer checkout transactions in Indian Standard Time (IST). Click on any order to inspect item quantities, discounts, tax, and itemized bill breakdown.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => loadHistory(dateFilter, searchTerm)}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center space-x-1.5 transition-all shadow-sm"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={exportCSV}
            disabled={salesRecords.length === 0}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md shadow-blue-500/20 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 sm:p-5 rounded-2xl card-light space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search by Product Name, SKU, Category, or Invoice ID */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by Invoice ID (e.g., INV-...), Product Name, SKU, or Category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:outline-none focus:bg-white focus:border-blue-500 transition-all"
            />
          </div>

          {/* Date Picker */}
          <div className="relative w-full md:w-56">
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:outline-none focus:bg-white focus:border-blue-500 transition-all"
            />
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center space-x-1"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Filter</span>
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
            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">Total Orders</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600"><Receipt className="w-4 h-4" /></div>
          </div>
          <div className="text-xl font-extrabold text-slate-900">
            {Number(summaryMetrics.totalOrders || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-500">Completed checkout bills</div>
        </div>

        {/* Units Sold */}
        <div className="p-4 rounded-2xl card-light space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">Units Sold</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600"><Package className="w-4 h-4" /></div>
          </div>
          <div className="text-xl font-extrabold text-slate-900">
            {Number(summaryMetrics.totalUnits || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-500">Physical units purchased</div>
        </div>

        {/* Avg Order Value */}
        <div className="p-4 rounded-2xl card-light space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">Avg Order Value</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600"><DollarSign className="w-4 h-4" /></div>
          </div>
          <div className="text-xl font-extrabold text-slate-900">
            ₹{summaryMetrics.totalOrders > 0 
              ? (summaryMetrics.totalRevenue / summaryMetrics.totalOrders).toFixed(2)
              : '0.00'
            }
          </div>
          <div className="text-[10px] text-slate-500">Average ticket size</div>
        </div>
      </div>

      {/* Grouped Orders Table */}
      <div className="rounded-2xl card-light overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Completed Checkout Orders</h3>
            <p className="text-[11px] text-slate-500">Showing {salesRecords.length} order invoices (grouped by sale transaction)</p>
          </div>
          <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-mono font-bold">
            {dateFilter ? `Date: ${dateFilter}` : 'All Dates (IST)'}
          </span>
        </div>

        {loading ? (
          <div className="p-16 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-medium">Fetching orders from PostgreSQL...</p>
          </div>
        ) : salesRecords.length === 0 ? (
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
                  <th className="py-3 px-4">Invoice / Order ID</th>
                  <th className="py-3 px-4">Date & Time (IST)</th>
                  <th className="py-3 px-4">Purchased Items</th>
                  <th className="py-3 px-4 text-right">Subtotal</th>
                  <th className="py-3 px-4 text-right">Discount</th>
                  <th className="py-3 px-4 text-right">Tax (GST)</th>
                  <th className="py-3 px-4 text-right">Grand Total</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {salesRecords.map((order, idx) => {
                  const firstItem = order.items && order.items[0]
                  const remainingCount = (order.itemCount || 1) - 1

                  return (
                    <tr 
                      key={order.orderId || idx} 
                      onClick={() => setSelectedOrder(order)}
                      className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-600 group-hover:underline flex items-center space-x-1.5">
                        <Receipt className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span>{order.orderId}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                        <div className="font-semibold text-slate-900">{order.dateDisplay || order.saleDate}</div>
                        <div className="text-[10px] text-slate-400">{order.timeDisplay || ''}</div>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="flex items-center space-x-2">
                          {firstItem && (
                            <ProductImage 
                              src={firstItem.image} 
                              alt={firstItem.productName} 
                              category={firstItem.category} 
                              className="w-7 h-7 rounded-lg"
                            />
                          )}
                          <div className="truncate">
                            <span className="font-bold text-slate-900">
                              {firstItem ? firstItem.productName : 'General Item'}
                            </span>
                            {remainingCount > 0 && (
                              <span className="ml-1.5 px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-700 font-bold text-[10px]">
                                +{remainingCount} more
                              </span>
                            )}
                            <div className="text-[10px] text-slate-400">
                              {order.totalUnits} unit{order.totalUnits > 1 ? 's' : ''} across {order.itemCount} line item{order.itemCount > 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                        ₹{Number(order.subtotal || order.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-emerald-600 font-semibold">
                        {order.discountAmount > 0 
                          ? `-₹${Number(order.discountAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` 
                          : '₹0.00'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-500 text-[11px]">
                        ₹{Number(order.taxAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900 font-mono text-sm">
                        ₹{Number(order.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedOrder(order)
                          }}
                          className="px-2.5 py-1 rounded-xl bg-slate-100 group-hover:bg-blue-600 group-hover:text-white text-slate-600 text-[11px] font-bold transition-all flex items-center space-x-1 mx-auto"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Receipt</span>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DETAIL MODAL: ITEMIZED RECEIPT BREAKDOWN */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 space-y-5 my-8 relative">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    Official Tax Receipt
                  </span>
                  <span className="text-xs text-slate-400 font-mono">{selectedOrder.saleDate}</span>
                </div>
                <h3 className="text-xl font-extrabold text-slate-900 mt-1 flex items-center space-x-2">
                  <span>Invoice: {selectedOrder.orderId}</span>
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Line Items Table */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Purchased Items Breakdown</h4>
              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Item Name</th>
                      <th className="py-2.5 px-2 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Unit Price</th>
                      <th className="py-2.5 px-3 text-right">Discount</th>
                      <th className="py-2.5 px-3 text-right">Tax (5%)</th>
                      <th className="py-2.5 px-3 text-right">Item Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {selectedOrder.items && selectedOrder.items.map((it, idx) => (
                      <tr key={it.id || idx} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center space-x-2">
                            <ProductImage 
                              src={it.image} 
                              alt={it.productName} 
                              category={it.category} 
                              className="w-8 h-8 rounded-lg"
                            />
                            <div>
                              <div className="font-bold text-slate-900">{it.productName}</div>
                              <div className="text-[10px] text-slate-400 font-mono">SKU: {it.sku} • {it.category}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold text-slate-800">{it.unitsSold}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">₹{Number(it.pricePerUnit).toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-emerald-600">
                          {it.discount > 0 ? `-₹${Number(it.discount).toFixed(2)}` : '₹0.00'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-500 text-[11px]">
                          ₹{Number(it.tax || 0).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          ₹{Number(it.totalPrice || it.subtotal).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bill Financial Summary */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal ({selectedOrder.totalUnits} items):</span>
                <span className="font-mono font-bold">₹{Number(selectedOrder.subtotal || selectedOrder.totalAmount).toFixed(2)}</span>
              </div>

              {selectedOrder.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Store Clearance / Promo Discount:</span>
                  <span className="font-mono font-bold">-₹{Number(selectedOrder.discountAmount).toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>GST Tax (5% CGST + SGST):</span>
                <span className="font-mono">₹{Number(selectedOrder.taxAmount || 0).toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-baseline pt-2 border-t border-slate-200 text-base font-extrabold text-slate-900">
                <span>Grand Total Paid:</span>
                <span className="text-xl font-black text-blue-600 font-mono">
                  ₹{Number(selectedOrder.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-between items-center pt-2">
              <span className="text-[11px] text-slate-400 font-medium flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Recorded in PostgreSQL aira_db</span>
              </span>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center space-x-1.5 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Bill</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
