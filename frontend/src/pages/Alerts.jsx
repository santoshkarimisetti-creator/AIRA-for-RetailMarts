import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchAlerts, markAlertAsRead } from '../services/api'
import { 
  AlertTriangle, 
  TrendingUp, 
  Info, 
  CheckCircle2, 
  X, 
  RefreshCw,
  Bell,
  ArrowRight,
  ShieldCheck
} from 'lucide-react'

export default function Alerts() {
  const navigate = useNavigate()
  const [alertList, setAlertList] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('all')

  const loadAlerts = async () => {
    setIsLoading(true)
    try {
      const dbAlerts = await fetchAlerts()
      if (Array.isArray(dbAlerts)) {
        const mapped = dbAlerts.map(a => ({
          id: a.id,
          productId: a.productId,
          type: a.type || 'warning',
          priority: a.priority || 'Medium Priority',
          title: a.title,
          desc: a.desc || a.title,
          time: a.time || 'Just now',
          category: a.category || 'Grocery'
        }))
        setAlertList(mapped)
      } else {
        setAlertList([])
      }
    } catch (err) {
      console.error('Failed to load store alerts:', err)
      setAlertList([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAlerts()
  }, [])

  const dismissAlert = (id) => {
    markAlertAsRead(id).catch(() => {})
    setAlertList(prev => prev.filter(a => a.id !== id))
  }

  const markAllRead = () => {
    alertList.forEach(a => markAlertAsRead(a.id).catch(() => {}))
    setAlertList([])
  }

  const filteredAlerts = alertList.filter(a => {
    if (activeFilter === 'all') return true
    return a.type === activeFilter
  })

  const criticalCount = alertList.filter(a => a.type === 'critical').length
  const warningCount = alertList.filter(a => a.type === 'warning').length
  const opportunityCount = alertList.filter(a => a.type === 'opportunity').length

  return (
    <div className="space-y-6 animate-fade-in pb-24 dashboard-workspace-bg">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <span>Store Alerts & Notifications</span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-blue-100 text-blue-700">
              LIVE POSTGRESQL
            </span>
          </h1>
          <p className="text-xs text-slate-500">
            Real-time threshold notifications for out-of-stock items, buffer depletion, and high demand surges.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button 
            onClick={loadAlerts}
            disabled={isLoading}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
            title="Refresh Alerts"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
          </button>

          {alertList.length > 0 && (
            <button 
              onClick={markAllRead}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Mark All Read</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none text-xs font-semibold">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-3.5 py-1.5 rounded-xl transition-colors ${
            activeFilter === 'all' ? 'bg-slate-900 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          All ({alertList.length})
        </button>
        <button
          onClick={() => setActiveFilter('critical')}
          className={`px-3.5 py-1.5 rounded-xl transition-colors flex items-center space-x-1.5 ${
            activeFilter === 'critical' ? 'bg-rose-600 text-white shadow-xs' : 'bg-white border border-slate-200 text-rose-700 hover:bg-rose-50'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
          <span>Critical ({criticalCount})</span>
        </button>
        <button
          onClick={() => setActiveFilter('warning')}
          className={`px-3.5 py-1.5 rounded-xl transition-colors flex items-center space-x-1.5 ${
            activeFilter === 'warning' ? 'bg-amber-600 text-white shadow-xs' : 'bg-white border border-slate-200 text-amber-700 hover:bg-amber-50'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          <span>Warnings ({warningCount})</span>
        </button>
        <button
          onClick={() => setActiveFilter('opportunity')}
          className={`px-3.5 py-1.5 rounded-xl transition-colors flex items-center space-x-1.5 ${
            activeFilter === 'opportunity' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white border border-slate-200 text-emerald-700 hover:bg-emerald-50'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Opportunities ({opportunityCount})</span>
        </button>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="p-4 rounded-2xl card-light animate-pulse flex justify-between items-center">
                <div className="space-y-2 w-3/4">
                  <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                  <div className="h-3 bg-slate-100 rounded w-2/3"></div>
                </div>
                <div className="w-6 h-6 bg-slate-200 rounded-full"></div>
              </div>
            ))}
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="p-12 text-center card-light space-y-2 text-slate-500">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <h3 className="text-sm font-bold text-slate-900">Zero Unresolved Alerts</h3>
            <p className="text-xs text-slate-500">
              {activeFilter === 'all' 
                ? 'All store inventory levels and operational thresholds are currently within safe limits.'
                : `No active ${activeFilter} alerts found.`}
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const isCritical = alert.type === 'critical'
            const isOpportunity = alert.type === 'opportunity'

            const badgeBg = isCritical ? 'bg-rose-50 text-rose-700 border-rose-200' : isOpportunity ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
            const Icon = isCritical ? AlertTriangle : isOpportunity ? TrendingUp : Info

            return (
              <div 
                key={alert.id} 
                className={`p-4 sm:p-5 rounded-2xl card-light flex items-start justify-between gap-4 border transition-all hover:border-slate-300 ${
                  isCritical ? 'border-rose-200/80 bg-rose-50/20' : ''
                }`}
              >
                <div className="flex items-start space-x-3.5">
                  <div className={`p-2 rounded-xl shrink-0 border ${badgeBg}`}>
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900">{alert.title}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeBg}`}>
                        {alert.priority}
                      </span>
                      {alert.category && (
                        <span className="text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md font-mono">
                          {alert.category}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">{alert.desc}</p>
                    <span className="text-[10px] text-slate-400 block pt-0.5 font-mono">{alert.time}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  {alert.productId && (
                    <button 
                      onClick={() => navigate('/app/inventory')}
                      className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-semibold hidden sm:flex items-center space-x-1 transition-colors"
                    >
                      <span>Restock</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                  <button 
                    onClick={() => dismissAlert(alert.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    title="Dismiss alert"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
