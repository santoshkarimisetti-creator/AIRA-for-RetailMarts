import axios from 'axios'

const API_BASE = 'http://127.0.0.1:8000/api'

const client = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Universal Product Normalizer
export const normalizeProduct = (p) => {
  if (!p) return p
  const price = Number(p.price) || 0
  const costPrice = Number(p.cost_price !== undefined ? p.cost_price : (p.costPrice !== undefined ? p.costPrice : Math.round(price * 0.75)))
  const unitProfit = Number(p.unit_profit !== undefined ? p.unit_profit : (p.unitProfit !== undefined ? p.unitProfit : (price - costPrice)))
  const unitsSold = Number(p.units_sold !== undefined ? p.units_sold : (p.unitsSold !== undefined ? p.unitsSold : 0))
  const revenue = Number(p.revenue !== undefined ? p.revenue : (unitsSold * price))
  const totalProfit = Number(p.total_profit !== undefined ? p.total_profit : (p.totalProfit !== undefined ? p.totalProfit : (unitsSold * unitProfit)))
  const margin = Number(p.margin !== undefined ? p.margin : (price > 0 ? Number(((unitProfit / price) * 100).toFixed(1)) : 0))
  const roi = Number(p.roi !== undefined ? p.roi : (costPrice > 0 ? Number(((unitProfit / costPrice) * 100).toFixed(1)) : 0))
  const minStock = Number(p.min_stock !== undefined ? p.min_stock : (p.minStock !== undefined ? p.minStock : 15))
  const stock = Number(p.stock !== undefined ? p.stock : 0)

  return {
    ...p,
    price,
    costPrice,
    cost_price: costPrice,
    unitProfit,
    unit_profit: unitProfit,
    unitsSold,
    units_sold: unitsSold,
    revenue,
    totalProfit,
    total_profit: totalProfit,
    margin,
    roi,
    minStock,
    min_stock: minStock,
    stock
  }
}

// Products
export const fetchProducts = async () => {
  const res = await client.get('/products')
  return Array.isArray(res.data) ? res.data.map(normalizeProduct) : []
}

export const createProduct = async (productData) => {
  const payload = {
    ...productData,
    price: Number(productData.price),
    cost_price: Number(productData.costPrice || productData.cost_price || productData.price * 0.75),
    stock: Number(productData.stock || 0),
    min_stock: Number(productData.minStock || productData.min_stock || 15)
  }
  const res = await client.post('/products', payload)
  return normalizeProduct(res.data)
}

export const updateProduct = async (productId, updateData) => {
  const res = await client.put(`/products/${productId}`, updateData)
  return res.data && res.data.product ? { ...res.data, product: normalizeProduct(res.data.product) } : res.data
}

export const deleteProduct = async (productId) => {
  const res = await client.delete(`/products/${productId}`)
  return res.data
}

export const restockProduct = async (productId, quantity = 30) => {
  const res = await client.post(`/products/${productId}/restock`, { quantity: Number(quantity) })
  return res.data && res.data.product ? { ...res.data, product: normalizeProduct(res.data.product) } : res.data
}

export const sellProduct = async (productId, quantity = 1) => {
  const res = await client.post(`/products/${productId}/sell`, { quantity: Number(quantity) })
  return res.data && res.data.product ? { ...res.data, product: normalizeProduct(res.data.product) } : res.data
}

// POS Checkout
export const checkoutPOS = async (items, paymentMethod = 'cash', billingMeta = {}) => {
  const payload = {
    items: items.map(it => ({
      product_id: it.id,
      quantity: Number(it.quantity || 1)
    })),
    payment_method: paymentMethod,
    discount_percent: billingMeta.discountPercent || 0,
    discount_amount: billingMeta.discountAmount || 0,
    tax_amount: billingMeta.taxAmount || 0,
    final_total: billingMeta.finalTotal || 0
  }
  const res = await client.post('/pos/checkout', payload)
  return res.data
}

// Dashboard & Analytics
export const fetchDashboardStats = async () => {
  const res = await client.get('/dashboard/stats')
  return res.data
}

export const fetchSalesAnalytics = async (period = '30d') => {
  const res = await client.get('/analytics/sales', { params: { period } })
  return res.data
}

export const fetchSalesHistory = async (params = {}) => {
  const res = await client.get('/sales/history', { params })
  return res.data
}

// Reports
export const fetchReportsSummary = async () => {
  const res = await client.get('/reports/summary')
  if (res.data && res.data.products) {
    res.data.products = res.data.products.map(normalizeProduct)
  }
  return res.data
}

// Alerts
export const fetchAlerts = async () => {
  const res = await client.get('/alerts')
  return res.data
}

export const markAlertAsRead = async (alertId) => {
  const res = await client.post(`/alerts/${alertId}/read`)
  return res.data
}

export default {
  normalizeProduct,
  fetchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  restockProduct,
  sellProduct,
  checkoutPOS,
  fetchDashboardStats,
  fetchSalesAnalytics,
  fetchSalesHistory,
  fetchReportsSummary,
  fetchAlerts,
  markAlertAsRead
}
