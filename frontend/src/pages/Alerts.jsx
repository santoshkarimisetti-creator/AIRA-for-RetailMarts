import { fetchAlerts, markAlertAsRead } from '../services/api'
import { useEffect } from 'react'
import React, { useState } from 'react'
import { AlertTriangle, TrendingUp, Info, CheckCircle2, X } from 'lucide-react'

export default function Alerts() {

  // Load real alerts from PostgreSQL
  useEffect(() => {
    fetchAlerts().then(dbAlerts => {
      if (dbAlerts && dbAlerts.length > 0) {
        const mapped = dbAlerts.map(a => ({
          id: a.id,
          type: a.type || 'warning',
          icon: a.type === 'critical' ? AlertTriangle : (a.type === 'opportunity' ? TrendingUp : Info),
          color: a.type === 'critical' ? 'text-rose-500 bg-rose-50 border-rose-200' : (a.type === 'opportunity' ? 'text-emerald-500 bg-emerald-50 border-emerald-200' : 'text-amber-500 bg-amber-50 border-amber-200'),
          title: a.title,
          desc: a.desc,
          time: a.time || 'Just now'
        }))
        setAlertList(mapped)
      }
    }).catch(() => {})
  }, [])

  const [alertList, setAlertList] = useState([
    { id: 1, type: 'critical', icon: AlertTriangle, color: 'text-rose-500 bg-rose-50 border-rose-200', title: 'Rice & Cooking Oil Stock Alert', desc: 'Fortune Sunflower Oil is below minimum threshold (4 units remaining). Expected stockout in 2 days.', time: '10 mins ago' },
    { id: 2, type: 'warning', icon: AlertTriangle, color: 'text-amber-500 bg-amber-50 border-amber-200', title: 'Amul Milk Low Stock Warning', desc: 'Amul Taaza Milk has 12 units remaining. Reorder recommendation: 55 units.', time: '1 hour ago' },
    { id: 3, type: 'opportunity', icon: TrendingUp, color: 'text-emerald-500 bg-emerald-50 border-emerald-200', title: 'Cold Drinks Sales Velocity Increase', desc: 'Thums Up 2L sales increased 18% over the past 24 hours.', time: '3 hours ago' },
    { id: 4, type: 'info', icon: Info, color: 'text-blue-500 bg-blue-50 border-blue-200', title: 'Weekly AI Forecast Model Re-Synced', desc: 'LightGBM forecasting model updated with 95% accuracy confidence for October.', time: '5 hours ago' },
  ])

  const dismissAlert = (id) => {
    markAlertAsRead(id).catch(() => {})
    setAlertList(alertList.filter(a => a.id !== id))
  }

  return (
    <div className="space-y-6 animate-fade-in pb-24 dashboard-workspace-bg">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Store Alerts & Notifications</h1>
          <p className="text-xs text-slate-500">Real-time alerts categorized by Critical 🔴, Warning 🟡, Opportunity 🟢, and Info 🔵.</p>
        </div>

        {alertList.length > 0 && (
          <button 
            onClick={() => setAlertList([])}
            className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
          >
            <CheckCircle2 className="w-4 h-4 text-slate-500" />
            <span>Mark All as Read</span>
          </button>
        )}
      </div>

      <div className="space-y-3">
        {alertList.length === 0 ? (
          <div className="p-12 text-center card-light space-y-2 text-slate-500">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <h3 className="font-bold text-slate-900 text-sm">All Alerts Cleared!</h3>
            <p className="text-xs">Your store stock telemetry is healthy and operating within normal parameters.</p>
          </div>
        ) : alertList.map((alert) => (
          <div key={alert.id} className={`p-4 rounded-2xl border ${alert.color} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm`}>
            <div className="flex items-start space-x-3">
              <alert.icon className="w-5 h-5 mt-0.5 shrink-0" />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-sm text-slate-900">{alert.title}</h3>
                  <span className="text-[10px] text-slate-400 font-mono">{alert.time}</span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{alert.desc}</p>
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-3 shrink-0 self-end sm:self-auto">
              {(alert.type === 'critical' || alert.type === 'warning') && (
                <button 
                  onClick={() => window.location.href = '/app/inventory'}
                  className="px-3 py-1.5 rounded-xl aira-gradient-btn text-xs font-bold text-white shadow-xs"
                >
                  Restock Now
                </button>
              )}

              <button onClick={() => dismissAlert(alert.id)} className="text-slate-400 hover:text-slate-700 p-1" title="Dismiss Alert">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
