import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider }         from './context/AuthContext';
import { BudgetProvider }       from './context/BudgetContext';
import { NotificationProvider } from './context/NotificationContext';
import { ThemeProvider }        from './context/ThemeContext';
import LoginPage          from './pages/LoginPage';
import RegisterPage       from './pages/RegisterPage';
import DashboardPage      from './pages/DashboardPage';
import TransactionsPage   from './pages/TransactionsPage';
import BudgetPage         from './pages/BudgetPage';
import InsightsPage       from './pages/InsightsPage';
import ReportsPage        from './pages/ReportsPage';
import GoalsPage          from './pages/GoalsPage';
import HealthScorePage    from './pages/HealthScorePage';
import ForecastPage       from './pages/ForecastPage';
import SubscriptionsPage  from './pages/SubscriptionsPage';
import AIChatPage         from './pages/AIChatPage';
import LandingPage        from './pages/LandingPage';
import NotFoundPage       from './pages/NotFoundPage';
import AppLayout          from './components/layout/AppLayout';
import ProtectedRoute     from './components/common/ProtectedRoute';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <BudgetProvider>
            <Router>
              <Routes>
                {/* Public */}
                <Route path="/login"    element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/"         element={<LandingPage />} />

                {/* Protected — wrapped in layout */}
                <Route element={<ProtectedRoute />}>
                  <Route element={<AppLayout />}>
                    {/* Core */}
                    <Route path="/dashboard"    element={<DashboardPage />} />
                    <Route path="/transactions" element={<TransactionsPage />} />
                    {/* Planning */}
                    <Route path="/budget"       element={<BudgetPage />} />
                    <Route path="/insights"     element={<InsightsPage />} />
                    <Route path="/reports"      element={<ReportsPage />} />
                    <Route path="/goals"        element={<GoalsPage />} />
                    {/* Advanced */}
                    <Route path="/health"       element={<HealthScorePage />} />
                    <Route path="/forecast"     element={<ForecastPage />} />
                    <Route path="/subscriptions" element={<SubscriptionsPage />} />
                    <Route path="/ai-advisor"   element={<AIChatPage />} />
                    {/* Default */}
                  </Route>
                </Route>

                <Route path="/unauthorized" element={<NotFoundPage />} />
                <Route path="*"             element={<NotFoundPage />} />
              </Routes>
            </Router>

            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-md)',
                },
                success: { iconTheme: { primary: 'var(--color-income)',  secondary: 'var(--bg-secondary)' } },
                error:   { iconTheme: { primary: 'var(--color-expense)', secondary: 'var(--bg-secondary)' } },
              }}
            />
          </BudgetProvider>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
