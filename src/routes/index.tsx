import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { AdminRoute, ProtectedRoute } from '@/routes/ProtectedRoute'
import { LoginPage } from '@/pages/Login/LoginPage'
import { LandingPage } from '@/pages/storefront/LandingPage'
import { DashboardPage } from '@/pages/Dashboard/DashboardPage'
import { ProductsPage } from '@/pages/Products/ProductsPage'
import { CustomersPage } from '@/pages/Customers/CustomersPage'
import { KnowledgePage } from '@/pages/Knowledge/KnowledgePage'
import { LeadsPage } from '@/pages/Leads/LeadsPage'
import { ChatPage } from '@/pages/Chat/ChatPage'
import { QuotationsPage } from '@/pages/Quotations/QuotationsPage'
import { UsersPage } from '@/pages/Users/UsersPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="leads" element={<LeadsPage />} />
          <Route path="quotations" element={<QuotationsPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route element={<AdminRoute />}>
            <Route path="customers" element={<CustomersPage />} />
            <Route path="knowledge" element={<KnowledgePage />} />
            <Route path="chat" element={<ChatPage />} />
            <Route path="users" element={<UsersPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
