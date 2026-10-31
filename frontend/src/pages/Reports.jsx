import { fetchReportsSummary, fetchDashboardStats } from '../services/api'
import { useEffect } from 'react'
import React, { useState } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { products, storeInfo, kpiMetrics, aiInsights } from '../utils/demoData'
import { FileText, Download, FileSpreadsheet, Eye, Printer, Sparkles, CheckCircle2 } from 'lucide-react'

export default function Reports() {

  const [liveProducts, setLiveProducts] = useState(products)
  const [liveKpis, setLiveKpis] = useState(kpiMetrics)

  useEffect(() => {
    fetchReportsSummary().then(res => {
      if (res && res.products && res.products.length > 0) {
        setLiveProducts(res.products)
      }
    }).catch(() => {})
    fetchDashboardStats().then(s => {
      if (s) setLiveKpis(s)
    }).catch(() => {})
  }, [])

  const [reportType, setReportType] = useState('Executive Store Performance')
  const [dateRange, setDateRange] = useState('October 2026')
  const [includeForecast, setIncludeForecast] = useState(true)
  const [includeAi, setIncludeAi] = useState(true)

  const generatePDF = () => {
    const doc = new jsPDF()

    // Title & Header
    doc.setFillColor(7, 17, 31)
    doc.rect(0, 0, 210, 35, 'F')

    doc.setTextColor(0, 217, 255)
    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.text('AIRA RETAIL ANALYTICS', 14, 20)

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`${storeInfo.name} • Executive Store Report`, 14, 28)
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 150, 28)

    // Executive KPI Summary Section
    doc.setTextColor(7, 17, 31)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('1. Executive KPI Summary', 14, 48)

    const kpiData = [
      ['Metric', 'Current Period', 'Change', 'Status'],
      ['Today\'s Sales', (liveKpis.todaysSales || kpiMetrics.todaysSales), (liveKpis.salesChange || kpiMetrics.salesChange), 'Optimal'],
      ['Total Orders', (liveKpis.orders || kpiMetrics.orders), (liveKpis.ordersChange || kpiMetrics.ordersChange), 'Healthy'],
      ['Total Revenue', (liveKpis.revenue || kpiMetrics.revenue), (liveKpis.revenueChange || kpiMetrics.revenueChange), 'On Target'],
      ['Stock Value', (liveKpis.stockValue || kpiMetrics.stockValue), (liveKpis.stockValueChange || kpiMetrics.stockValueChange), 'Stable'],
      ['Low Stock Items', String(liveKpis.lowStockCount || kpiMetrics.lowStockCount), 'Needs Attention', 'Attention Required'],
    ]

    autoTable(doc, {
      startY: 53,
      head: [kpiData[0]],
      body: kpiData.slice(1),
      theme: 'grid',
      headStyles: { fillStyle: 'F', fillColor: [13, 27, 42], textColor: [255, 255, 255] },
    })

    // Inventory & Stock Table
    const finalY = (doc).lastAutoTable.finalY || 100
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('2. Critical Inventory & Stock Status', 14, finalY + 15)

    const prodTable = liveProducts.map(p => [
      p.name,
      p.category,
      `₹${p.price}`,
      `${p.stock} units`,
      `${p.minStock} units`,
      p.status
    ])

    autoTable(doc, {
      startY: finalY + 20,
      head: [['Product Name', 'Category', 'Price', 'Current Stock', 'Min Threshold', 'Status']],
      body: prodTable,
      theme: 'striped',
      headStyles: { fillColor: [79, 140, 255] },
    })

    // AI Recommendations Section
    if (includeAi) {
      const finalY2 = (doc).lastAutoTable.finalY || 180
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('3. AIRA AI Business Recommendations', 14, finalY2 + 15)

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text('• Fortune Sunflower Oil: Critical stock (4 left). Order 40 units immediately.', 14, finalY2 + 25)
      doc.text('• Parle-G Biscuits: Demand velocity ↑ 31%. Increase shelf display near checkout.', 14, finalY2 + 32)
      doc.text('• Dove Shampoo: Overstocked (unsold 24 days). Create bundle offer with bathing bar.', 14, finalY2 + 39)
    }

    // Save File
    doc.save(`AIRA_${storeInfo.name.replace(/\s+/g, '_')}_Report.pdf`)
  }

  const exportCSV = () => {
    let csv = 'Product Name,Category,Price,Current Stock,Status\n'
    liveProducts.forEach(p => {
      csv += `"${p.name}","${p.category}",${p.price},${p.stock},"${p.status}"\n`
    })
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `AIRA_Inventory_Export.csv`
    a.click()
  }

  return (
    <div className="space-y-6 animate-fade-in pb-24 dashboard-workspace-bg">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Report Center & PDF Generation</h1>
          <p className="text-xs text-slate-500">Generate executive consulting business reports, PDF exports, and raw CSV/Excel datasets.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <button onClick={exportCSV} className="flex-1 sm:flex-initial btn-secondary-dark px-3.5 sm:px-4 py-2.5 text-xs font-semibold flex items-center justify-center space-x-2 text-center">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="truncate">Export CSV</span>
          </button>
          <button onClick={generatePDF} className="flex-1 sm:flex-initial aira-gradient-btn px-4 sm:px-5 py-2.5 text-xs font-bold flex items-center justify-center space-x-2 text-center">
            <Download className="w-4 h-4 shrink-0" />
            <span className="truncate">Generate PDF</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Custom Report Builder Panel */}
        <div className="lg:col-span-5 p-4 sm:p-6 rounded-2xl card-light space-y-4">
          <h3 className="text-base font-bold text-slate-900">Custom Report Generator</h3>
          
          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Report Type</label>
              <select value={reportType} onChange={(e) => setReportType(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                <option>Executive Store Performance</option>
                <option>Daily / Weekly Sales Report</option>
                <option>Inventory & Low Stock Report</option>
                <option>AI Demand Forecast Report</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Date Range</label>
              <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                <option>October 2026 (Current Month)</option>
                <option>Last 30 Days</option>
                <option>Q3 2026 Summary</option>
              </select>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" checked={includeForecast} onChange={(e) => setIncludeForecast(e.target.checked)} className="accent-blue-600" />
                <span className="text-slate-700 font-medium">Include AI Demand Forecast</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" checked={includeAi} onChange={(e) => setIncludeAi(e.target.checked)} className="accent-blue-600" />
                <span className="text-slate-700 font-medium">Include AIRA Business Recommendations</span>
              </label>
            </div>
          </div>

          <button onClick={generatePDF} className="w-full py-3 aira-gradient-btn text-xs font-bold flex items-center justify-center space-x-2 shadow-md">
            <Download className="w-4 h-4" />
            <span>Download Formatted PDF</span>
          </button>
        </div>

        {/* Report Preview Document */}
        <div className="lg:col-span-7 p-4 sm:p-8 rounded-2xl bg-white border border-slate-300 shadow-xl space-y-4 sm:space-y-6 text-slate-900 font-sans">
          <div className="flex justify-between items-start border-b border-slate-200 pb-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-blue-600">AIRA EXECUTIVE REPORT PREVIEW</span>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">{storeInfo.name}</h2>
              <p className="text-xs text-slate-500">{reportType} • {dateRange}</p>
            </div>
            <img src="/logo.png" alt="AIRA Logo" className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-cover shrink-0" />
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-sm text-slate-900">1. Executive Summary & KPIs</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 text-center text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-400">TODAY SALES</span>
                <div className="font-bold text-slate-900 text-sm">{(liveKpis.todaysSales || kpiMetrics.todaysSales)}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-400">TOTAL REVENUE</span>
                <div className="font-bold text-slate-900 text-sm">{(liveKpis.revenue || kpiMetrics.revenue)}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-400">LOW STOCK</span>
                <div className="font-bold text-rose-600 text-sm">{(liveKpis.lowStockCount || kpiMetrics.lowStockCount)} Items</div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-sm text-slate-900">2. Critical Inventory Status</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200">
                <thead className="bg-slate-100 font-mono text-[10px]">
                  <tr>
                    <th className="p-2 border">Product</th>
                    <th className="p-2 border">Stock</th>
                    <th className="p-2 border">Min</th>
                    <th className="p-2 border">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {products.slice(0, 4).map(p => (
                    <tr key={p.id}>
                      <td className="p-2 font-medium border">{p.name}</td>
                      <td className="p-2 border">{p.stock}</td>
                      <td className="p-2 border">{p.minStock}</td>
                      <td className="p-2 border font-bold text-xs" style={{ color: p.status === 'Critical' ? '#ef4444' : '#22c55e' }}>{p.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
