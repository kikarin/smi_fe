import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { LoginPage } from '@/pages/Login/LoginPage'
import { DashboardPage } from '@/pages/Dashboard/DashboardPage'
import { ProductsPage } from '@/pages/Products/ProductsPage'
import { CustomersPage } from '@/pages/Customers/CustomersPage'
import { KnowledgePage } from '@/pages/Knowledge/KnowledgePage'
import { LeadsPage } from '@/pages/Leads/LeadsPage'
import { ChatPage } from '@/pages/Chat/ChatPage'
import { QuotationsPage } from '@/pages/Quotations/QuotationsPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="knowledge" element={<KnowledgePage />} />
          <Route path="leads" element={<LeadsPage />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="quotations" element={<QuotationsPage />} />
        </Route>
      </Route>
      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  )
}
