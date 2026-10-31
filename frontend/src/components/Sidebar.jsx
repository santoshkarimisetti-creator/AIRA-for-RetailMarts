import { Link, useLocation, useNavigate } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Package, 
  BarChart3, 
  LineChart, 
  BrainCircuit, 
  FileText, 
  BellRing,
  Users,
  Settings, 
  Store,
  DollarSign,
  Barcode,
  Receipt,
  LogOut,
  Languages,
  X
} from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import LanguageSelector from './LanguageSelector'

const navigation = [
  { key: 'nav.dashboard', name: 'Home / Dashboard', href: '/app', icon: LayoutDashboard },
  { key: 'nav.pos', name: 'Barcode / POS Counter', href: '/app/pos', icon: Barcode },
  { key: 'nav.inventory', name: 'Inventory', href: '/app/inventory', icon: Package },
  { key: 'nav.products', name: 'Products', href: '/app/products', icon: DollarSign },
  { key: 'nav.sales', name: 'Sales Analytics', href: '/app/sales', icon: BarChart3 },
  { key: 'nav.salesHistory', name: 'Sales History', href: '/app/sales-history', icon: Receipt },
  { key: 'nav.forecast', name: 'Demand Forecast', href: '/app/forecast', icon: LineChart },
  { key: 'nav.insights', name: 'AI Insights', href: '/app/insights', icon: BrainCircuit },
  { key: 'nav.reports', name: 'Reports', href: '/app/reports', icon: FileText },
  { key: 'nav.alerts', name: 'Alerts', href: '/app/alerts', icon: BellRing },
  { key: 'nav.settings', name: 'Settings', href: '/app/settings', icon: Settings },
]

export default function Sidebar({ isCollapsed, mobileOpen = false, setMobileOpen = () => {} }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useLanguage()
  
  const handleLogout = () => {
    localStorage.removeItem('aira_auth')
    window.location.href = '/login'
  }

  const closeMobile = () => {
    setMobileOpen(false)
  }

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div 
          onClick={closeMobile}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar Drawer */}
      <aside 
        className={`bg-[#07111f] text-white min-h-screen flex flex-col border-r border-slate-800/80 shadow-2xl z-50 fixed inset-y-0 left-0 w-64 max-w-[85vw] lg:static lg:z-30 transition-all duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${
          isCollapsed ? 'lg:w-16' : 'lg:w-64'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 flex items-center justify-between border-b border-slate-800">
          <Link 
            to="/app" 
            onClick={closeMobile}
            className={`flex items-center space-x-3 group overflow-hidden ${isCollapsed ? 'lg:justify-center lg:w-full' : ''}`}
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-400 via-blue-500 to-purple-600 p-0.5 shadow-md shrink-0 group-hover:scale-105 transition-transform">
              <img src="/logo.png" alt="AIRA" className="w-full h-full rounded-[10px] object-cover" />
            </div>
            <div className={`min-w-0 ${isCollapsed ? 'lg:hidden' : 'block'}`}>
              <span className="text-xl font-extrabold tracking-wider aira-gradient-text block truncate">AIRA</span>
              <p className="text-[9px] text-slate-400 font-mono uppercase tracking-widest truncate">Retail Command</p>
            </div>
          </Link>

          {/* Close button for mobile screens */}
          <button 
            type="button"
            onClick={closeMobile}
            className="lg:hidden p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close Sidebar Menu"
            aria-label="Close Sidebar Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Section Subheading */}
        <div className={`px-5 pt-4 pb-1 ${isCollapsed ? 'lg:hidden' : 'block'}`}>
          <p className="text-[9px] text-slate-400 font-mono uppercase tracking-widest">MAIN NAVIGATION</p>
        </div>
        
        {/* Navigation List */}
        <nav className="flex-1 px-2.5 space-y-1 overflow-y-auto py-2">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href || (item.href === '/app/products' && location.pathname === '/app/product-stats')
            const translatedName = t(item.key, item.name)
            return (
              <Link
                key={item.key}
                to={item.href}
                onClick={closeMobile}
                title={isCollapsed ? translatedName : undefined}
                className={`flex items-center rounded-xl text-xs font-medium transition-all duration-200 ${
                  isCollapsed ? 'lg:justify-center lg:p-3 p-3 space-x-3' : 'px-3.5 py-2.5 space-x-3'
                } ${
                  isActive 
                    ? 'aira-gradient-bg text-white font-semibold shadow-md' 
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <item.icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className={`truncate ${isCollapsed ? 'lg:hidden' : 'inline'}`}>{translatedName}</span>
              </Link>
            )
          })}
        </nav>
        
        {/* Footer Area with Language Switcher & Logout */}
        <div className="p-3 border-t border-slate-800/80 space-y-2">
          <div className={`mb-1 ${isCollapsed ? 'lg:hidden' : 'block'}`}>
            <LanguageSelector variant="sidebar" />
          </div>

          <button
            onClick={() => {
              closeMobile()
              handleLogout()
            }}
            title={isCollapsed ? t('nav.logout', 'Log Out') : undefined}
            className={`w-full flex items-center rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors ${
              isCollapsed ? 'lg:justify-center lg:p-3 px-3.5 py-2.5 space-x-3 border border-rose-500/20' : 'px-3.5 py-2.5 space-x-3 border border-rose-500/20'
            }`}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span className={`${isCollapsed ? 'lg:hidden' : 'inline'}`}>{t('nav.logout', 'Log Out')}</span>
          </button>

          {/* Live System Indicator */}
          <div className={`px-3.5 py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-[10px] items-center justify-between text-slate-400 ${isCollapsed ? 'hidden lg:hidden' : 'flex'}`}>
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>AIRA Retail OS</span>
            </span>
            <span className="text-cyan-400 font-mono font-bold">v3.2</span>
          </div>
        </div>
      </aside>
    </>
  )
}
