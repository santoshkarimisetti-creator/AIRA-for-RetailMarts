import { fetchDashboardStats, fetchSalesAnalytics, fetchProducts, sellProduct, createProduct } from '../services/api'
import React, { useState, useEffect } from 'react'
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { 
  TrendingUp, 
  Package, 
  AlertTriangle, 
  IndianRupee, 
  ArrowUpRight, 
  ArrowDownRight, 
  Sparkles, 
  ShoppingCart, 
  BarChart3, 
  RefreshCw, 
  Calendar,
  Filter,
  CheckCircle2,
  Users,
  DollarSign,
  Boxes,
  Eye,
  ChevronRight,
  Maximize2,
  Plus,
  Upload,
  Barcode,
  Scan,
  Search,
  X,
  Tag,
  Receipt,
  Check,
  Minus,
  Camera,
  CameraOff,
  Zap,
  Award
} from 'lucide-react'
import { storeInfo as defaultStoreInfo, kpiMetrics as defaultKpiMetrics, salesOverviewChart, categoryPerformance, aiInsights as defaultAiInsights, products as defaultProducts, storeHealthDepartments } from '../utils/demoData'
import { getUserKpis, getActiveStoreInfo, getUserProducts, isDemoUser, addProductToUserStore, saveUserProducts } from '../utils/userStore'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid } from 'recharts'
import IsometricStore3D from '../components/three/IsometricStore3D'
import { Link } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'

export default function Dashboard() {
  const { t } = useLanguage()
  const [selectedDept, setSelectedDept] = useState(null)
  const [salesView, setSalesView] = useState('daily')
  const [productList, setProductList] = useState(() => getUserProducts())

  // Live PostgreSQL States
  const [liveKpis, setLiveKpis] = useState(null)
  const [liveChart, setLiveChart] = useState(null)
  const [liveCategories, setLiveCategories] = useState(null)

  useEffect(() => {
    fetchDashboardStats().then(s => setLiveKpis(s)).catch(() => {})
    fetchSalesAnalytics().then(a => {
      if (a && a.dailyChart) setLiveChart(a.dailyChart)
      if (a && a.categoryPerformance) setLiveCategories(a.categoryPerformance)
    }).catch(() => {})
    fetchProducts().then(p => {
      if (p && p.length > 0) setProductList(p)
    }).catch(() => {})
  }, [])


  // Modal States
  const [showAddModal, setShowAddModal] = useState(false)
  const [showSellModal, setShowSellModal] = useState(false)
  const [isAddScanCameraActive, setIsAddScanCameraActive] = useState(false)
  const [isSellScanCameraActive, setIsSellScanCameraActive] = useState(false)
  const [toastMessage, setToastMessage] = useState(null)

  // Add Product Form State
  const [newProd, setNewProd] = useState({
    name: '',
    sku: '', // Barcode or Item Number
    category: 'Grocery',
    price: '',
    costPrice: '',
    stock: '',
    minStock: '10'
  })

  // Sell Product Form State
  const [sellQuery, setSellQuery] = useState('')
  const [selectedSellProduct, setSelectedSellProduct] = useState(null)
  const [sellQty, setSellQty] = useState(1)

  const activeStore = getActiveStoreInfo()
  const activeKpis = getUserKpis()
  const isDemo = isDemoUser()

  const triggerToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage(null)
    }, 4000)
  }

  // Web Audio API Supermarket Beep Sound
  const playSupermarketBeep = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(1850, ctx.currentTime)
      gain.gain.setValueAtTime(0.2, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.12)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.12)
    } catch (e) {
      console.log('Beep sound fallback:', e)
    }
  }

  // Camera Barcode Scanner for Add Product Modal
  useEffect(() => {
    let scanner = null
    if (isAddScanCameraActive && showAddModal) {
      const timer = setTimeout(() => {
        try {
          const formatsToSupport = [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.ITF,
            Html5QrcodeSupportedFormats.QR_CODE
          ]

          scanner = new Html5QrcodeScanner(
            'add-prod-camera-reader',
            { 
              fps: 20, 
              qrbox: { width: 280, height: 160 },
              aspectRatio: 1.777778,
              formatsToSupport: formatsToSupport,
              experimentalFeatures: {
                useBarCodeDetectorIfSupported: true
              }
            },
            false
          )

          scanner.render(
            (decodedText) => {
              playSupermarketBeep()
              setNewProd(prev => ({ ...prev, sku: decodedText }))
              setIsAddScanCameraActive(false)
              triggerToast(`📷 Barcode Scanned Successfully: ${decodedText}`)
            },
            (errorMessage) => {
              // Ignore frames with no barcode
            }
          )
        } catch (err) {
          console.error('Failed to start add-product camera scanner:', err)
        }
      }, 200)

      return () => {
        clearTimeout(timer)
        if (scanner) {
          scanner.clear().catch(e => console.error('Clear scanner error:', e))
        }
      }
    }
  }, [isAddScanCameraActive, showAddModal])

  // Camera Barcode Scanner for Sell Product Modal
  useEffect(() => {
    let scanner = null
    if (isSellScanCameraActive && showSellModal) {
      const timer = setTimeout(() => {
        try {
          const formatsToSupport = [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.ITF,
            Html5QrcodeSupportedFormats.QR_CODE
          ]

          scanner = new Html5QrcodeScanner(
            'sell-prod-camera-reader',
            { 
              fps: 20, 
              qrbox: { width: 280, height: 160 },
              aspectRatio: 1.777778,
              formatsToSupport: formatsToSupport,
              experimentalFeatures: {
                useBarCodeDetectorIfSupported: true
              }
            },
            false
          )

          scanner.render(
            (decodedText) => {
              playSupermarketBeep()
              setSellQuery(decodedText)
              const matched = productList.find(p => p.sku && p.sku.toLowerCase() === decodedText.trim().toLowerCase())
              if (matched) {
                setSelectedSellProduct(matched)
                triggerToast(`📷 Scanned: ${matched.name} (₹${matched.price})`)
              } else {
                triggerToast(`🔍 Scanned Barcode: ${decodedText}`)
              }
              setIsSellScanCameraActive(false)
            },
            (errorMessage) => {
              // Ignore frames with no barcode
            }
          )
        } catch (err) {
          console.error('Failed to start sell-product camera scanner:', err)
        }
      }, 200)

      return () => {
        clearTimeout(timer)
        if (scanner) {
          scanner.clear().catch(e => console.error('Clear scanner error:', e))
        }
      }
    }
  }, [isSellScanCameraActive, showSellModal, productList])

  // Generate Unique 13-Digit EAN Barcode Number
  const generateRandomBarcode = () => {
    const randomEan = `890${Math.floor(100000003 + Math.random() * 899999999)}`
    setNewProd(prev => ({ ...prev, sku: randomEan }))
    triggerToast(`⚡ Generated Unique EAN-13 Barcode: ${randomEan}`)
  }

  // Handle Add Product Submit
  const handleAddProductSubmit = (e) => {
    e.preventDefault()
    if (!newProd.name.trim() || !newProd.price) {
      alert('Please fill in product name and selling price.')
      return
    }

    const skuCode = newProd.sku.trim() || `890${Math.floor(100000003 + Math.random() * 899999999)}`
    const priceVal = parseFloat(newProd.price) || 0
    const costVal = parseFloat(newProd.costPrice) || priceVal * 0.75
    const stockVal = parseInt(newProd.stock, 10) || 50
    const minStockVal = parseInt(newProd.minStock, 10) || 10

    const productObj = {
      id: Date.now(),
      name: newProd.name.trim(),
      sku: skuCode,
      category: newProd.category,
      price: priceVal,
      costPrice: costVal,
      unitProfit: priceVal - costVal,
      margin: priceVal > 0 ? (((priceVal - costVal) / priceVal) * 100).toFixed(1) : 0,
      stock: stockVal,
      minStock: minStockVal,
      unitsSold: 0,
      revenue: 0,
      totalProfit: 0,
      status: stockVal <= minStockVal ? 'Low Stock' : 'Healthy',
      salesVelocity: 'Medium',
      image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&h=200&fit=crop',
      primaryAdviceType: 'restock',
      adviceTitle: 'AIRA Initial Tracking',
      adviceText: `Product added with Barcode/Number ${skuCode}. Tracking initial sales velocity.`,
      confidence: 95
    }

    const updated = addProductToUserStore(productObj)
    setProductList(updated)
    setShowAddModal(false)
    setIsAddScanCameraActive(false)
    setNewProd({
      name: '',
      sku: '',
      category: 'Grocery',
      price: '',
      costPrice: '',
      stock: '',
      minStock: '10'
    })
    triggerToast(`✅ Product "${productObj.name}" (Barcode/No: ${skuCode}) saved!`)
  }

  // Handle Product Search for Selling
  const searchResults = sellQuery.trim() === '' ? [] : productList.filter(p => 
    (p.sku && p.sku.toLowerCase().includes(sellQuery.toLowerCase())) ||
    (p.name && p.name.toLowerCase().includes(sellQuery.toLowerCase())) ||
    (p.id && String(p.id).includes(sellQuery))
  )

  // Handle Complete Sale
  const handleCompleteSale = async () => {
    if (!selectedSellProduct) return

    const qty = parseInt(sellQty, 10) || 1
    if (selectedSellProduct.stock < qty) {
      alert(`Only ${selectedSellProduct.stock} units available in stock.`)
      return
    }

    const totalAmount = selectedSellProduct.price * qty

    try {
      await sellProduct(selectedSellProduct.id, qty)
      const refreshedStats = await fetchDashboardStats()
      if (refreshedStats) setLiveKpis(refreshedStats)
    } catch (err) {
      console.warn('[Dashboard] Sell API error, using local fallback:', err)
    }

    // Update Product Stock & Sales Record
    const updatedList = productList.map(p => {
      if (p.id === selectedSellProduct.id) {
        const newStock = Math.max(0, (p.stock || 0) - qty)
        const newSold = (p.unitsSold || 0) + qty
        const newRev = (p.revenue || 0) + totalAmount
        const unitProf = p.unitProfit || (p.price - (p.costPrice || p.price * 0.75))
        const newProf = (p.totalProfit || 0) + (unitProf * qty)
        return {
          ...p,
          stock: newStock,
          unitsSold: newSold,
          revenue: newRev,
          totalProfit: newProf,
          status: newStock <= (p.minStock || 10) ? 'Low Stock' : 'Healthy'
        }
      }
      return p
    })

    saveUserProducts(updatedList)
    setProductList(updatedList)
    setShowSellModal(false)
    setIsSellScanCameraActive(false)
    setSelectedSellProduct(null)
    setSellQuery('')
    setSellQty(1)

    triggerToast(`🎉 Sale Completed! Sold ${qty}x ${selectedSellProduct.name} for ₹${totalAmount.toLocaleString('en-IN')}`)
  }

  const kpis = [
    { key: 'kpi.todaysSales', name: "Today's Sales", value: liveKpis?.todaysSales ?? "₹0.00", change: liveKpis?.salesChange ?? "No sales recorded yet", trend: liveKpis?.salesTrend ?? "up", icon: IndianRupee, color: "text-blue-600 bg-blue-50" },
    { key: 'kpi.orders', name: "Orders", value: liveKpis?.orders ?? activeKpis.orders, change: liveKpis?.ordersChange ?? "All-time orders logged", trend: "up", icon: ShoppingCart, color: "text-purple-600 bg-purple-50" },
    { key: 'kpi.productsSold', name: "Products Sold", value: liveKpis?.productsSold ?? activeKpis.productsSold, change: liveKpis?.productsSoldChange ?? "All-time units sold", trend: "up", icon: Package, color: "text-amber-600 bg-amber-50" },
    { key: 'kpi.revenue', name: "Revenue", value: liveKpis?.revenue ?? activeKpis.revenue, change: liveKpis?.revenueChange ?? "Store cumulative revenue", trend: "up", icon: TrendingUp, color: "text-emerald-600 bg-emerald-50" },
    { key: 'kpi.profit', name: "Profit", value: liveKpis?.profit ?? activeKpis.profit, change: liveKpis?.profitChange ?? "Store cumulative profit", trend: "up", icon: DollarSign, color: "text-emerald-600 bg-emerald-50" },
    { key: 'kpi.stockValue', name: "Stock Value", value: liveKpis?.stockValue ?? activeKpis.stockValue, change: liveKpis?.stockValueChange ?? "Warehouse stock asset value", trend: "up", icon: Boxes, color: "text-indigo-600 bg-indigo-50" },
    { key: 'kpi.lowStock', name: "Low Stock Items", value: liveKpis?.lowStockCount ?? activeKpis.lowStockCount, change: liveKpis?.lowStockChange ?? `${liveKpis?.lowStockCount || 0} items need restock`, trend: "down", icon: AlertTriangle, color: "text-rose-600 bg-rose-50", alert: true },
    { key: 'kpi.avgMargin', name: "Store Margin", value: liveKpis?.avgMargin ?? "21.7%", change: liveKpis?.avgMarginChange ?? "Storewide average margin", trend: "up", icon: Award, color: "text-cyan-600 bg-cyan-50" },
  ]

  // Top Selling Products Array
  const topSellingProducts = isDemo ? [
    { rank: 1, name: "Parle-G Biscuits", category: "Grocery", sold: "1,240 units", revenue: "₹24,800", change: "+32%", image: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=150&q=80" },
    { rank: 2, name: "Amul Milk", category: "Dairy", sold: "980 units", revenue: "₹22,540", change: "+18%", image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=150&q=80" },
    { rank: 3, name: "Coca-Cola / Thums Up", category: "Beverages", sold: "860 units", revenue: "₹34,400", change: "+12%", image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=150&q=80" },
    { rank: 4, name: "Surf Excel Matic", category: "Home Care", sold: "720 units", revenue: "₹28,800", change: "+10%", image: "https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?auto=format&fit=crop&w=150&q=80" },
  ] : productList.slice(0, 5).map((p, idx) => ({
    rank: idx + 1,
    name: p.name,
    category: p.category,
    sold: `${p.unitsSold || 0} units sold`,
    revenue: `₹${(p.revenue || (p.unitsSold || 0) * p.price || 0).toLocaleString('en-IN')}`,
    change: p.unitsSold > 0 ? '+100%' : 'Stock: ' + p.stock,
    image: p.image || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=150&q=80"
  }))

  // Dynamic AIRA Insights
  const dynamicInsights = isDemo ? defaultAiInsights : (
    productList.length === 0 ? [
      {
        id: 101,
        title: "Welcome to AIRA Retail OS 👋",
        type: "opportunity",
        message: "Add your first store product or scan a barcode to activate AIRA neural stock tracking.",
        actionText: "Add First Product",
        priority: "Getting Started"
      }
    ] : productList.map((p, idx) => ({
      id: p.id || idx,
      title: p.stock <= p.minStock ? `Low Stock Alert: ${p.name}` : `Initial Tracking: ${p.name}`,
      type: p.stock <= p.minStock ? 'critical' : 'opportunity',
      message: p.stock <= p.minStock 
        ? `Stock level for ${p.name} (${p.stock} left) is below threshold (${p.minStock}). Restock recommended.`
        : `AIRA neural engine is actively monitoring sales velocity and inventory for ${p.name} (${p.stock} in stock).`,
      actionText: "Log Sale / Restock",
      priority: p.stock <= p.minStock ? "High Priority" : "Active Monitor"
    }))
  )

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
    } else {
      if (document.exitFullscreen) document.exitFullscreen()
    }
  }

  return (
    <div className="space-y-6 animate-fade-in pb-24 dashboard-workspace-bg max-w-7xl mx-auto relative">
      
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 p-4 rounded-xl bg-slate-900 text-white border border-emerald-500/50 shadow-2xl flex items-center space-x-3 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Spacious Header Banner */}
      {/* Spacious Header Banner */}
      <div className="p-4 sm:p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex flex-wrap items-center gap-2">
            <span>Good morning, {activeStore.owner} 👋</span>
            {!isDemo && <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-mono font-bold">Live Registered Store</span>}
            {isDemo && <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-100 text-cyan-800 font-mono font-bold">Demo Account</span>}
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">Here's what is happening in {activeStore.name} today.</p>
        </div>

        {/* Date Selector & Supermarket POS Counter Button */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Link 
            to="/app/pos" 
            className="aira-gradient-btn px-3.5 sm:px-4 py-2 text-xs font-bold shadow-md flex items-center space-x-2"
          >
            <Barcode className="w-4 h-4" />
            <span>{t('btn.quickBill', 'Open Full POS Counter')}</span>
          </Link>

          <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-[11px] sm:text-xs">Oct 1, 2026 - Oct 7, 2026</span>
          </div>

          <button 
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:text-blue-600 transition-colors hidden sm:block"
            title="Expand Workspace Fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 🚀 FIRST PAGE HOME HERO: 2 PRIMARY OPTIONS CARDS */}
      <div className="p-4 sm:p-6 rounded-3xl bg-slate-900 text-white shadow-xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-1">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-cyan-400 shrink-0" />
            <h2 className="text-base font-bold tracking-tight text-slate-100">Primary Store Operations</h2>
          </div>
          <span className="text-[11px] sm:text-xs text-slate-400 font-medium">Select an operation below to proceed</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* OPTION 1: ADD PRODUCT CARD */}
          <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-blue-900/90 via-slate-900 to-indigo-950 border border-blue-500/40 hover:border-blue-400 shadow-xl transition-all flex flex-col justify-between space-y-4 sm:space-y-5">
            <div className="flex items-start justify-between">
              <div className="p-3 rounded-2xl bg-blue-500/20 text-cyan-300 border border-blue-400/30">
                <Plus className="w-6 h-6 sm:w-8 sm:h-8" />
              </div>
              <span className="px-3 py-1 rounded-full bg-blue-500/20 text-cyan-300 text-xs font-mono font-bold border border-blue-400/30">
                Option 1
              </span>
            </div>

            <div>
              <h3 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center space-x-2">
                <span>1. {t('btn.addProduct', 'Add Product')}</span>
              </h3>
              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                Scan physical barcodes directly with your camera or enter Product Name, Barcode SKU, Category, Selling Price & Stock quantity.
              </p>
            </div>

            <button
              onClick={() => {
                setShowAddModal(true)
                setIsAddScanCameraActive(false)
              }}
              className="w-full py-3 sm:py-3.5 px-4 sm:px-5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-lg flex items-center justify-center space-x-2"
            >
              <Camera className="w-4 h-4 stroke-[3]" />
              <span>{t('btn.addProduct', 'Add Product')} & {t('btn.scanBarcode', 'Scan Barcode')}</span>
            </button>
          </div>

          {/* OPTION 2: SELL PRODUCT USING BARCODE OR NUMBER CARD */}
          <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-emerald-950/90 via-slate-900 to-teal-950 border border-emerald-500/40 hover:border-emerald-400 shadow-xl transition-all flex flex-col justify-between space-y-4 sm:space-y-5">
            <div className="flex items-start justify-between">
              <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                <Barcode className="w-6 h-6 sm:w-8 sm:h-8" />
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold border border-emerald-400/30">
                Option 2
              </span>
            </div>

            <div>
              <h3 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center space-x-2">
                <span>2. {t('btn.sell', 'Sell Item')}</span>
              </h3>
              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                Scan product barcodes with live camera or enter item number / SKU code to look up prices, check stock levels, and complete instant retail sales.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <button
                onClick={() => {
                  setShowSellModal(true)
                  setIsSellScanCameraActive(false)
                }}
                className="flex-1 py-3 sm:py-3.5 px-4 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-lg flex items-center justify-center space-x-2"
              >
                <Scan className="w-4 h-4 stroke-[3]" />
                <span>{t('btn.sell', 'Sell Item')} & {t('btn.scanBarcode', 'Scan')}</span>
              </button>

              <Link
                to="/app/pos"
                className="py-3 sm:py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold text-xs border border-emerald-500/30 transition-all flex items-center justify-center space-x-1.5"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>{t('btn.quickBill', 'Full POS')}</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: ADD PRODUCT MODAL WITH CAMERA BARCODE SCANNER */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
          <div className="bg-slate-900 text-white rounded-3xl border border-blue-500/40 shadow-2xl max-w-lg w-full p-6 space-y-5 relative my-8">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-blue-500/20 text-cyan-400">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight text-white">Add Product</h3>
                  <p className="text-[11px] text-cyan-300 font-medium">Scan barcode label or type product details</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowAddModal(false)
                  setIsAddScanCameraActive(false)
                }}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Live Camera Scanner Viewport if Camera Active */}
            {isAddScanCameraActive ? (
              <div className="p-4 rounded-2xl bg-slate-950 border border-cyan-500/50 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-cyan-300 flex items-center space-x-1.5">
                    <Scan className="w-4 h-4 text-cyan-400 animate-pulse" />
                    <span>Point Camera at Product Barcode (EAN-13, EAN-8, Code128, QR)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAddScanCameraActive(false)}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 text-xs font-bold border border-rose-500/30 flex items-center space-x-1"
                  >
                    <CameraOff className="w-3.5 h-3.5" />
                    <span>Close Camera</span>
                  </button>
                </div>

                <div className="overflow-hidden rounded-xl bg-slate-900 border border-slate-700 min-h-[200px] relative">
                  <div id="add-prod-camera-reader" className="w-full h-full"></div>
                </div>
              </div>
            ) : null}

            <form onSubmit={handleAddProductSubmit} className="space-y-4">
              {/* Product Name */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Product Name <span className="text-rose-400">*</span>
                </label>
                <input 
                  type="text"
                  value={newProd.name}
                  onChange={(e) => setNewProd(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. India Gate Basmati Rice 5kg"
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
                  required
                />
              </div>

              {/* Barcode / SKU field with Live Camera Scan & Auto-Gen Buttons */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-slate-300">
                    Barcode / Item Number (SKU)
                  </label>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setIsAddScanCameraActive(!isAddScanCameraActive)}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all flex items-center space-x-1.5 ${
                        isAddScanCameraActive
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30'
                      }`}
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>{isAddScanCameraActive ? 'Stop Scanner' : 'Scan Barcode'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={generateRandomBarcode}
                      className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 flex items-center space-x-1"
                      title="Auto-Generate Unique EAN Barcode"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Auto-Gen</span>
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <input 
                    type="text"
                    value={newProd.sku}
                    onChange={(e) => setNewProd(prev => ({ ...prev, sku: e.target.value }))}
                    placeholder="Scan camera barcode or enter e.g. 8901234567890"
                    className="w-full p-3 pl-10 rounded-xl bg-slate-950 border border-slate-700 text-cyan-300 font-mono text-xs focus:outline-none focus:border-cyan-400"
                  />
                  <Barcode className="w-4 h-4 text-cyan-400 absolute left-3.5 top-3.5" />
                </div>
              </div>

              {/* Category & Stock */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Category</label>
                  <select
                    value={newProd.category}
                    onChange={(e) => setNewProd(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-400"
                  >
                    <option value="Grocery">Grocery</option>
                    <option value="Dairy">Dairy</option>
                    <option value="Beverages">Beverages</option>
                    <option value="Snacks">Snacks</option>
                    <option value="Personal Care">Personal Care</option>
                    <option value="Home Care">Home Care</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Initial Stock</label>
                  <input 
                    type="number"
                    value={newProd.stock}
                    onChange={(e) => setNewProd(prev => ({ ...prev, stock: e.target.value }))}
                    placeholder="50"
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Prices */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Selling Price (₹) <span className="text-rose-400">*</span>
                  </label>
                  <input 
                    type="number"
                    step="0.01"
                    value={newProd.price}
                    onChange={(e) => setNewProd(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="145.00"
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-emerald-400 font-bold text-xs focus:outline-none focus:border-cyan-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Cost Price (₹)</label>
                  <input 
                    type="number"
                    step="0.01"
                    value={newProd.costPrice}
                    onChange={(e) => setNewProd(prev => ({ ...prev, costPrice: e.target.value }))}
                    placeholder="110.00"
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-slate-300 text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    setIsAddScanCameraActive(false)
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 text-xs font-black hover:brightness-110 shadow-lg flex items-center space-x-1.5"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Save Product</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SELL PRODUCT MODAL (WITH CAMERA BARCODE SCANNER) */}
      {showSellModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
          <div className="bg-slate-900 text-white rounded-3xl border border-emerald-500/40 shadow-2xl max-w-lg w-full p-6 space-y-5 relative my-8">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <Barcode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight text-white">Sell Product</h3>
                  <p className="text-[11px] text-emerald-300 font-medium">Scan barcode with camera or type product number</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowSellModal(false)
                  setIsSellScanCameraActive(false)
                  setSelectedSellProduct(null)
                  setSellQuery('')
                }}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Live Camera Scanner Viewport for Sell Product */}
            {isSellScanCameraActive ? (
              <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/50 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-emerald-300 flex items-center space-x-1.5">
                    <Scan className="w-4 h-4 text-emerald-400 animate-pulse" />
                    <span>Point Camera at Product Barcode (EAN-13, EAN-8, Code128, QR)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsSellScanCameraActive(false)}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 text-xs font-bold border border-rose-500/30 flex items-center space-x-1"
                  >
                    <CameraOff className="w-3.5 h-3.5" />
                    <span>Close Camera</span>
                  </button>
                </div>

                <div className="overflow-hidden rounded-xl bg-slate-900 border border-slate-700 min-h-[200px] relative">
                  <div id="sell-prod-camera-reader" className="w-full h-full"></div>
                </div>
              </div>
            ) : null}

            {/* Barcode Search Input & Camera Toggle */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-bold text-slate-300">
                  Scan Barcode or Type Product Number / Name
                </label>
                <button
                  type="button"
                  onClick={() => setIsSellScanCameraActive(!isSellScanCameraActive)}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all flex items-center space-x-1.5 ${
                    isSellScanCameraActive
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{isSellScanCameraActive ? 'Stop Camera' : 'Camera Scan'}</span>
                </button>
              </div>

              <div className="relative">
                <input 
                  type="text"
                  autoFocus
                  value={sellQuery}
                  onChange={(e) => {
                    setSellQuery(e.target.value)
                    // Auto select exact match if SKU/Barcode matches
                    const exact = productList.find(p => p.sku && p.sku.toLowerCase() === e.target.value.trim().toLowerCase())
                    if (exact) setSelectedSellProduct(exact)
                  }}
                  placeholder="Scan barcode with camera or type item number..."
                  className="w-full p-3.5 pl-10 rounded-xl bg-slate-950 border border-emerald-500/50 text-emerald-300 font-mono text-xs focus:outline-none focus:border-emerald-400"
                />
                <Scan className="w-4 h-4 text-emerald-400 absolute left-3.5 top-4" />
              </div>
            </div>

            {/* Product Search Results Dropdown / List */}
            {searchResults.length > 0 && !selectedSellProduct && (
              <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-700 bg-slate-950 divide-y divide-slate-800">
                {searchResults.map(prod => (
                  <div
                    key={prod.id}
                    onClick={() => {
                      setSelectedSellProduct(prod)
                      setSellQuery(prod.name)
                    }}
                    className="p-3 hover:bg-slate-800 cursor-pointer flex justify-between items-center transition-colors"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-white">{prod.name}</h4>
                      <span className="text-[10px] text-emerald-400 font-mono">Barcode: {prod.sku || 'N/A'}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-emerald-400">₹{prod.price}</span>
                      <span className="text-[10px] text-slate-400 block">Stock: {prod.stock}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Selected Product Checkout Details */}
            {selectedSellProduct && (
              <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/40 space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white">{selectedSellProduct.name}</h4>
                    <span className="text-xs text-emerald-400 font-mono">Barcode: {selectedSellProduct.sku}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-black text-emerald-400">₹{selectedSellProduct.price}</span>
                    <span className="text-[10px] text-slate-400 block">Stock: {selectedSellProduct.stock} left</span>
                  </div>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center justify-between border-t border-slate-800 pt-3">
                  <span className="text-xs font-bold text-slate-300">Sell Quantity:</span>
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() => setSellQty(Math.max(1, sellQty - 1))}
                      className="p-2 rounded-xl bg-slate-800 text-white hover:bg-slate-700"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-base font-bold text-white px-2">{sellQty}</span>
                    <button
                      type="button"
                      onClick={() => setSellQty(Math.min(selectedSellProduct.stock, sellQty + 1))}
                      className="p-2 rounded-xl bg-slate-800 text-white hover:bg-slate-700"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center text-sm font-bold pt-2 border-t border-slate-800">
                  <span className="text-slate-300">Total Amount:</span>
                  <span className="text-lg font-black text-emerald-400">
                    ₹{(selectedSellProduct.price * sellQty).toLocaleString('en-IN')}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleCompleteSale}
                  className="w-full py-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-lg flex items-center justify-center space-x-2"
                >
                  <Receipt className="w-4 h-4" />
                  <span>Complete Sale & Log Transaction</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 8 KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="p-3.5 sm:p-5 rounded-2xl card-light-interactive flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2 sm:mb-3">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-500 truncate mr-1">{t(kpi.key, kpi.name)}</span>
              <div className={`p-1.5 sm:p-2.5 rounded-xl icon-3d ${kpi.color} shrink-0`}>
                <kpi.icon className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </div>
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900">{kpi.value}</h3>
              <div className={`flex flex-wrap items-center text-[10px] sm:text-[11px] font-semibold mt-1 ${kpi.trend === 'up' ? 'text-emerald-600' : 'text-rose-600'}`}>
                <span className="flex items-center">
                  {kpi.trend === 'up' ? <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> : <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />}
                  <span>{kpi.change}</span>
                </span>
                
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 3D Store Health Section */}
      <div className="p-4 sm:p-6 rounded-2xl card-light space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center space-x-2">
              <span>Store Health</span>
              <span className="text-[10px] sm:text-xs text-slate-400 font-normal">Physical-Digital Shelf Mapping</span>
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-[11px] sm:text-xs font-semibold">
            <div className="flex items-center space-x-1.5 text-emerald-600"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /><span>Healthy ({productList.length > 0 ? '100%' : '0%'})</span></div>
            <div className="flex items-center space-x-1.5 text-amber-600"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /><span>Low Stock (0%)</span></div>
            <div className="flex items-center space-x-1.5 text-rose-600"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" /><span>Critical (0%)</span></div>
            <Link to="/app/health" className="text-blue-600 hover:underline flex items-center space-x-0.5 ml-auto sm:ml-0"><span>View Details</span><ChevronRight className="w-3.5 h-3.5" /></Link>
          </div>
        </div>

        {/* 3D Canvas Stage */}
        <div className="h-64 sm:h-80 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 relative">
          <IsometricStore3D onSelectDepartment={(dept) => setSelectedDept(dept)} />
        </div>
      </div>

      {/* Sales Analytics Chart & AIRA Insights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Chart Card */}
        <div className="lg:col-span-8 p-6 rounded-2xl card-light">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Sales Overview</h3>
              <p className="text-xs text-slate-500">Real-time revenue stream across categories</p>
            </div>
            
            <div className="flex items-center space-x-1 p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold">
              <button 
                onClick={() => setSalesView('daily')}
                className={`px-3 py-1.5 rounded-lg transition-all ${salesView === 'daily' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Daily
              </button>
              <button 
                onClick={() => setSalesView('weekly')}
                className={`px-3 py-1.5 rounded-lg transition-all ${salesView === 'weekly' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Weekly
              </button>
              <button 
                onClick={() => setSalesView('monthly')}
                className={`px-3 py-1.5 rounded-lg transition-all ${salesView === 'monthly' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Monthly
              </button>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={liveChart || salesOverviewChart}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f8cff" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4f8cff" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(val) => `₹${val/1000}k`} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#07111f', borderRadius: '12px', borderColor: '#4f8cff', color: '#fff' }}
                  formatter={(val) => [`₹${val}`, 'Revenue']}
                />
                <Area type="monotone" dataKey="sales" stroke="#4f8cff" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Top Selling Products List */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-sm font-bold text-slate-900">Your Store Products</h4>
              <Link to="/app/inventory" className="text-xs text-blue-600 hover:underline font-semibold">View All ({productList.length})</Link>
            </div>

            {topSellingProducts.length === 0 ? (
              <div className="p-6 rounded-xl bg-slate-50 text-center space-y-2 border border-slate-200/80">
                <p className="text-xs font-semibold text-slate-700">No products added yet.</p>
                <button 
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center space-x-1.5 aira-gradient-btn px-4 py-2 text-xs font-bold rounded-xl shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add First Product</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {topSellingProducts.map((item) => (
                  <div key={item.rank} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                    <div className="flex items-center space-x-3 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">
                        {item.rank}
                      </span>
                      <img src={item.image} alt={item.name} className="w-9 h-9 rounded-lg object-cover shrink-0 border border-slate-200" />
                      <div className="min-w-0 flex-1">
                        <h5 className="text-xs font-bold text-slate-900 truncate">{item.name}</h5>
                        <span className="text-[10px] text-slate-500 truncate block">{item.category} • {item.sold}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <span className="text-xs font-bold text-slate-900">{item.revenue}</span>
                      <div className="text-[10px] text-emerald-600 font-semibold">{item.change}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* AIRA Insights Panel */}
        <div className="lg:col-span-4 p-6 rounded-2xl card-light flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <span>AIRA Insights</span>
              </h3>
              <Link to="/app/insights" className="text-xs text-blue-600 font-semibold hover:underline">View All</Link>
            </div>

            <div className="space-y-3">
              {dynamicInsights.map((insight) => (
                <div key={insight.id} className="p-4 rounded-xl border border-slate-200/80 bg-slate-50 hover:bg-white hover:shadow-md transition-all">
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      {insight.type === 'critical' && <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />}
                      {insight.type === 'opportunity' && <TrendingUp className="w-4 h-4 text-blue-500 shrink-0" />}
                      {insight.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />}
                      <h4 className="font-bold text-xs text-slate-900">{insight.title}</h4>
                    </div>
                    <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                      insight.type === 'critical' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {insight.priority}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed my-2">{insight.message}</p>
                  <Link 
                    to="/app/inventory"
                    className="inline-block px-3 py-1.5 rounded-lg aira-gradient-btn text-[11px] font-semibold shadow-sm"
                  >
                    {insight.actionText}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
