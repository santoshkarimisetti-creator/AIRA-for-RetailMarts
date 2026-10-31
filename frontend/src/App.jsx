import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'

import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import StoreHealth from './pages/StoreHealth'
import SalesAnalytics from './pages/SalesAnalytics'
import SalesHistory from './pages/SalesHistory'
import DemandForecast from './pages/DemandForecast'
import AIInsights from './pages/AIInsights'
import Reports from './pages/Reports'
import Alerts from './pages/Alerts'
import ProductStats from './pages/ProductStats'
import POSCheckout from './pages/POSCheckout'
import DataImport from './pages/DataImport'
import Settings from './pages/Settings'
import LandingPage from './pages/LandingPage'
import Login from './pages/Login'
import Register from './pages/Register'
import OnboardingWizard from './pages/OnboardingWizard'

const isAuthenticated = () => {
  return localStorage.getItem('aira_auth') === 'true'
}

const ProtectedRoute = ({ children }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }
  return children
}

const PublicRoute = ({ children }) => {
  if (isAuthenticated()) {
    return <Navigate to="/app" replace />
  }
  return children
}

const NotFound = () => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 space-y-4">
    <h2 className="text-3xl font-bold text-slate-900">404 — Page Not Found</h2>
    <p className="text-slate-500 text-xs">The requested page route does not exist.</p>
    <a href="/app" className="aira-gradient-btn px-4 py-2 text-xs">
      Return to Dashboard
    </a>
  </div>
)

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes (Accessible without login; redirect to /app if already authenticated) */}
        <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />
        <Route path="/landing" element={<PublicRoute><LandingPage /></PublicRoute>} />
        <Route path="/onboarding" element={<PublicRoute><OnboardingWizard /></PublicRoute>} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        
        {/* Protected Command Center Workspace Routes (Require Login) */}
        <Route path="/app" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="pos" element={<POSCheckout />} />
          <Route path="barcode" element={<POSCheckout />} />
          <Route path="health" element={<StoreHealth />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="products" element={<ProductStats />} />
          <Route path="product-stats" element={<ProductStats />} />
          <Route path="sales" element={<SalesAnalytics />} />
          <Route path="sales-history" element={<SalesHistory />} />
          <Route path="forecast" element={<DemandForecast />} />
          <Route path="insights" element={<AIInsights />} />
          <Route path="reports" element={<Reports />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="import" element={<DataImport />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
