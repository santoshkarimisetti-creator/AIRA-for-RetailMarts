import React, { useState, useEffect } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { fetchReportsSummary, fetchDashboardStats } from '../services/api'
import { 
  FileText, 
  Download, 
  FileSpreadsheet, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Package
} from 'lucide-react'

export default function Reports() {
  const [liveProducts, setLiveProducts] = useState([])
  const [liveKpis, setLiveKpis] = useState(null)
  const [reportData, setReportData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  const currentMonthName = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
  const [reportType, setReportType] = useState('Executive Store Performance')
  const [dateRange, setDateRange] = useState(`${currentMonthName} (Current Month)`)
  const [includeForecast, setIncludeForecast] = useState(true)
  const [includeAi, setIncludeAi] = useState(true)

  const loadReportData = async () => {
    setIsLoading(true)
    try {
      const [summaryRes, kpiRes] = await Promise.all([
        fetchReportsSummary(),
        fetchDashboardStats()
      ])

      if (summaryRes) {
        setReportData(summaryRes)
        if (summaryRes.products && summaryRes.products.length > 0) {
          setLiveProducts(summaryRes.products)
        }
      }
      if (kpiRes) {
        setLiveKpis(kpiRes)
      }
    } catch (err) {
      console.error('Failed to load live reports telemetry:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadReportData()
  }, [])

  // Filter products based on selected report type
  const getFilteredProducts = () => {
    if (!liveProducts || liveProducts.length === 0) return []
    if (reportType === 'Inventory & Low Stock Report') {
      return liveProducts.filter(p => (p.stock || 0) <= (p.minStock || 15))
    }
    if (reportType === 'Daily / Weekly Sales Report') {
      return [...liveProducts].sort((a, b) => (b.revenue || 0) - (a.revenue || 0)).slice(0, 25)
    }
    // Executive Store Performance: top products and critical items
    return liveProducts.slice(0, 30)
  }

  const criticalItems = liveProducts.filter(p => (p.stock || 0) <= (p.minStock || 15))

  const generatePDF = () => {
    const doc = new jsPDF()
    const storeName = reportData?.storeName || 'AIRA Retail Mart'
    const generatedDate = reportData?.generatedAt || new Date().toLocaleDateString('en-IN')

    // Title & Header Banner
    doc.setFillColor(7, 17, 31)
    doc.rect(0, 0, 210, 35, 'F')

    doc.setTextColor(0, 217, 255)
    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.text('AIRA RETAIL ANALYTICS', 14, 20)

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`${storeName} • ${reportType}`, 14, 28)
    doc.text(`Generated: ${generatedDate}`, 150, 28)

    // Executive KPI Summary Section
    doc.setTextColor(7, 17, 31)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('1. Executive KPI Summary (PostgreSQL Grounded)', 14, 48)

    const kpiData = [
      ['Metric', 'Store Value', 'Status'],
      ['Today\'s Sales', liveKpis?.todaysSales || '₹0.00', liveKpis?.salesChange || 'Live Telemetry'],
      ['Total Cumulative Revenue', liveKpis?.revenue || `₹${(reportData?.totalRevenue || 0).toLocaleString()}`, 'On Target'],
      ['Total Cumulative Profit', liveKpis?.profit || `₹${(reportData?.totalProfit || 0).toLocaleString()}`, 'Healthy Margin'],
      ['Warehouse Stock Asset Value', liveKpis?.stockValue || `₹${(reportData?.stockValuation || 0).toLocaleString()}`, 'Assets Safe'],
      ['Critical Low-Stock Items', `${criticalItems.length} SKUs`, criticalItems.length > 0 ? 'Action Required' : 'Optimal Buffer'],
      ['Total Catalog Products', `${liveProducts.length} Items`, 'Active Records']
    ]

    autoTable(doc, {
      startY: 53,
      head: [kpiData[0]],
      body: kpiData.slice(1),
      theme: 'grid',
      headStyles: { fillStyle: 'F', fillColor: [7, 17, 31], textColor: [255, 255, 255] },
    })

    // Inventory & Stock Table
    const finalY = (doc).lastAutoTable?.finalY || 110
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(`2. ${reportType === 'Inventory & Low Stock Report' ? 'Critical Stock Attention List' : 'Product Inventory & Performance'}`, 14, finalY + 14)

    const itemsForPdf = getFilteredProducts()
    const prodTable = itemsForPdf.slice(0, 35).map(p => [
      p.name,
      p.category,
      `₹${p.price}`,
      `${p.stock} units`,
      `${p.minStock} units`,
      (p.stock <= p.minStock ? 'Critical' : 'Healthy')
    ])

    autoTable(doc, {
      startY: finalY + 18,
      head: [['Product Name', 'Category', 'Price', 'Current Stock', 'Min Threshold', 'Status']],
      body: prodTable,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235] },
    })

    // Dynamic AI Recommendations Section
    if (includeAi) {
      const finalY2 = (doc).lastAutoTable?.finalY || 180
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('3. AIRA Autonomous Business Recommendations', 14, finalY2 + 14)

      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')

      const recs = reportData?.recommendations && reportData.recommendations.length > 0 
        ? reportData.recommendations 
        : [
            criticalItems[0] ? `Critical Restock: ${criticalItems[0].name} has only ${criticalItems[0].stock} units left. Reorder ${criticalItems[0].reorderRecommendation || 30} units.` : 'All inventory levels maintain safe buffers.',
            'Maintain optimal stock buffers across high-velocity staples like Cooking Oil, Rice, and Milk.',
            'Promote high-margin personal care and packaged items near checkout counter.'
          ]

      recs.forEach((rec, idx) => {
        doc.text(`• ${rec}`, 14, finalY2 + 22 + (idx * 7), { maxWidth: 180 })
      })
    }

    doc.save(`AIRA_${storeName.replace(/\s+/g, '_')}_${reportType.replace(/\s+/g, '_')}.pdf`)
  }

  const exportCSV = () => {
    let csv = 'Product Name,Category,Price,Cost Price,Current Stock,Min Threshold,Units Sold,Revenue,Margin,Status\n'
    liveProducts.forEach(p => {
      csv += `"${p.name}","${p.category}",${p.price},${p.costPrice || 0},${p.stock},${p.minStock},${p.unitsSold || 0},${p.revenue || 0},${p.margin || 0},"${p.stock <= p.minStock ? 'Critical' : 'Healthy'}"\n`
    })
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `AIRA_Store_Inventory_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  return (
    <div className="space-y-6 animate-fade-in pb-24 dashboard-workspace-bg">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <span>Report Center & PDF Generation</span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-blue-100 text-blue-700">
              POSTGRESQL AUDIT
            </span>
          </h1>
          <p className="text-xs text-slate-500">
            Generate executive business reports, formatted PDF documents, and raw CSV exports from live PostgreSQL data.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <button 
            onClick={loadReportData}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shrink-0"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
          </button>

          <button onClick={exportCSV} className="flex-1 sm:flex-initial bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl px-3.5 sm:px-4 py-2.5 text-xs font-semibold flex items-center justify-center space-x-2 shadow-xs transition-colors">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="truncate">Export CSV</span>
          </button>

          <button onClick={generatePDF} className="flex-1 sm:flex-initial aira-gradient-btn px-4 sm:px-5 py-2.5 text-xs font-bold flex items-center justify-center space-x-2 text-center shadow-xs hover:scale-[1.01] transition-transform">
            <Download className="w-4 h-4 shrink-0" />
            <span className="truncate">Download PDF</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Custom Report Builder Panel */}
        <div className="lg:col-span-5 p-4 sm:p-6 rounded-2xl card-light space-y-4">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
            <FileText className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Custom Report Generator</h3>
          </div>
          
          <div className="space-y-3.5 text-xs">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Report Type</label>
              <select 
                value={reportType} 
                onChange={(e) => setReportType(e.target.value)} 
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
              >
                <option>Executive Store Performance</option>
                <option>Inventory & Low Stock Report</option>
                <option>Daily / Weekly Sales Report</option>
                <option>AI Demand Forecast Report</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Date Range</label>
              <select 
                value={dateRange} 
                onChange={(e) => setDateRange(e.target.value)} 
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
              >
                <option>{currentMonthName} (Current Month)</option>
                <option>Last 30 Days (Rolling)</option>
                <option>Q4 Financial Summary</option>
                <option>All-Time Store Inception</option>
              </select>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <label className="flex items-center space-x-2.5 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={includeForecast} 
                  onChange={(e) => setIncludeForecast(e.target.checked)} 
                  className="accent-blue-600 rounded" 
                />
                <span className="text-slate-800 font-medium">Include Reorder Forecast Quantities</span>
              </label>

              <label className="flex items-center space-x-2.5 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={includeAi} 
                  onChange={(e) => setIncludeAi(e.target.checked)} 
                  className="accent-blue-600 rounded" 
                />
                <span className="text-slate-800 font-medium">Include Autonomous AI Recommendations</span>
              </label>
            </div>
          </div>

          <button onClick={generatePDF} className="w-full py-3 aira-gradient-btn text-xs font-bold flex items-center justify-center space-x-2 shadow-md">
            <Download className="w-4 h-4" />
            <span>Generate & Download PDF</span>
          </button>
        </div>

        {/* Report Preview Document */}
        <div className="lg:col-span-7 p-4 sm:p-8 rounded-2xl bg-white border border-slate-300 shadow-xl space-y-5 text-slate-900 font-sans">
          <div className="flex justify-between items-start border-b border-slate-200 pb-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-blue-600 font-bold">
                AIRA EXECUTIVE REPORT PREVIEW
              </span>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                {reportData?.storeName || 'AIRA Retail Mart'}
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {reportType} • {dateRange} • {reportData?.generatedAt || currentMonthName}
              </p>
            </div>
            <img src="/logo.png" alt="AIRA Logo" className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-cover shrink-0 border border-slate-200 shadow-xs" />
          </div>

          {/* Section 1: KPIs */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">1. Executive Summary & KPIs</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-center text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 font-medium block">TODAY SALES</span>
                <div className="font-black text-slate-900 text-sm mt-0.5">
                  {liveKpis?.todaysSales || '₹0.00'}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 font-medium block">STORE REVENUE</span>
                <div className="font-black text-slate-900 text-sm mt-0.5">
                  {liveKpis?.revenue || `₹${(reportData?.totalRevenue || 0).toLocaleString()}`}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 font-medium block">LOW STOCK</span>
                <div className="font-black text-rose-600 text-sm mt-0.5">
                  {criticalItems.length} SKUs
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Critical Inventory Table */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                2. Live Stock Threshold Audit ({criticalItems.length} Critical SKUs)
              </h4>
              <span className="text-[10px] text-slate-400 font-mono">Top priority items</span>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 font-mono text-[10px] text-slate-600">
                  <tr>
                    <th className="p-2.5 border-b">Product Name</th>
                    <th className="p-2.5 border-b">Stock</th>
                    <th className="p-2.5 border-b">Min</th>
                    <th className="p-2.5 border-b">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(criticalItems.length > 0 ? criticalItems.slice(0, 5) : liveProducts.slice(0, 5)).map((p) => {
                    const isCrit = (p.stock || 0) <= (p.minStock || 15)
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/60">
                        <td className="p-2.5 font-medium text-slate-900">{p.name}</td>
                        <td className="p-2.5 font-bold font-mono text-slate-800">{p.stock}</td>
                        <td className="p-2.5 font-mono text-slate-500">{p.minStock}</td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isCrit ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {isCrit ? 'Critical' : 'Healthy'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Autonomous Recommendations */}
          {includeAi && (
            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 space-y-2">
              <div className="flex items-center space-x-1.5 text-blue-900 font-bold text-xs">
                <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Autonomous AI Recommendations</span>
              </div>
              <ul className="space-y-1 text-xs text-slate-700">
                {(reportData?.recommendations || [
                  'Maintain optimal stock buffers across high-velocity staples like Cooking Oil, Rice, and Milk.',
                  'Promote high-margin personal care and packaged items near checkout counter.'
                ]).slice(0, 3).map((rec, idx) => (
                  <li key={idx} className="flex items-start space-x-2">
                    <span className="text-blue-500 font-bold mt-0.5">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
