import { Link } from 'react-router-dom'
import { Bell, Sparkles, ChevronRight, ChevronLeft, Maximize2, Minimize2, Menu, Receipt } from 'lucide-react'
import { storeInfo } from '../utils/demoData'
import { useState } from 'react'
import { useLanguage } from '../context/LanguageContext'
import LanguageSelector from './LanguageSelector'

export default function Navbar({ isCollapsed, setIsCollapsed, mobileOpen = false, setMobileOpen = () => {} }) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const { t } = useLanguage()

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
        setIsFullscreen(false)
      }
    }
  }

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-3 sm:px-6 sticky top-0 z-30 shadow-xs">
      {/* Sidebar Arrow Toggle & Store Identity */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Mobile Hamburger Drawer Trigger */}
        <button 
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-xl text-slate-700 hover:text-blue-600 hover:bg-slate-100 transition-colors border border-slate-200 lg:hidden flex items-center justify-center shrink-0"
          title="Open Navigation Menu"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Desktop Collapse Arrow Button */}
        <button 
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-colors border border-slate-200 hidden lg:flex items-center space-x-1 shrink-0"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight className="w-5 h-5 text-blue-600" /> : <ChevronLeft className="w-5 h-5 text-slate-500" />}
        </button>

        {/* Store Logo & Branding */}
        <div className="flex items-center space-x-2 sm:space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-400 to-purple-600 p-0.5 shadow-sm shrink-0">
            <img src="/logo.png" alt="Store Logo" className="w-full h-full rounded-[6px] object-cover" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-bold text-slate-900 leading-none truncate max-w-[160px] md:max-w-none">{storeInfo.name}</h1>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">{storeInfo.category} • {storeInfo.city}</p>
          </div>
        </div>
      </div>
      
      {/* Actions & Language Selector & Fullscreen & AI Quick Button */}
      <div className="flex items-center space-x-1.5 sm:space-x-2.5 shrink-0">
        {/* Sales History Navbar Button */}
        <Link 
          to="/app/sales-history" 
          className="px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:text-blue-600 hover:bg-blue-50/60 font-bold text-xs flex items-center space-x-1.5 transition-colors shadow-2xs"
          title="Sales Transaction History"
        >
          <Receipt className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="hidden md:inline">Sales History</span>
        </Link>

        {/* Multilingual Indian Language Selector */}
        <LanguageSelector variant="navbar" />

        {/* Fullscreen Workspace Toggle */}
        <button 
          onClick={toggleFullscreen}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-slate-200 hidden md:block"
          title={t('nav.fullScreen', 'Toggle Fullscreen Workspace')}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4 text-blue-600" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        {/* Ask AIRA Quick CTA Button */}
        <button 
          onClick={() => {
            const el = document.getElementById('aira-fab-trigger')
            if (el) el.click()
          }}
          className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:opacity-95 text-white px-2.5 sm:px-3.5 py-1.5 text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-sm transition-all"
          title="Open AIRA Voice Assistant"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-300 animate-pulse shrink-0" />
          <span className="hidden sm:inline">Ask AIRA</span>
          <span className="sm:hidden text-[11px]">AIRA</span>
        </button>

        <a href="/app/alerts" className="relative p-1.5 sm:p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors">
          <Bell className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
          <span className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 block h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white"></span>
        </a>

        {/* Profile */}
        <div className="flex items-center">
          <div className="w-7 h-7 sm:w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-400 to-purple-600 p-0.5 shadow-sm">
            <img src="/logo.png" alt="Profile" className="w-full h-full rounded-full object-cover" />
          </div>
        </div>
      </div>
    </header>
  )
}
