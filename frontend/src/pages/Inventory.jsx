import { fetchProducts, restockProduct, sellProduct, createProduct, updateProduct, deleteProduct } from '../services/api'
import React, { useState, useEffect } from 'react'
import { products as initialProducts } from '../utils/demoData'
import { getUserProducts, saveUserProducts, isDemoUser } from '../utils/userStore'
import { 
  Search, 
  Filter, 
  Plus, 
  ShoppingCart, 
  AlertTriangle, 
  ArrowUpDown, 
  Sparkles, 
  CheckCircle2, 
  Tag, 
  Gift, 
  Minus, 
  TrendingUp, 
  X, 
  Upload, 
  PackageCheck,
  Edit3,
  DollarSign,
  Camera,
  Image as ImageIcon,
  UploadCloud,
  Link2,
  RotateCcw,
  Undo2,
  Barcode
} from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Inventory() {

  // Load live products from PostgreSQL
  useEffect(() => {
    fetchProducts().then(prods => {
      if (prods && prods.length > 0) {
        setProductList(prods)
      }
    }).catch(err => console.warn('[Inventory] Using local fallback:', err))
  }, [])

  const [productList, setProductList] = useState(() => getUserProducts())
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedStatus, setSelectedStatus] = useState('All')
  const [showAddModal, setShowAddModal] = useState(false)

  // Edit Price & Details Modal State
  const [showEditPriceModal, setShowEditPriceModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [editPriceForm, setEditPriceForm] = useState({
    price: '',
    costPrice: '',
    image: ''
  })
  
  // Custom Restock Quantity State per product
  const [customQuantities, setCustomQuantities] = useState({})
  
  // Sell Quantity State per product
  const [sellQuantities, setSellQuantities] = useState({})

  // Helper to update and persist product list
  const updateAndSaveProducts = (newList) => {
    setProductList(newList)
    saveUserProducts(newList)
  }

  // New Product Form State (with image file upload data)
  const [newProduct, setNewProduct] = useState({
    name: '',
    sku: '',
    category: 'Grocery',
    price: '',
    costPrice: '',
    stock: '',
    minStock: '15',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&h=200&fit=crop',
    imageMode: 'file' // 'file' or 'url'
  })

  const [imagePreview, setImagePreview] = useState('')

  // Handle Photo File Upload
  const handleImageFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target.result
      setImagePreview(dataUrl)
      setNewProduct(prev => ({ ...prev, image: dataUrl }))
    }
    reader.readAsDataURL(file)
  }

  // Handle Image File Upload for Edit Modal
  const handleEditImageFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target.result
      setEditPriceForm(prev => ({ ...prev, image: dataUrl }))
    }
    reader.readAsDataURL(file)
  }

  // Filter Logic
  const filteredProducts = productList.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory
    const matchesStatus = selectedStatus === 'All' || p.status === selectedStatus
    return matchesSearch && matchesCategory && matchesStatus
  })

  // Restock Option 1: Preset Restock
  const handlePresetRestock = async (id, amount = 30) => {
    try {
      const res = await restockProduct(id, amount)
      if (res && res.product) {
        setProductList(prev => prev.map(p => p.id === id ? { ...p, ...res.product } : p))
        return
      }
    } catch (e) {
      console.warn('[Restock] Backend API error, using local state:', e)
    }
    const updated = productList.map(p => {
      if (p.id === id) {
        const updatedStock = p.stock + amount
        return {
          ...p,
          stock: updatedStock,
          status: updatedStock > (p.minStock || p.min_stock || 15) ? 'Healthy' : 'Low Stock'
        }
      }
      return p
    })
    updateAndSaveProducts(updated)
  }

  // Restock Option 2: Custom Restock Quantity
  const handleCustomRestock = async (id) => {
    const qty = Number(customQuantities[id] || 0)
    if (qty <= 0) return

    try {
      const res = await restockProduct(id, qty)
      if (res && res.product) {
        setProductList(prev => prev.map(p => p.id === id ? { ...p, ...res.product } : p))
        setCustomQuantities(prev => ({ ...prev, [id]: '' }))
        return
      }
    } catch (e) {
      console.warn('[Restock] Backend API error, using local fallback:', e)
    }

    const updated = productList.map(p => {
      if (p.id === id) {
        const updatedStock = p.stock + qty
        return {
          ...p,
          stock: updatedStock,
          status: updatedStock > (p.minStock || p.min_stock || 15) ? 'Healthy' : 'Low Stock'
        }
      }
      return p
    })

    updateAndSaveProducts(updated)
    setCustomQuantities(prev => ({ ...prev, [id]: '' }))
  }

  // LOG SALE / SELL UNITS CONTROL
  const getRawSellQty = (id) => {
    return sellQuantities[id] !== undefined ? sellQuantities[id] : '1'
  }

  const getParsedSellQty = (id) => {
    const raw = sellQuantities[id] !== undefined ? sellQuantities[id] : '1'
    const parsed = parseInt(raw, 10)
    return isNaN(parsed) || parsed < 1 ? 1 : parsed
  }

  const updateSellQty = (id, delta) => {
    const currentNum = getParsedSellQty(id)
    const updated = Math.max(1, currentNum + delta)
    setSellQuantities({ ...sellQuantities, [id]: updated.toString() })
  }

  const handleSellInputChange = (id, value) => {
    setSellQuantities({ ...sellQuantities, [id]: value })
  }

  const handleSellInputBlur = (id) => {
    const raw = sellQuantities[id]
    if (raw === undefined || raw === '' || parseInt(raw, 10) < 1 || isNaN(parseInt(raw, 10))) {
      setSellQuantities({ ...sellQuantities, [id]: '1' })
    }
  }

  const handleSellUnits = async (id) => {
    const qtyToSell = getParsedSellQty(id)
    if (qtyToSell <= 0) return

    try {
      const res = await sellProduct(id, qtyToSell)
      if (res && res.product) {
        setProductList(prev => prev.map(p => p.id === id ? { ...p, ...res.product } : p))
        setSellQuantities(prev => ({ ...prev, [id]: '1' }))
        return
      }
    } catch (e) {
      console.warn('[Sell] Backend API error, using local fallback:', e)
    }

    const updated = productList.map(p => {
      if (p.id === id) {
        const remainingStock = Math.max(0, p.stock - qtyToSell)
        let newStatus = 'Healthy'
        if (remainingStock === 0 || remainingStock <= p.minStock * 0.5) newStatus = 'Critical'
        else if (remainingStock <= p.minStock) newStatus = 'Low Stock'

        const costPrice = p.costPrice !== undefined ? p.costPrice : Math.round(p.price * 0.75)
        const unitProfit = p.price - costPrice

        return {
          ...p,
          stock: remainingStock,
          unitsSold: (p.unitsSold || 0) + qtyToSell,
          revenue: (p.revenue || 0) + (qtyToSell * p.price),
          totalProfit: (p.totalProfit || 0) + (qtyToSell * unitProfit),
          status: newStatus,
          lastSale: {
            qty: qtyToSell,
            price: p.price,
            unitProfit: unitProfit,
            timestamp: Date.now()
          }
        }
      }
      return p
    })

    updateAndSaveProducts(updated)
    setSellQuantities({ ...sellQuantities, [id]: '1' })
  }

  // UNDO MISTAKEN SALE LOG
  const handleUndoLastSale = (id) => {
    const updated = productList.map(p => {
      if (p.id === id && p.lastSale) {
        const { qty, price, unitProfit } = p.lastSale
        const restoredStock = p.stock + qty
        const restoredUnitsSold = Math.max(0, (p.unitsSold || 0) - qty)
        const restoredRevenue = Math.max(0, (p.revenue || 0) - (qty * price))
        const restoredTotalProfit = Math.max(0, (p.totalProfit || 0) - (qty * unitProfit))

        let newStatus = 'Healthy'
        if (restoredStock === 0 || restoredStock <= p.minStock * 0.5) newStatus = 'Critical'
        else if (restoredStock <= p.minStock) newStatus = 'Low Stock'

        return {
          ...p,
          stock: restoredStock,
          unitsSold: restoredUnitsSold,
          revenue: restoredRevenue,
          totalProfit: restoredTotalProfit,
          status: newStatus,
          lastSale: null
        }
      }
      return p
    })

    updateAndSaveProducts(updated)
  }

  // ADD NEW PRODUCT SUBMIT WITH PHOTO UPLOAD
  const handleAddProductSubmit = (e) => {
    e.preventDefault()
    if (!newProduct.name || !newProduct.price || !newProduct.stock) return

    const price = Number(newProduct.price) || 0
    const costPrice = Number(newProduct.costPrice) || Math.round(price * 0.75)
    const unitProfit = price - costPrice
    const margin = price > 0 ? Number(((unitProfit / price) * 100).toFixed(1)) : 0
    const roi = costPrice > 0 ? Number(((unitProfit / costPrice) * 100).toFixed(1)) : 0

    const created = {
      id: Date.now(),
      name: newProduct.name,
      sku: newProduct.sku || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
      category: newProduct.category,
      price,
      costPrice,
      unitProfit,
      margin,
      roi,
      stock: Number(newProduct.stock) || 0,
      minStock: Number(newProduct.minStock) || 15,
      unitsSold: 0,
      revenue: 0,
      totalProfit: 0,
      status: Number(newProduct.stock) > Number(newProduct.minStock || 15) ? 'Healthy' : 'Low Stock',
      primaryAdviceType: 'restock',
      adviceTitle: 'AIRA Initial Stock Monitor',
      adviceText: 'New product added to inventory. AIRA will track sales velocity over the next 7 days.',
      orderRecommendation: 20,
      image: newProduct.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&h=200&fit=crop'
    }

    const updated = [created, ...productList]
    updateAndSaveProducts(updated)
    setShowAddModal(false)
    setImagePreview('')
    setNewProduct({
      name: '',
      sku: '',
      category: 'Grocery',
      price: '',
      costPrice: '',
      stock: '',
      minStock: '15',
      image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&h=200&fit=crop',
      imageMode: 'file'
    })
  }

  // Open Edit Price & Details Modal
  const openEditPriceModal = (prod) => {
    setEditingProduct(prod)
    setEditPriceForm({
      price: prod.price !== undefined ? prod.price : '',
      costPrice: prod.costPrice !== undefined ? prod.costPrice : Math.round((prod.price || 0) * 0.75),
      stock: prod.stock !== undefined ? prod.stock : '',
      unitsSold: prod.unitsSold !== undefined ? prod.unitsSold : 0,
      image: prod.image || ''
    })
    setShowEditPriceModal(true)
  }

  // Save Changed Price, Stock, Sales & Photo
  const handleSavePriceEdit = (e) => {
    e.preventDefault()
    if (!editingProduct || editPriceForm.price === '') return

    const newPrice = Number(editPriceForm.price) || 0
    const newCostPrice = Number(editPriceForm.costPrice) || Math.round(newPrice * 0.75)
    const newStock = Number(editPriceForm.stock) >= 0 ? Number(editPriceForm.stock) : editingProduct.stock
    const newUnitsSold = Number(editPriceForm.unitsSold) >= 0 ? Number(editPriceForm.unitsSold) : (editingProduct.unitsSold || 0)

    const newUnitProfit = newPrice - newCostPrice
    const newMargin = newPrice > 0 ? Number(((newUnitProfit / newPrice) * 100).toFixed(1)) : 0
    const newRoi = newCostPrice > 0 ? Number(((newUnitProfit / newCostPrice) * 100).toFixed(1)) : 0

    const updated = productList.map(p => {
      if (p.id === editingProduct.id) {
        let newStatus = 'Healthy'
        if (newStock === 0 || newStock <= p.minStock * 0.5) newStatus = 'Critical'
        else if (newStock <= p.minStock) newStatus = 'Low Stock'

        return {
          ...p,
          price: newPrice,
          costPrice: newCostPrice,
          stock: newStock,
          unitsSold: newUnitsSold,
          unitProfit: newUnitProfit,
          margin: newMargin,
          roi: newRoi,
          revenue: newUnitsSold * newPrice,
          totalProfit: newUnitsSold * newUnitProfit,
          status: newStatus,
          image: editPriceForm.image || p.image,
          lastSale: null
        }
      }
      return p
    })

    updateAndSaveProducts(updated)
    setShowEditPriceModal(false)
    setEditingProduct(null)
  }

  return (
    <div className="space-y-6 animate-fade-in pb-24 dashboard-workspace-bg max-w-7xl mx-auto">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Smart Visual Inventory & Sales Logger</h1>
          <p className="text-xs text-slate-500">Upload product photos, manage wholesale costs and retail prices, log sales, and restock levels.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <Link 
            to="/app/pos"
            className="flex-1 sm:flex-initial px-3.5 sm:px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 font-extrabold text-xs flex items-center justify-center space-x-2 border border-slate-700 shadow-md transition-colors text-center"
          >
            <Barcode className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="truncate">Barcode POS</span>
          </Link>

          <button 
            onClick={() => setShowAddModal(true)}
            className="flex-1 sm:flex-initial aira-gradient-btn px-4 py-2.5 text-xs font-bold flex items-center justify-center space-x-2 shadow-md text-center"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span className="truncate">Add Product</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl card-light flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search products by name or SKU..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex flex-row items-center gap-2 sm:gap-3 w-full md:w-auto text-xs">
          <select 
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="flex-1 md:flex-initial p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none"
          >
            <option value="All">All Categories</option>
            <option value="Grocery">Grocery</option>
            <option value="Dairy">Dairy</option>
            <option value="Snacks">Snacks</option>
            <option value="Beverages">Beverages</option>
            <option value="Personal Care">Personal Care</option>
            <option value="Household">Household</option>
          </select>

          <select 
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="flex-1 md:flex-initial p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none"
          >
            <option value="All">All Statuses</option>
            <option value="Healthy">Healthy</option>
            <option value="Low Stock">Low Stock</option>
            <option value="Critical">Critical</option>
            <option value="Overstock">Overstock</option>
          </select>
        </div>
      </div>

      {/* Visual Product Grid */}
      {filteredProducts.length === 0 ? (
        <div className="p-12 rounded-3xl card-light text-center space-y-4 max-w-xl mx-auto my-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <PackageCheck className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900">No Products in Inventory</h3>
            <p className="text-xs text-slate-500">Click "Add New Product" to upload product photos, set costs & selling prices, or import your CSV file.</p>
          </div>
          <div className="flex justify-center space-x-3 pt-2">
            <button 
              onClick={() => setShowAddModal(true)}
              className="aira-gradient-btn px-5 py-2.5 text-xs font-bold shadow-md flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Product</span>
            </button>
            <Link to="/app/import" className="px-5 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-700 text-xs hover:bg-slate-50 flex items-center space-x-2">
              <Upload className="w-4 h-4" />
              <span>Import CSV</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((prod) => {
            const fillPercentage = Math.min(100, Math.round((prod.stock / (prod.minStock * 2.5)) * 100))
            const defaultPreset = prod.orderRecommendation || 30
            const rawSellQty = getRawSellQty(prod.id)
            const parsedSellQty = getParsedSellQty(prod.id)
            const originalCost = prod.costPrice !== undefined ? prod.costPrice : Math.round(prod.price * 0.75)
            const unitProfit = prod.unitProfit !== undefined ? prod.unitProfit : (prod.price - originalCost)

            return (
              <div key={prod.id} className="p-5 rounded-2xl card-light-interactive flex flex-col justify-between">
                <div>
                  <div className="flex items-start space-x-4 mb-3">
                    <img src={prod.image} alt={prod.name} className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0 bg-slate-100" />
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-mono text-slate-400 uppercase">{prod.sku} • {prod.category}</span>
                      <h3 className="text-sm font-bold text-slate-900 truncate">{prod.name}</h3>
                      
                      {/* Original Cost vs Selling Price & Edit Button */}
                      <div className="mt-1 flex items-center justify-between">
                        <div>
                          <div className="flex items-baseline space-x-1.5">
                            <span className="text-sm font-extrabold text-blue-600">Selling: ₹{prod.price}</span>
                            <span className="text-[10px] text-slate-400 font-mono">Cost: ₹{originalCost}</span>
                          </div>
                          <div className="text-[10px] font-bold text-emerald-600">
                            Unit Profit: +₹{unitProfit}
                          </div>
                        </div>

                        {/* Retailer Edit Button */}
                        <button 
                          onClick={() => openEditPriceModal(prod)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-blue-600 text-[10px] font-bold flex items-center space-x-1 transition-colors shrink-0"
                          title="Edit Product Details / Price / Photo"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Stock Level Bar Visualization */}
                  <div className="space-y-1.5 mb-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-700">
                        {prod.stock <= 5 ? `Only ${prod.stock} left` : `${prod.stock} in stock`}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        prod.status === 'Critical' ? 'bg-rose-100 text-rose-700' :
                        prod.status === 'Low Stock' ? 'bg-amber-100 text-amber-700' :
                        prod.status === 'Overstock' ? 'bg-cyan-100 text-cyan-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {prod.status}
                      </span>
                    </div>

                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${
                          prod.status === 'Critical' ? 'bg-rose-500' :
                          prod.status === 'Low Stock' ? 'bg-amber-500' :
                          'bg-emerald-500'
                        }`}
                        style={{ width: `${fillPercentage}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono text-right">Min threshold: {prod.minStock} units</div>
                  </div>
                </div>

                {/* LOG SALE CONTROL & RESTOCK CONTROLS */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="p-2 rounded-xl bg-slate-900 text-white space-y-1.5">
                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono uppercase">
                      <span>LOG PRODUCT SALE</span>
                      <span className="text-cyan-400">Total Sold: {prod.unitsSold || 0}</span>
                    </div>

                    <div className="flex items-center justify-between space-x-2">
                      <div className="flex items-center space-x-1 bg-slate-800 p-1 rounded-lg border border-slate-700">
                        <button 
                          onClick={() => updateSellQty(prod.id, -1)}
                          className="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-white font-bold"
                        >
                          <Minus className="w-3 h-3" />
                        </button>

                        <input 
                          type="text" 
                          value={rawSellQty}
                          onChange={(e) => handleSellInputChange(prod.id, e.target.value)}
                          onBlur={() => handleSellInputBlur(prod.id)}
                          className="w-10 text-center bg-transparent font-mono text-xs text-white font-bold focus:outline-none"
                        />

                        <button 
                          onClick={() => updateSellQty(prod.id, 1)}
                          className="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-white font-bold"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button 
                        onClick={() => handleSellUnits(prod.id)}
                        disabled={prod.stock <= 0}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-transform shadow-sm flex items-center justify-center space-x-1 ${
                          prod.stock <= 0 
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            : 'aira-gradient-btn hover:scale-105'
                        }`}
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>Sell {parsedSellQty} Units</span>
                      </button>
                    </div>

                    {/* MISTAKEN SALE UNDO BANNER */}
                    {prod.lastSale && (
                      <div className="flex items-center justify-between text-[11px] bg-amber-500/15 border border-amber-500/30 text-amber-300 p-2 rounded-lg mt-1 animate-fade-in">
                        <span className="truncate">Mistake? Logged {prod.lastSale.qty} unit sale</span>
                        <button 
                          type="button"
                          onClick={() => handleUndoLastSale(prod.id)}
                          className="px-2.5 py-1 rounded-md bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold flex items-center space-x-1 text-[10px] transition-transform hover:scale-105 shrink-0 shadow-sm"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Undo Last Sale</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => handlePresetRestock(prod.id, defaultPreset)}
                      className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-blue-50 border border-slate-200 text-blue-700 font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Restock +{defaultPreset}</span>
                    </button>

                    <div className="flex items-center space-x-1">
                      <input 
                        type="number"
                        placeholder="Qty"
                        value={customQuantities[prod.id] || ''}
                        onChange={(e) => setCustomQuantities({ ...customQuantities, [prod.id]: e.target.value })}
                        className="w-14 p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono focus:outline-none focus:border-blue-500"
                      />
                      <button 
                        onClick={() => handleCustomRestock(prod.id)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* RETAILER CHANGE PRICE & PHOTO & STOCK MODAL */}
      {showEditPriceModal && editingProduct && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
                <Edit3 className="w-4 h-4 text-blue-600" />
                <span>Edit Product: {editingProduct.name}</span>
              </h3>
              <button onClick={() => setShowEditPriceModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePriceEdit} className="space-y-4 text-xs">
              {/* Image Preview & Change Photo Button */}
              <div className="flex items-center space-x-4 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <img 
                  src={editPriceForm.image || editingProduct.image} 
                  alt={editingProduct.name} 
                  className="w-16 h-16 rounded-xl object-cover border border-slate-300 shrink-0 bg-white"
                />
                <div className="space-y-1 flex-1 min-w-0">
                  <span className="font-bold text-slate-900 text-xs block truncate">{editingProduct.name}</span>
                  <label className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-bold text-[11px] cursor-pointer transition-colors">
                    <Camera className="w-3.5 h-3.5" />
                    <span>Upload New Photo</span>
                    <input type="file" accept="image/*" onChange={handleEditImageFileUpload} className="hidden" />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Original Wholesale Cost (₹)
                  </label>
                  <input 
                    type="number"
                    required
                    placeholder="Wholesale cost"
                    value={editPriceForm.costPrice}
                    onChange={(e) => setEditPriceForm({ ...editPriceForm, costPrice: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Purchase cost per unit</span>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Selling Retail Price (₹)
                  </label>
                  <input 
                    type="number"
                    required
                    placeholder="Selling MRP"
                    value={editPriceForm.price}
                    onChange={(e) => setEditPriceForm({ ...editPriceForm, price: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-blue-600 font-extrabold text-sm focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Price customer pays</span>
                </div>
              </div>

              {/* MANUAL STOCK & TOTAL UNITS SOLD CORRECTION FIELDS */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Current Stock Level
                  </label>
                  <input 
                    type="number"
                    required
                    min="0"
                    placeholder="Units in stock"
                    value={editPriceForm.stock}
                    onChange={(e) => setEditPriceForm({ ...editPriceForm, stock: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Correct stock count</span>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Total Units Sold Log
                  </label>
                  <input 
                    type="number"
                    required
                    min="0"
                    placeholder="Total units sold"
                    value={editPriceForm.unitsSold}
                    onChange={(e) => setEditPriceForm({ ...editPriceForm, unitsSold: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Correct historical sales</span>
                </div>
              </div>

              {/* Calculated Unit Profit Preview */}
              {editPriceForm.price && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-mono flex justify-between items-center text-xs">
                  <span>Calculated Unit Profit:</span>
                  <span className="font-extrabold text-emerald-700 text-sm">
                    +₹{Math.max(0, Number(editPriceForm.price) - Number(editPriceForm.costPrice || 0))}
                  </span>
                </div>
              )}

              <div className="pt-2 flex space-x-3">
                <button 
                  type="button" 
                  onClick={() => setShowEditPriceModal(null)}
                  className="w-1/3 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="w-2/3 py-3 aira-gradient-btn text-white font-bold rounded-xl text-xs shadow-md"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD NEW PRODUCT MODAL WITH PHOTO UPLOAD */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Add New Product to Inventory</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddProductSubmit} className="space-y-4 text-xs">
              
              {/* PRODUCT PHOTO UPLOAD SECTION */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-slate-900 font-bold flex items-center space-x-1.5">
                    <Camera className="w-4 h-4 text-blue-600" />
                    <span>Product Photo / Image</span>
                  </label>
                  <div className="flex items-center space-x-2 text-[10px] font-semibold">
                    <button 
                      type="button" 
                      onClick={() => setNewProduct({ ...newProduct, imageMode: 'file' })}
                      className={`px-2.5 py-1 rounded-md transition-colors ${newProduct.imageMode === 'file' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'}`}
                    >
                      Upload File
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setNewProduct({ ...newProduct, imageMode: 'url' })}
                      className={`px-2.5 py-1 rounded-md transition-colors ${newProduct.imageMode === 'url' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'}`}
                    >
                      Image URL
                    </button>
                  </div>
                </div>

                {newProduct.imageMode === 'file' ? (
                  <div className="flex items-center space-x-4">
                    {imagePreview ? (
                      <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-300 shrink-0">
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                        <button 
                          type="button" 
                          onClick={() => { setImagePreview(''); setNewProduct(prev => ({ ...prev, image: '' })) }}
                          className="absolute top-1 right-1 p-1 bg-slate-900/80 text-white rounded-full hover:bg-slate-900"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-slate-200 border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 shrink-0">
                        <ImageIcon className="w-8 h-8" />
                      </div>
                    )}

                    <div className="flex-1 space-y-1">
                      <label className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer shadow-sm transition-all">
                        <UploadCloud className="w-4 h-4" />
                        <span>Browse & Upload Photo</span>
                        <input type="file" accept="image/*" onChange={handleImageFileUpload} className="hidden" />
                      </label>
                      <p className="text-[10px] text-slate-400">Supports JPG, PNG, WEBP files from your computer</p>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <input 
                      type="url"
                      placeholder="Paste image URL (e.g. https://images.unsplash.com/...)"
                      value={newProduct.image}
                      onChange={(e) => { setNewProduct({ ...newProduct, image: e.target.value }); setImagePreview(e.target.value) }}
                      className="w-full p-2.5 pl-9 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                    <Link2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                )}
              </div>

              {/* Product Name */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Product Name *</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Cadbury Dairy Milk Silk 150g"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Category</label>
                  <select 
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none"
                  >
                    <option value="Grocery">Grocery</option>
                    <option value="Dairy">Dairy</option>
                    <option value="Snacks">Snacks</option>
                    <option value="Beverages">Beverages</option>
                    <option value="Personal Care">Personal Care</option>
                    <option value="Household">Household</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">SKU Code</label>
                  <input 
                    type="text"
                    placeholder="SKU-8821"
                    value={newProduct.sku}
                    onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              {/* DUAL PRICING: ORIGINAL COST vs SELLING PRICE */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-blue-50/50 border border-blue-200">
                <div>
                  <label className="block text-slate-900 font-bold mb-1">
                    Original Cost Price (₹)
                  </label>
                  <input 
                    type="number"
                    placeholder="e.g. 120 (Wholesale)"
                    value={newProduct.costPrice}
                    onChange={(e) => setNewProduct({ ...newProduct, costPrice: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none font-semibold"
                  />
                  <span className="text-[10px] text-slate-500">Buying cost per unit</span>
                </div>

                <div>
                  <label className="block text-slate-900 font-bold mb-1">
                    Selling Price / MRP (₹) *
                  </label>
                  <input 
                    type="number"
                    required
                    placeholder="e.g. 160 (Selling)"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-blue-700 focus:outline-none font-bold text-sm"
                  />
                  <span className="text-[10px] text-slate-500">Retail price to customer</span>
                </div>
              </div>

              {/* LIVE PROFIT PREVIEW INDICATOR */}
              {newProduct.price && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-mono text-xs flex justify-between items-center">
                  <span>Unit Profit Preview:</span>
                  <span className="font-extrabold text-emerald-700">
                    +₹{Number(newProduct.price) - Number(newProduct.costPrice || Math.round(newProduct.price * 0.75))} 
                    {' '}({(( (Number(newProduct.price) - Number(newProduct.costPrice || Math.round(newProduct.price * 0.75))) / Number(newProduct.price) ) * 100).toFixed(1)}% margin)
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Initial Stock *</label>
                  <input 
                    type="number"
                    required
                    placeholder="50"
                    value={newProduct.stock}
                    onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Min Threshold</label>
                  <input 
                    type="number"
                    placeholder="15"
                    value={newProduct.minStock}
                    onChange={(e) => setNewProduct({ ...newProduct, minStock: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end space-x-3">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 aira-gradient-btn text-white font-bold rounded-xl shadow-md"
                >
                  Add Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
