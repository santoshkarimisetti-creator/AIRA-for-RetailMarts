import { fetchProducts } from '../services/api'
import { useEffect } from 'react'
import React, { useState } from 'react'
import { products as initialProducts } from '../utils/demoData'
import { getUserProducts, saveUserProducts } from '../utils/userStore'
import { 
  Search, 
  Download, 
  DollarSign, 
  TrendingUp, 
  ArrowUpDown, 
  Tag, 
  Award, 
  Sparkles, 
  Filter, 
  Package, 
  PieChart,
  Edit3,
  X
} from 'lucide-react'

export default function ProductStats() {
  const [productList, setProductList] = useState(() => getUserProducts())

  useEffect(() => {
    fetchProducts().then(prods => {
      if (prods && prods.length > 0) setProductList(prods)
    }).catch(() => {})
  }, [])

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [sortBy, setSortBy] = useState('profit-high')

  // Edit Price Modal State
  const [showEditPriceModal, setShowEditPriceModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [editPriceForm, setEditPriceForm] = useState({
    price: '',
    costPrice: ''
  })

  const updateAndSaveProducts = (newList) => {
    setProductList(newList)
    saveUserProducts(newList)
  }

  // Calculate product financial metrics
  const processedProducts = productList.map(p => {
    const price = Number(p.price) || 0
    const cost = Number(p.costPrice !== undefined && p.costPrice !== null ? p.costPrice : (p.cost_price !== undefined && p.cost_price !== null ? p.cost_price : Math.round(price * 0.75)))
    const unitProfit = Number(p.unitProfit !== undefined && p.unitProfit !== null ? p.unitProfit : (p.unit_profit !== undefined && p.unit_profit !== null ? p.unit_profit : (price - cost)))
    const unitsSold = Number(p.unitsSold !== undefined && p.unitsSold !== null ? p.unitsSold : (p.units_sold !== undefined && p.units_sold !== null ? p.units_sold : 0))
    const totalRevenue = Number(p.revenue !== undefined && p.revenue !== null ? p.revenue : (unitsSold * price))
    const totalProfit = Number(p.totalProfit !== undefined && p.totalProfit !== null ? p.totalProfit : (p.total_profit !== undefined && p.total_profit !== null ? p.total_profit : (unitsSold * unitProfit)))
    const margin = price > 0 ? Number(((unitProfit / price) * 100).toFixed(1)) : 0
    const roi = cost > 0 ? Number(((unitProfit / cost) * 100).toFixed(1)) : 0

    let ratingBadge = { label: 'Steady Profit', color: 'bg-blue-100 text-blue-700 border-blue-200' }
    if (totalProfit > 50000) {
      ratingBadge = { label: '🏆 Star Performer', color: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold' }
    } else if (margin >= 25) {
      ratingBadge = { label: '💎 High Margin', color: 'bg-purple-100 text-purple-800 border-purple-300' }
    } else if (unitsSold >= 1000) {
      ratingBadge = { label: '⚡ High Volume', color: 'bg-cyan-100 text-cyan-800 border-cyan-300' }
    }

    return {
      ...p,
      costPrice: cost,
      price,
      unitProfit,
      unitsSold,
      totalRevenue,
      totalProfit,
      margin,
      roi,
      ratingBadge
    }
  })

  // Filtering & Sorting
  const filteredProducts = processedProducts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory
    return matchesSearch && matchesCategory
  }).sort((a, b) => {
    if (sortBy === 'profit-high') return b.totalProfit - a.totalProfit
    if (sortBy === 'profit-low') return a.totalProfit - b.totalProfit
    if (sortBy === 'margin-high') return b.margin - a.margin
    if (sortBy === 'revenue-high') return b.totalRevenue - a.totalRevenue
    if (sortBy === 'units-high') return b.unitsSold - a.unitsSold
    if (sortBy === 'cost-high') return b.costPrice - a.costPrice
    if (sortBy === 'price-high') return b.price - a.price
    return 0
  })

  // Store financial summary metrics
  const totalStoreRevenue = processedProducts.reduce((acc, p) => acc + p.totalRevenue, 0)
  const totalStoreCost = processedProducts.reduce((acc, p) => acc + (p.costPrice * p.unitsSold), 0)
  const totalStoreProfit = processedProducts.reduce((acc, p) => acc + p.totalProfit, 0)
  const avgStoreMargin = totalStoreRevenue > 0 ? ((totalStoreProfit / totalStoreRevenue) * 100).toFixed(1) : 0
  const topProduct = [...processedProducts].sort((a, b) => b.totalProfit - a.totalProfit)[0]

  // Export CSV Functionality
  const exportCSV = () => {
    const headers = ["Product Name", "SKU", "Category", "Original Cost (₹)", "Sold Price (₹)", "Profit per Unit (₹)", "Units Sold", "Total Revenue (₹)", "Total Profit (₹)", "Margin (%)", "ROI (%)"]
    const rows = filteredProducts.map(p => [
      `"${p.name}"`,
      p.sku,
      p.category,
      p.costPrice,
      p.price,
      p.unitProfit,
      p.unitsSold,
      p.totalRevenue,
      p.totalProfit,
      `${p.margin}%`,
      `${p.roi}%`
    ])

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `AIRA_Product_Profit_Statistics_${new Date().toISOString().slice(0,10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Open Edit Price Modal
  const openEditPriceModal = (prod) => {
    setEditingProduct(prod)
    setEditPriceForm({
      price: prod.price || '',
      costPrice: prod.costPrice || Math.round((prod.price || 0) * 0.75)
    })
    setShowEditPriceModal(true)
  }

  // Save Changed Price
  const handleSavePriceEdit = (e) => {
    e.preventDefault()
    if (!editingProduct || !editPriceForm.price) return

    const newPrice = Number(editPriceForm.price) || 0
    const newCostPrice = Number(editPriceForm.costPrice) || Math.round(newPrice * 0.75)
    const newUnitProfit = newPrice - newCostPrice
    const newMargin = newPrice > 0 ? Number(((newUnitProfit / newPrice) * 100).toFixed(1)) : 0
    const newRoi = newCostPrice > 0 ? Number(((newUnitProfit / newCostPrice) * 100).toFixed(1)) : 0

    const updated = productList.map(p => {
      if (p.id === editingProduct.id) {
        const unitsSold = p.unitsSold || 0
        return {
          ...p,
          price: newPrice,
          costPrice: newCostPrice,
          unitProfit: newUnitProfit,
          margin: newMargin,
          roi: newRoi,
          revenue: unitsSold * newPrice,
          totalProfit: unitsSold * newUnitProfit
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
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
            <span>Product Profitability & Price Manager</span>
          </h1>
          <p className="text-xs text-slate-500">Comprehensive breakdown of original buying cost, retail selling price, unit profit, profit margins, and price management.</p>
        </div>

        <button 
          onClick={exportCSV}
          className="aira-gradient-btn px-4 py-2.5 text-xs font-bold flex items-center space-x-2 shadow-md hover:scale-105 transition-transform"
        >
          <Download className="w-4 h-4" />
          <span>Export Financial Report CSV</span>
        </button>
      </div>

      {/* Top Financial KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Total Store Revenue */}
        <div className="p-4 rounded-2xl card-light space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">Total Sales Revenue</span>
            <div className="p-2 rounded-xl icon-3d bg-blue-100 text-blue-600"><TrendingUp className="w-4 h-4" /></div>
          </div>
          <div className="text-xl font-extrabold text-slate-900">₹{totalStoreRevenue.toLocaleString('en-IN')}</div>
          <div className="text-[10px] text-emerald-600 font-semibold">Gross customer payments</div>
        </div>

        {/* Card 2: Total Cost of Goods */}
        <div className="p-4 rounded-2xl card-light space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">Original Wholesale Cost</span>
            <div className="p-2 rounded-xl icon-3d bg-slate-100 text-slate-600"><Package className="w-4 h-4" /></div>
          </div>
          <div className="text-xl font-extrabold text-slate-900">₹{totalStoreCost.toLocaleString('en-IN')}</div>
          <div className="text-[10px] text-slate-500 font-medium">Cost of Goods Sold (COGS)</div>
        </div>

        {/* Card 3: Total Net Profit */}
        <div className="p-4 rounded-2xl card-light space-y-1 border-2 border-emerald-200 bg-emerald-50/50">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-emerald-700 font-bold">Total Net Profit</span>
            <div className="p-2 rounded-xl icon-3d bg-emerald-100 text-emerald-600"><DollarSign className="w-4 h-4" /></div>
          </div>
          <div className="text-xl font-extrabold text-emerald-900">₹{totalStoreProfit.toLocaleString('en-IN')}</div>
          <div className="text-[10px] text-emerald-700 font-bold">+18.4% vs wholesale cost</div>
        </div>

        {/* Card 4: Avg Margin */}
        <div className="p-4 rounded-2xl card-light space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">Average Profit Margin</span>
            <div className="p-2 rounded-xl icon-3d bg-purple-100 text-purple-600"><PieChart className="w-4 h-4" /></div>
          </div>
          <div className="text-xl font-extrabold text-slate-900">{avgStoreMargin}%</div>
          <div className="text-[10px] text-purple-600 font-medium">Storewide average</div>
        </div>

        {/* Card 5: Top Star Performer */}
        <div className="p-4 rounded-2xl card-light space-y-1 bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-200">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-amber-700 font-bold">Top Profit Performer</span>
            <div className="p-2 rounded-xl icon-3d bg-amber-100 text-amber-600"><Award className="w-4 h-4" /></div>
          </div>
          <div className="text-xs font-bold text-slate-900 truncate">{topProduct?.name || 'Basmati Rice'}</div>
          <div className="text-xs font-extrabold text-amber-700">₹{topProduct?.totalProfit.toLocaleString('en-IN')} Profit</div>
        </div>
      </div>

      {/* Filter and Controls Toolbar */}
      <div className="p-4 rounded-2xl card-light flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input 
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by product name or SKU code..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full md:w-auto text-xs">
          <select 
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none flex-1 sm:flex-initial"
          >
            <option value="All">All Categories</option>
            <option value="Grocery">Grocery</option>
            <option value="Dairy">Dairy</option>
            <option value="Snacks">Snacks</option>
            <option value="Beverages">Beverages</option>
            <option value="Personal Care">Personal Care</option>
            <option value="Household">Household</option>
            <option value="Cosmetics">Cosmetics</option>
            <option value="Bakery">Bakery</option>
          </select>

          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none flex-1 sm:flex-initial"
          >
            <option value="profit-high">Sort: Total Profit (High → Low)</option>
            <option value="profit-low">Sort: Total Profit (Low → High)</option>
            <option value="margin-high">Sort: Profit Margin % (High → Low)</option>
            <option value="revenue-high">Sort: Total Revenue (High → Low)</option>
            <option value="units-high">Sort: Units Sold (High → Low)</option>
            <option value="cost-high">Sort: Original Cost (High → Low)</option>
            <option value="price-high">Sort: Selling Price (High → Low)</option>
          </select>
        </div>
      </div>

      {/* Main Product Financial Statistics Table */}
      <div className="p-4 sm:p-6 rounded-2xl card-light overflow-hidden space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-100 gap-1">
          <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <span>Product Profit & Margin Ledger</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-100 text-blue-700 font-mono">
              {filteredProducts.length} Items Shown
            </span>
          </h3>
          <span className="text-[10px] text-slate-400 font-mono">All amounts in Indian Rupees (₹)</span>
        </div>

        <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-mono text-[10px] uppercase border-b border-slate-200 whitespace-nowrap">
                <th className="p-3">Product Name & SKU</th>
                <th className="p-3">Category</th>
                <th className="p-3 text-right">Original Cost</th>
                <th className="p-3 text-right">Sold Price</th>
                <th className="p-3 text-right">Unit Profit</th>
                <th className="p-3 text-center">Units Sold</th>
                <th className="p-3 text-right">Total Revenue</th>
                <th className="p-3 text-right">Total Net Profit</th>
                <th className="p-3 text-center">Profit Margin</th>
                <th className="p-3 text-center">ROI %</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80 transition-colors whitespace-nowrap">
                  {/* Product Info */}
                  <td className="p-3">
                    <div className="flex items-center space-x-3">
                      <img src={p.image} alt={p.name} className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0" />
                      <div>
                        <div className="font-bold text-slate-900">{p.name}</div>
                        <div className="text-[10px] font-mono text-slate-400">{p.sku}</div>
                      </div>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-medium">
                      {p.category}
                    </span>
                  </td>

                  {/* Original Cost */}
                  <td className="p-3 text-right font-mono font-semibold text-slate-600">
                    ₹{p.costPrice}
                  </td>

                  {/* Selling Price */}
                  <td className="p-3 text-right font-mono font-bold text-slate-900">
                    ₹{p.price}
                  </td>

                  {/* Profit Per Unit */}
                  <td className="p-3 text-right font-mono font-bold text-emerald-600">
                    +₹{p.unitProfit}
                  </td>

                  {/* Units Sold */}
                  <td className="p-3 text-center font-mono font-medium text-slate-700">
                    {p.unitsSold.toLocaleString('en-IN')}
                  </td>

                  {/* Total Revenue */}
                  <td className="p-3 text-right font-mono font-bold text-blue-700">
                    ₹{p.totalRevenue.toLocaleString('en-IN')}
                  </td>

                  {/* Total Net Profit */}
                  <td className="p-3 text-right font-mono font-extrabold text-emerald-700 bg-emerald-50/30">
                    ₹{p.totalProfit.toLocaleString('en-IN')}
                  </td>

                  {/* Margin % */}
                  <td className="p-3 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-purple-100 text-purple-700">
                      {p.margin}%
                    </span>
                  </td>

                  {/* ROI % */}
                  <td className="p-3 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-cyan-100 text-cyan-800">
                      +{p.roi}%
                    </span>
                  </td>

                  {/* Action / Change Price */}
                  <td className="p-3 text-center">
                    <button 
                      onClick={() => openEditPriceModal(p)}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 text-[10px] font-bold inline-flex items-center space-x-1 transition-colors"
                      title="Change Price"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit Price</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* RETAILER EDIT PRICE MODAL */}
      {showEditPriceModal && editingProduct && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
                <Edit3 className="w-4 h-4 text-blue-600" />
                <span>Edit Price: {editingProduct.name}</span>
              </h3>
              <button onClick={() => setShowEditPriceModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePriceEdit} className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900">{editingProduct.name}</div>
                <div className="text-[10px] text-slate-500 font-mono">SKU: {editingProduct.sku} • Category: {editingProduct.category}</div>
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
                  Save Updated Price
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
