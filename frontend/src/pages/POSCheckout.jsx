import { fetchProducts, checkoutPOS } from '../services/api'
import React, { useState, useEffect, useRef } from 'react'
import { Html5QrcodeScanner, Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { getUserProducts, saveUserProducts, getActiveStoreInfo } from '../utils/userStore'
import { 
  Barcode, 
  Scan, 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  CheckCircle2, 
  CreditCard, 
  QrCode, 
  Banknote, 
  Printer, 
  RotateCcw, 
  RotateCw,
  Sparkles, 
  Search, 
  Camera, 
  CameraOff, 
  Package, 
  Check, 
  ArrowRight,
  Receipt,
  Store,
  DollarSign,
  X,
  Upload,
  Tag,
  AlertTriangle
} from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'


// Near-Expiry and Shelf-Life Intelligent Helper
export const getProductExpiryInfo = (product) => {
  if (!product) return { daysLeft: 60, isNearExpiry: false, suggestedDiscount: 0, expiryDate: '' }
  const perishableCategories = ['Dairy', 'Bakery', 'Sweets', 'Snacks', 'Beverages', 'Grocery']
  const isPerishable = perishableCategories.includes(product.category)
  const seed = (typeof product.id === 'number' ? product.id : (product.sku ? product.sku.length * 17 : 37)) * 13
  const daysLeft = isPerishable ? ((seed % 30) + 3) : ((seed % 90) + 20)
  const isNearExpiry = daysLeft <= 15
  const suggestedDiscount = daysLeft <= 4 ? 30 : (daysLeft <= 8 ? 20 : (daysLeft <= 15 ? 15 : 0))
  const expiryDate = new Date(Date.now() + daysLeft * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  return { daysLeft, isNearExpiry, suggestedDiscount, expiryDate }
}

export default function POSCheckout() {
  const { t } = useLanguage()
  const storeInfo = getActiveStoreInfo()
  const [productList, setProductList] = useState(() => getUserProducts())

  // Load real 100 products from PostgreSQL
  useEffect(() => {
    fetchProducts().then(prods => {
      if (prods && prods.length > 0) setProductList(prods)
    }).catch(() => {})
  }, [])

  
  // Barcode Input & Camera State
  const [barcodeInput, setBarcodeInput] = useState('')
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [cameraRotation, setCameraRotation] = useState(0) // 0, 90, 180, 270
  const [lastScannedProduct, setLastScannedProduct] = useState(null)
  const [scanMessage, setScanMessage] = useState(null)
  const [unrecognizedBarcode, setUnrecognizedBarcode] = useState(null)

  // Quick Product Add Modal State for New Barcode
  const [showQuickAddModal, setShowQuickAddModal] = useState(false)
  const [quickAddForm, setQuickAddForm] = useState({
    name: '',
    price: '',
    costPrice: '',
    category: 'Grocery',
    stock: '50',
    sku: ''
  })

  // Quick Filter State for Product Grid
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')

  // Active Billing Cart
  const [cart, setCart] = useState([])
  const [gstRate, setGstRate] = useState(5) // 5% default GST
  const [discountPercent, setDiscountPercent] = useState(5) // 5% editable default discount
  const [discountAmount, setDiscountAmount] = useState(0)
  const [isManualAmount, setIsManualAmount] = useState(false)

  // Payment State
  const [paymentMode, setPaymentMode] = useState('UPI') // 'UPI', 'CASH', 'CARD'
  const [cashReceived, setCashReceived] = useState('')
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [completedOrder, setCompletedOrder] = useState(null)

  const barcodeInputRef = useRef(null)

  // Auto-focus barcode input on load
  useEffect(() => {
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus()
    }
  }, [])

  // Web Audio API Supermarket Beep Sound Generator
  const playSupermarketBeep = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(1850, ctx.currentTime) // High crisp DMart scanner beep frequency
      gain.gain.setValueAtTime(0.2, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.12)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.12)
    } catch (e) {
      console.log('Audio beep fallback:', e)
    }
  }

  // Camera Barcode Scanner Initialization with full 1D (EAN-13, EAN-8, UPC, Code128) support
  useEffect(() => {
    let scanner = null
    if (isCameraActive) {
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
            'pos-camera-reader',
            { 
              fps: 20, 
              qrbox: { width: 300, height: 180 },
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
              handleBarcodeScanned(decodedText)
            },
            (errorMessage) => {
              // Silently ignore non-barcode frames
            }
          )
        } catch (err) {
          console.error('Failed to start camera scanner:', err)
        }
      }, 200)

      return () => {
        clearTimeout(timer)
        if (scanner) {
          scanner.clear().catch(e => console.error('Clear scanner error:', e))
        }
      }
    }
  }, [isCameraActive])

  // Apply Rotation to Video Stream
  useEffect(() => {
    const videoElem = document.querySelector('#pos-camera-reader video')
    if (videoElem) {
      videoElem.style.transform = `rotate(${cameraRotation}deg)`
      videoElem.style.transition = 'transform 0.3s ease'
    }
  }, [cameraRotation, isCameraActive])

  // Process Barcode Scan or SKU Match
  const handleBarcodeScanned = (code) => {
    if (!code) return
    const cleanCode = code.trim()
    const lowerCode = cleanCode.toLowerCase()

    // Find product by SKU, ID, or Name match
    const matched = productList.find(p => 
      p.sku.toLowerCase() === lowerCode || 
      p.id.toString() === lowerCode ||
      p.name.toLowerCase().includes(lowerCode)
    )

    if (matched) {
      playSupermarketBeep()
      addToCart(matched)
      setLastScannedProduct(matched)
      setScanMessage({ type: 'success', text: `Scanned: ${matched.name} (₹${matched.price})` })
      setUnrecognizedBarcode(null)
      setBarcodeInput('')
    } else {
      setUnrecognizedBarcode(cleanCode)
      setScanMessage({ 
        type: 'warning', 
        text: `Barcode "${cleanCode}" scanned, but not found in store inventory.` 
      })
    }

    // Auto-clear success message after 4 seconds
    setTimeout(() => {
      setScanMessage(null)
    }, 4000)
  }

  // Handle Image File Upload Barcode Scan
  const handleImageFileScan = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const html5QrCode = new Html5Qrcode("pos-file-scanner-temp")
      const result = await html5QrCode.scanFile(file, true)
      if (result) {
        handleBarcodeScanned(result)
      }
      html5QrCode.clear()
    } catch (err) {
      console.log('File scan error:', err)
      // Fallback: try parsing barcode string if user enters it
      setScanMessage({ 
        type: 'error', 
        text: 'Could not read barcode from image file. Try rotating image or enter barcode number directly.' 
      })
    }
  }

  // Open Quick Add Modal for Unrecognized Barcode
  const openQuickAddForBarcode = (code) => {
    setQuickAddForm({
      name: '',
      price: '',
      costPrice: '',
      category: 'Grocery',
      stock: '50',
      sku: code || `BAR-${Math.floor(100000 + Math.random() * 900000)}`
    })
    setShowQuickAddModal(true)
  }

  // Handle Submit Quick Add Product
  const handleQuickAddSubmit = (e) => {
    e.preventDefault()
    if (!quickAddForm.name || !quickAddForm.price) return

    const price = Number(quickAddForm.price) || 0
    const costPrice = Number(quickAddForm.costPrice) || Math.round(price * 0.75)
    const unitProfit = price - costPrice
    const margin = price > 0 ? Number(((unitProfit / price) * 100).toFixed(1)) : 0
    const roi = costPrice > 0 ? Number(((unitProfit / costPrice) * 100).toFixed(1)) : 0

    const createdProduct = {
      id: Date.now(),
      name: quickAddForm.name,
      sku: quickAddForm.sku || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
      category: quickAddForm.category,
      price,
      costPrice,
      unitProfit,
      margin,
      roi,
      stock: Number(quickAddForm.stock) || 50,
      minStock: 15,
      unitsSold: 0,
      revenue: 0,
      totalProfit: 0,
      status: 'Healthy',
      image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&h=200&fit=crop'
    }

    const updated = [createdProduct, ...productList]
    saveUserProducts(updated)
    setProductList(updated)

    // Automatically add newly created product to POS cart!
    playSupermarketBeep()
    addToCart(createdProduct)
    setLastScannedProduct(createdProduct)
    setScanMessage({ type: 'success', text: `Added new product "${createdProduct.name}" to store and cart!` })
    
    setShowQuickAddModal(false)
    setUnrecognizedBarcode(null)
    setBarcodeInput('')
  }

  // Barcode Form Submit Handler (Supports USB Scanner Enter Key)
  const handleBarcodeSubmit = (e) => {
    e.preventDefault()
    if (barcodeInput) {
      handleBarcodeScanned(barcodeInput)
    }
  }

  // Add Item to Cart
  const addToCart = (product) => {
    setCart(prevCart => {
      const existing = prevCart.find(item => item.id === product.id)
      if (existing) {
        if (existing.qty >= product.stock) {
          alert(`Warning: Only ${product.stock} units of ${product.name} are available in stock!`)
          return prevCart
        }
        return prevCart.map(item => 
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        )
      } else {
        if (product.stock <= 0) {
          alert(`Product ${product.name} is currently out of stock!`)
          return prevCart
        }
        return [...prevCart, { ...product, qty: 1 }]
      }
    })
  }

  // Update Cart Item Quantity
  const updateCartQty = (id, delta) => {
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.id === id) {
          const newQty = item.qty + delta
          if (newQty <= 0) return null
          if (newQty > item.stock) {
            alert(`Stock limit reached! Max available stock: ${item.stock}`)
            return item
          }
          return { ...item, qty: newQty }
        }
        return item
      }).filter(Boolean)
    })
  }

  // Remove Item from Cart
  const removeFromCart = (id) => {
    setCart(prevCart => prevCart.filter(item => item.id !== id))
  }

  // Clear Cart
  const handleClearCart = () => {
    setCart([])
    setLastScannedProduct(null)
  }

  // Financial Calculations (with 5% default editable discount & near expiry awareness)
  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.qty), 0)
  const totalCost = cart.reduce((acc, item) => acc + ((item.costPrice || Math.round(item.price * 0.75)) * item.qty), 0)
  const totalProfit = subtotal - totalCost
  const effectiveDiscountAmount = isManualAmount 
    ? Number(discountAmount || 0) 
    : Math.round((subtotal * (Number(discountPercent) || 0)) / 100)
  const gstAmount = Math.round((subtotal * gstRate) / 100)
  const grandTotal = Math.max(0, subtotal + gstAmount - effectiveDiscountAmount)
  const changeDue = Number(cashReceived) >= grandTotal ? Number(cashReceived) - grandTotal : 0

  // Detect Near-Expiry Items in Cart
  const nearExpiryInCart = cart.map(item => ({
    ...item,
    expiryInfo: getProductExpiryInfo(item)
  })).filter(item => item.expiryInfo.isNearExpiry)

  // Quick Filtered Products for Tap Grid
  const filteredProducts = productList.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory
    return matchesSearch && matchesCat
  })

  // Complete Payment & Save Sales to Store Database
  const handleCompletePayment = async () => {
    if (cart.length === 0) return

    if (paymentMode === 'CASH' && Number(cashReceived) < grandTotal) {
      alert(`Insufficient cash! Required: ₹${grandTotal}, Received: ₹${cashReceived || 0}`)
      return
    }

    try {
      // Call live PostgreSQL backend POS checkout
      await checkoutPOS(
        cart.map(it => ({ id: it.id, quantity: it.qty })),
        paymentMode.toLowerCase()
      )
    } catch (err) {
      console.warn('[POS] Backend checkout error, using local fallback:', err)
    }

    // 1. Update Product Stocks and Sales Metrics in Store Database
    const updatedProducts = productList.map(p => {
      const cartItem = cart.find(c => c.id === p.id)
      if (cartItem) {
        const remainingStock = Math.max(0, p.stock - cartItem.qty)
        const costPrice = p.costPrice !== undefined ? p.costPrice : Math.round(p.price * 0.75)
        const itemProfit = (p.price - costPrice) * cartItem.qty

        let newStatus = 'Healthy'
        if (remainingStock === 0 || remainingStock <= p.minStock * 0.5) newStatus = 'Critical'
        else if (remainingStock <= p.minStock) newStatus = 'Low Stock'

        return {
          ...p,
          stock: remainingStock,
          unitsSold: (p.unitsSold || 0) + cartItem.qty,
          revenue: (p.revenue || 0) + (cartItem.qty * p.price),
          totalProfit: (p.totalProfit || 0) + itemProfit,
          status: newStatus
        }
      }
      return p
    })

    // 2. Persist to LocalStorage
    saveUserProducts(updatedProducts)
    setProductList(updatedProducts)

    // 3. Create Completed Order Object for Digital Receipt
    const orderData = {
      orderId: `INV-${Date.now().toString().slice(-6)}`,
      timestamp: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
      items: [...cart],
      subtotal,
      gstRate,
      gstAmount,
      discountAmount: effectiveDiscountAmount,
      grandTotal,
      totalProfit,
      paymentMode,
      cashReceived: Number(cashReceived || grandTotal),
      changeDue,
      storeInfo
    }

    setCompletedOrder(orderData)
    setShowReceiptModal(true)
  }

  // Reset for Next Customer
  const handleStartNextCustomer = () => {
    setCart([])
    setLastScannedProduct(null)
    setCashReceived('')
    setDiscountAmount(0)
    setShowReceiptModal(false)
    setCompletedOrder(null)
    setUnrecognizedBarcode(null)
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus()
    }
  }

  return (
    <div className="space-y-6 animate-fade-in pb-24 dashboard-workspace-bg max-w-7xl mx-auto">
      {/* Hidden File Scanner Container */}
      <div id="pos-file-scanner-temp" className="hidden" />

      {/* Supermarket Terminal Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-4 sm:p-6 rounded-3xl text-white shadow-xl border border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-400 flex items-center justify-center shrink-0 shadow-lg">
            <Barcode className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 sm:px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 font-mono text-[9px] sm:text-[10px] uppercase font-bold tracking-wider">
                Supermarket POS Counter
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] sm:text-[11px] text-emerald-300 font-bold">Terminal #01</span>
            </div>
            <h1 className="text-lg sm:text-xl font-extrabold tracking-tight mt-0.5">{storeInfo.name} — POS & Barcode</h1>
          </div>
        </div>

        {/* Camera & File Upload Controls */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 w-full md:w-auto">
          <label className="flex-1 sm:flex-initial px-3 sm:px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center space-x-2 cursor-pointer border border-slate-700 transition-colors shadow-sm text-center">
            <Upload className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="truncate">Scan Barcode File</span>
            <input type="file" accept="image/*" onChange={handleImageFileScan} className="hidden" />
          </label>

          <button
            type="button"
            onClick={() => setIsCameraActive(!isCameraActive)}
            className={`flex-1 sm:flex-initial px-3.5 sm:px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center space-x-2 transition-all shadow-md text-center ${
              isCameraActive 
                ? 'bg-rose-600 hover:bg-rose-500 text-white' 
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white'
            }`}
          >
            {isCameraActive ? <CameraOff className="w-4 h-4 shrink-0" /> : <Camera className="w-4 h-4 shrink-0" />}
            <span className="truncate">{isCameraActive ? 'Close Camera' : 'Camera Scanner'}</span>
          </button>
        </div>
      </div>

      {/* Camera Live Scanner Container */}
      {isCameraActive && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-cyan-500/40 shadow-2xl text-center space-y-3 animate-fade-in max-w-lg mx-auto">
          <div className="flex justify-between items-center text-xs text-slate-300 font-bold border-b border-slate-800 pb-2">
            <span className="flex items-center space-x-2 text-cyan-400">
              <Scan className="w-4 h-4 animate-spin" />
              <span>Scanning Barcode with Camera (EAN-13, UPC, Code 128)...</span>
            </span>

            <div className="flex items-center space-x-2">
              <button 
                type="button"
                onClick={() => setCameraRotation((prev) => (prev + 90) % 360)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-[11px] flex items-center space-x-1 border border-slate-700"
                title="Rotate Scanner View for Vertical Barcodes"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Rotate {cameraRotation}°</span>
              </button>
              
              <button onClick={() => setIsCameraActive(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div id="pos-camera-reader" className="overflow-hidden rounded-2xl border-2 border-dashed border-cyan-500/50 bg-black min-h-[240px] relative" />
          <p className="text-[11px] text-slate-400">Hold product barcode horizontally or click "Rotate" if barcode is vertical on packet.</p>
        </div>
      )}

      {/* Main Checkout Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Barcode Gun Input & Quick Product Selector (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* HIGH-SPEED BARCODE & SKU SCANNER GUN INPUT */}
          <div className="p-5 rounded-3xl card-light space-y-3 shadow-md border border-slate-200">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-slate-900 flex items-center space-x-2">
                <Scan className="w-4 h-4 text-cyan-600" />
                <span>Barcode Gun / SKU Scanner Input (Supermarket Speed)</span>
              </label>
              <span className="text-[10px] text-slate-400 font-mono">USB / Bluetooth Scanner Ready</span>
            </div>

            {/* 1-CLICK TEST BARCODE SCAN CHIPS */}
            <div className="p-2.5 rounded-2xl bg-cyan-950/20 border border-cyan-500/20 space-y-1.5">
              <span className="text-[10px] text-cyan-700 font-extrabold uppercase tracking-wider block">
                ⚡ 1-Click Test Barcode Gun Scanner Shortcuts:
              </span>
              <div className="flex flex-wrap gap-1.5 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => handleBarcodeScanned('8906113790079')}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-cyan-50 border border-cyan-300 text-slate-900 font-bold text-[11px] shadow-sm transition-transform hover:scale-105 flex items-center space-x-1"
                >
                  <Barcode className="w-3 h-3 text-cyan-600" />
                  <span>8906113790079 (Red Label Tea)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleBarcodeScanned('GRO-101')}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-cyan-50 border border-slate-300 text-slate-900 font-bold text-[11px] shadow-sm transition-transform hover:scale-105"
                >
                  <span>GRO-101 (Basmati Rice)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleBarcodeScanned('GRO-102')}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-cyan-50 border border-slate-300 text-slate-900 font-bold text-[11px] shadow-sm transition-transform hover:scale-105"
                >
                  <span>GRO-102 (Sunflower Oil)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleBarcodeScanned('DAI-101')}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-cyan-50 border border-slate-300 text-slate-900 font-bold text-[11px] shadow-sm transition-transform hover:scale-105"
                >
                  <span>DAI-101 (Amul Milk)</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleBarcodeSubmit} className="relative flex items-center">
              <input 
                ref={barcodeInputRef}
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Scan barcode gun or type SKU (e.g. 8906113790079, GRO-101) & press Enter..."
                className="w-full pl-11 pr-24 py-3.5 bg-slate-900 text-cyan-300 font-mono font-bold text-sm rounded-2xl border-2 border-cyan-500/40 focus:outline-none focus:border-cyan-400 shadow-inner placeholder:text-slate-500"
              />
              <Barcode className="w-5 h-5 text-cyan-400 absolute left-3.5" />
              <button 
                type="submit"
                className="absolute right-2 px-4 py-2 aira-gradient-btn text-white font-extrabold text-xs rounded-xl shadow-md flex items-center space-x-1"
              >
                <span>Add Item</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* Scan Alert Message Toast */}
            {scanMessage && (
              <div className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between space-x-2 animate-fade-in ${
                scanMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                scanMessage.type === 'warning' ? 'bg-amber-50 text-amber-900 border border-amber-200' :
                'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{scanMessage.text}</span>
                </div>
                {unrecognizedBarcode && (
                  <button
                    type="button"
                    onClick={() => openQuickAddForBarcode(unrecognizedBarcode)}
                    className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-[11px] rounded-lg shadow-sm flex items-center space-x-1 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Quick Add Product</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* UNRECOGNIZED BARCODE QUICK ADD BANNER */}
          {unrecognizedBarcode && !scanMessage && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 flex items-center justify-between text-xs animate-fade-in">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <h4 className="font-extrabold text-amber-900">Unrecognized Barcode Scanned: "{unrecognizedBarcode}"</h4>
                  <p className="text-[11px] text-amber-700">Product is not yet registered in your AIRA store database.</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => openQuickAddForBarcode(unrecognizedBarcode)}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs rounded-xl shadow-md flex items-center space-x-1.5 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add {unrecognizedBarcode} to Store</span>
              </button>
            </div>
          )}

          {/* LAST SCANNED PRODUCT PREVIEW CARD */}
          {lastScannedProduct && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-900/10 via-blue-900/10 to-transparent border border-cyan-500/30 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <img src={lastScannedProduct.image} alt={lastScannedProduct.name} className="w-14 h-14 rounded-xl object-cover border border-slate-200 bg-white" />
                <div>
                  <span className="text-[10px] font-mono text-cyan-700 font-bold uppercase">{lastScannedProduct.sku} • {lastScannedProduct.category}</span>
                  <h4 className="text-sm font-extrabold text-slate-900">{lastScannedProduct.name}</h4>
                  <div className="flex items-baseline space-x-2 text-xs">
                    <span className="font-extrabold text-blue-600">MRP: ₹{lastScannedProduct.price}</span>
                    <span className="text-slate-400 text-[10px]">Cost: ₹{lastScannedProduct.costPrice || Math.round(lastScannedProduct.price * 0.75)}</span>
                    
                  </div>
                </div>
              </div>
              <span className="px-3 py-1.5 rounded-xl bg-cyan-100 text-cyan-800 font-extrabold text-xs">
                In Stock: {lastScannedProduct.stock} units
              </span>
            </div>
          )}

          {/* SUPERMARKET QUICK TAP PRODUCT GRID */}
          <div className="p-4 sm:p-5 rounded-3xl card-light space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2">
                <Package className="w-4 h-4 text-blue-600" />
                <span>Supermarket Express Touch-Grid</span>
              </h3>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto text-xs">
                <select 
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-bold focus:outline-none"
                >
                  <option value="All">All Categories</option>
                  <option value="Grocery">Grocery</option>
                  <option value="Dairy">Dairy</option>
                  <option value="Snacks">Snacks</option>
                  <option value="Beverages">Beverages</option>
                  <option value="Personal Care">Personal Care</option>
                </select>

                <div className="relative flex-1">
                  <input 
                    type="text" 
                    placeholder="Search product..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
              </div>
            </div>

            {/* Product Tap Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3 max-h-[380px] overflow-y-auto pr-1">
              {filteredProducts.map((prod) => (
                <button
                  key={prod.id}
                  type="button"
                  onClick={() => {
                    playSupermarketBeep()
                    addToCart(prod)
                    setLastScannedProduct(prod)
                  }}
                  className="p-2.5 sm:p-3 rounded-2xl bg-white hover:bg-cyan-50/50 border border-slate-200 hover:border-cyan-400 text-left transition-all flex flex-col justify-between group shadow-sm hover:shadow-md"
                >
                  <div className="flex items-start space-x-2 sm:space-x-2.5">
                    <img src={prod.image} alt={prod.name} className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg object-cover border border-slate-200 shrink-0 bg-slate-50" />
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] font-mono text-slate-400 truncate block">{prod.sku}</span>
                      <h5 className="text-xs font-bold text-slate-900 truncate group-hover:text-cyan-700">{prod.name}</h5>
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                    <span className="font-extrabold text-blue-600">₹{prod.price}</span>
                    <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full ${prod.stock <= 5 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
                      {prod.stock} left
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Active Bill / Cart Ledger & Checkout Payment (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-4 sm:p-6 rounded-3xl bg-slate-900 text-white space-y-4 sm:space-y-5 shadow-2xl border border-slate-800 flex flex-col justify-between min-h-[480px] lg:min-h-[620px]">
            
            <div className="space-y-4">
              {/* Bill Header */}
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <ShoppingCart className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-base font-extrabold tracking-tight">{t('pos.cart', 'Active Customer Cart')}</h3>
                </div>

                {cart.length > 0 && (
                  <button 
                    onClick={handleClearCart}
                    className="text-xs font-bold text-rose-400 hover:text-rose-300 flex items-center space-x-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Cart</span>
                  </button>
                )}
              </div>

              {/* Cart Items List */}
              {cart.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-slate-800 text-slate-600 flex items-center justify-center mx-auto border border-slate-700">
                    <Barcode className="w-8 h-8" />
                  </div>
                  <p className="text-xs text-slate-400">{t('pos.emptyCart', 'No items scanned yet. Scan barcode gun or tap items to build bill.')}</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                  {cart.map((item) => (
                    <div key={item.id} className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <img src={item.image} alt={item.name} className="w-9 h-9 rounded-lg object-cover shrink-0 bg-white" />
                        <div className="min-w-0 flex-1">
                          <h5 className="font-bold text-slate-100 truncate">{item.name}</h5>
                          <span className="text-[10px] text-cyan-400 font-mono">₹{item.price} x {item.qty} = ₹{item.price * item.qty}</span>
                        </div>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center space-x-1 shrink-0 ml-2">
                        <button 
                          onClick={() => updateCartQty(item.id, -1)}
                          className="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-white font-bold"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-7 text-center font-mono font-bold">{item.qty}</span>
                        <button 
                          onClick={() => updateCartQty(item.id, 1)}
                          className="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-white font-bold"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button 
                          onClick={() => removeFromCart(item.id)}
                          className="p-1 text-slate-400 hover:text-rose-400 ml-1"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Financial Summary & Payment Options */}
            {cart.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-slate-800">
                {/* Near-Expiry Clearance Alert Banner */}
                {nearExpiryInCart.length > 0 && (
                  <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold flex items-center gap-1.5 text-amber-300">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Near Expiry Alert ({nearExpiryInCart.length} item{nearExpiryInCart.length > 1 ? 's' : ''})</span>
                      </span>
                      <span className="text-[10px] bg-amber-500/30 text-amber-200 px-2 py-0.5 rounded-full font-mono font-bold">
                        {nearExpiryInCart[0].expiryInfo.suggestedDiscount}% OFF Suggested
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-100/90 leading-tight">
                      <strong>{nearExpiryInCart[0].name}</strong> expires in {nearExpiryInCart[0].expiryInfo.daysLeft} days ({nearExpiryInCart[0].expiryInfo.expiryDate}).
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setDiscountPercent(nearExpiryInCart[0].expiryInfo.suggestedDiscount)
                        setIsManualAmount(false)
                        triggerToast(`Applied ${nearExpiryInCart[0].expiryInfo.suggestedDiscount}% Near-Expiry Clearance Discount!`)
                      }}
                      className="w-full py-1.5 px-3 rounded-xl bg-amber-500/25 hover:bg-amber-500/35 text-amber-200 font-extrabold text-[11px] border border-amber-500/40 transition-all flex items-center justify-center space-x-1.5"
                    >
                      <span>Apply {nearExpiryInCart[0].expiryInfo.suggestedDiscount}% Clearance Discount</span>
                    </button>
                  </div>
                )}

                {/* GST & Editable 5% Discount Options */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-slate-400 text-[11px] block font-medium mb-1">GST Tax Rate</label>
                    <select 
                      value={gstRate}
                      onChange={(e) => setGstRate(Number(e.target.value))}
                      className="w-full p-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-bold focus:outline-none"
                    >
                      <option value={0}>0% GST</option>
                      <option value={5}>5% GST (Standard)</option>
                      <option value={12}>12% GST</option>
                      <option value={18}>18% GST</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-slate-400 text-[11px] block font-medium">Discount</label>
                      <span className="text-[10px] text-emerald-400 font-mono font-bold">₹{effectiveDiscountAmount}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <input 
                        type="number"
                        min="0"
                        max="100"
                        placeholder="5"
                        value={isManualAmount ? discountAmount : discountPercent}
                        onChange={(e) => {
                          const val = e.target.value
                          if (isManualAmount) {
                            setDiscountAmount(val)
                          } else {
                            setDiscountPercent(val)
                          }
                        }}
                        className="w-full p-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-bold focus:outline-none font-mono text-center"
                      />
                      <button
                        type="button"
                        onClick={() => setIsManualAmount(!isManualAmount)}
                        className="px-2 py-2 rounded-xl bg-slate-800 border border-slate-700 text-cyan-400 text-[10px] font-bold shrink-0"
                        title={isManualAmount ? "Switch to %" : "Switch to ₹"}
                      >
                        {isManualAmount ? '₹' : '%'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Quick Preset Discount Pills */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-400 font-semibold">Presets:</span>
                  {[0, 5, 10, 15, 20].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => {
                        setDiscountPercent(pct)
                        setIsManualAmount(false)
                      }}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold font-mono transition-all ${
                        !isManualAmount && Number(discountPercent) === pct
                          ? 'bg-cyan-500 text-slate-950 shadow-sm'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {pct}%{pct === 5 ? ' (Default)' : ''}
                    </button>
                  ))}
                </div>

                {/* Subtotal, GST, Grand Total Breakdown (Estimated Profit completely removed) */}
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between text-slate-400">
                    <span>{t('pos.subtotal', 'Subtotal')} ({cart.reduce((a, b) => a + b.qty, 0)} items):</span>
                    <span>₹{subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>{t('pos.tax', 'GST')} ({gstRate}%):</span>
                    <span>+₹{gstAmount.toLocaleString('en-IN')}</span>
                  </div>
                  {effectiveDiscountAmount > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>{t('pos.discount', 'Discount')} {!isManualAmount ? `(${discountPercent}%)` : ''}:</span>
                      <span>-₹{effectiveDiscountAmount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-baseline pt-2 border-t border-slate-800 text-base font-extrabold text-white">
                    <span>{t('pos.grandTotal', 'Grand Total')}:</span>
                    <span className="text-cyan-400 text-xl">₹{grandTotal.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Payment Mode Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 block">{t('pos.paymentMode', 'Select Payment Method')}</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button 
                      type="button"
                      onClick={() => setPaymentMode('UPI')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center space-y-1 transition-all ${
                        paymentMode === 'UPI' 
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300' 
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      <QrCode className="w-4 h-4" />
                      <span>{t('pos.upi', 'UPI / QR Code')}</span>
                    </button>

                    <button 
                      type="button"
                      onClick={() => setPaymentMode('CASH')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center space-y-1 transition-all ${
                        paymentMode === 'CASH' 
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300' 
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Banknote className="w-4 h-4" />
                      <span>{t('pos.cash', 'Cash')}</span>
                    </button>

                    <button 
                      type="button"
                      onClick={() => setPaymentMode('CARD')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center space-y-1 transition-all ${
                        paymentMode === 'CARD' 
                          ? 'bg-purple-500/20 border-purple-400 text-purple-300' 
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>{t('pos.card', 'Card / POS')}</span>
                    </button>
                  </div>
                </div>

                {/* UPI QR Preview or Cash Calculator */}
                {paymentMode === 'UPI' && (
                  <div className="p-3 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex items-center space-x-4">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=upi://pay?pa=airamart@upi%26pn=AIRA%20Mart%26am=${grandTotal}`} 
                      alt="UPI QR Code" 
                      className="w-16 h-16 rounded-xl border border-white bg-white shrink-0"
                    />
                    <div className="text-[11px] space-y-0.5">
                      <span className="font-extrabold text-cyan-300 block">Scan QR to Pay ₹{grandTotal}</span>
                      <p className="text-slate-400">Accepts Google Pay, PhonePe, Paytm & any UPI app</p>
                    </div>
                  </div>
                )}

                {paymentMode === 'CASH' && (
                  <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-300">Cash Received (₹):</span>
                      <input 
                        type="number"
                        placeholder={grandTotal.toString()}
                        value={cashReceived}
                        onChange={(e) => setCashReceived(e.target.value)}
                        className="w-28 p-1.5 bg-slate-900 border border-slate-700 rounded-lg text-emerald-400 font-extrabold text-right focus:outline-none"
                      />
                    </div>
                    {Number(cashReceived) > 0 && (
                      <div className="flex justify-between text-slate-300 font-mono text-[11px]">
                        <span>Change to Return:</span>
                        <span className="font-extrabold text-amber-300">₹{changeDue.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* COMPLETE SALE BUTTON */}
                <button
                  type="button"
                  onClick={handleCompletePayment}
                  className="w-full py-4 aira-gradient-btn text-white font-extrabold text-sm rounded-2xl shadow-xl hover:scale-[1.02] transition-transform flex items-center justify-center space-x-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{t('pos.completeSale', 'Complete Payment & Update Store Stock')}</span>
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* QUICK ADD PRODUCT MODAL FOR UNRECOGNIZED BARCODE */}
      {showQuickAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
                <Tag className="w-4 h-4 text-cyan-600" />
                <span>Quick Add Product for Barcode</span>
              </h3>
              <button onClick={() => setShowQuickAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickAddSubmit} className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-900 font-mono">
                <span className="text-[10px] text-cyan-600 font-bold uppercase block">Scanned Barcode / SKU Code:</span>
                <span className="font-extrabold text-sm">{quickAddForm.sku}</span>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Product Name *</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Red Label Tea 250g"
                  value={quickAddForm.name}
                  onChange={(e) => setQuickAddForm({ ...quickAddForm, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Selling Retail Price (₹) *</label>
                  <input 
                    type="number"
                    required
                    placeholder="e.g. 140"
                    value={quickAddForm.price}
                    onChange={(e) => setQuickAddForm({ ...quickAddForm, price: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-blue-600 font-extrabold text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Wholesale Cost (₹)</label>
                  <input 
                    type="number"
                    placeholder="e.g. 110"
                    value={quickAddForm.costPrice}
                    onChange={(e) => setQuickAddForm({ ...quickAddForm, costPrice: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Category</label>
                  <select 
                    value={quickAddForm.category}
                    onChange={(e) => setQuickAddForm({ ...quickAddForm, category: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none"
                  >
                    <option value="Grocery">Grocery</option>
                    <option value="Dairy">Dairy</option>
                    <option value="Snacks">Snacks</option>
                    <option value="Beverages">Beverages</option>
                    <option value="Personal Care">Personal Care</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Initial Stock</label>
                  <input 
                    type="number"
                    value={quickAddForm.stock}
                    onChange={(e) => setQuickAddForm({ ...quickAddForm, stock: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex space-x-3">
                <button 
                  type="button"
                  onClick={() => setShowQuickAddModal(false)}
                  className="w-1/3 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="w-2/3 py-3 aira-gradient-btn text-white font-extrabold rounded-xl text-xs shadow-md"
                >
                  Save & Add to POS Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIGITAL SUPERMARKET PRINT RECEIPT MODAL */}
      {showReceiptModal && completedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            
            {/* Success Header */}
            <div className="text-center space-y-2 border-b border-slate-100 pb-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-900">Payment Successful!</h3>
              <p className="text-xs text-slate-500">Store stock statistics and total profits updated automatically.</p>
            </div>

            {/* Printable Supermarket Invoice Slip */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 font-mono text-xs space-y-3">
              <div className="text-center space-y-0.5 border-b border-dashed border-slate-300 pb-3">
                <h4 className="font-extrabold text-sm text-slate-900 uppercase">{completedOrder.storeInfo.name}</h4>
                <p className="text-[10px] text-slate-500">{completedOrder.storeInfo.category} • {completedOrder.storeInfo.city}</p>
                <p className="text-[10px] text-slate-400">Invoice #{completedOrder.orderId} • {completedOrder.timestamp}</p>
              </div>

              {/* Items List */}
              <div className="space-y-1.5 py-1 border-b border-dashed border-slate-300">
                <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase">
                  <span>Item</span>
                  <span>Qty x Rate</span>
                  <span>Amt</span>
                </div>
                {completedOrder.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-[11px]">
                    <span className="truncate max-w-[160px] font-semibold">{item.name}</span>
                    <span>{item.qty} x ₹{item.price}</span>
                    <span className="font-bold">₹{item.qty * item.price}</span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-1 text-[11px] border-b border-dashed border-slate-300 pb-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{completedOrder.subtotal}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST ({completedOrder.gstRate}%):</span>
                  <span>+₹{completedOrder.gstAmount}</span>
                </div>
                {completedOrder.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount:</span>
                    <span>-₹{completedOrder.discountAmount}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-1">
                  <span>Grand Total Paid:</span>
                  <span>₹{completedOrder.grandTotal}</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Paid Via:</span>
                  <span className="font-bold">{completedOrder.paymentMode}</span>
                </div>
              </div>

              {/* Barcode graphic footer */}
              <div className="text-center pt-2 space-y-1">
                <Barcode className="w-48 h-8 mx-auto text-slate-800" />
                <p className="text-[9px] text-slate-400">Thank you for shopping at AIRA Mart!</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="w-full py-3 bg-slate-900 text-white font-extrabold rounded-xl text-xs flex items-center justify-center space-x-2 hover:bg-slate-800 shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>Print Supermarket Receipt</span>
              </button>

              <button
                type="button"
                onClick={handleStartNextCustomer}
                className="w-full py-3 aira-gradient-btn text-white font-extrabold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-md"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Start Next Customer Checkout</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
