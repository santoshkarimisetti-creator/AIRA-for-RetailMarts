import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Navbar from './Navbar'
import FloatingAssistant from './FloatingAssistant'

export default function Layout() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  // Automatically close mobile navigation drawer when changing routes
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  return (
    <div className="flex h-screen overflow-hidden bg-[#07111f] text-slate-100">
      <Sidebar 
        isCollapsed={isCollapsed} 
        setIsCollapsed={setIsCollapsed} 
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative min-w-0">
        <Navbar 
          isCollapsed={isCollapsed} 
          setIsCollapsed={setIsCollapsed} 
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
        />
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6 lg:p-8 relative z-10 dashboard-workspace-bg">
          <Outlet />
        </main>
      </div>
      <FloatingAssistant />
    </div>
  )
}
