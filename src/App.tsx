
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import Landing from "./pages/Landing";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Pricing from "./pages/Pricing";
import Billing from "./pages/Billing";
import NotFound from "./pages/NotFound";
import Tower from "./pages/Tower";
import TowerUsers from "./pages/TowerUsers";
import TowerBilling from "./pages/TowerBilling";
import TowerAnalytics from "./pages/TowerAnalytics";
import TowerTeam from "./pages/TowerTeam";

const queryClient = new QueryClient();

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-sage-600"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// Admin Protected Route Component
const AdminProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useAdminAuth();
  
  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-sage-600"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

// Public Route Component (redirect to dashboard if already logged in)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-sage-600"></div>
      </div>
    );
  }
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Landing />} />
    
    {/* Tower Admin Routes - PRIMEIRA PRIORIDADE */}
    <Route 
      path="/tower" 
      element={
        <div className="min-h-screen bg-red-100 p-8">
          <h1 className="text-4xl font-bold text-red-900">
            🏗️ TOWER ADMIN AREA
          </h1>
          <p className="text-xl mt-4">
            Esta é a área administrativa - URL /tower funcionando!
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded shadow">
              <h3>Total Usuários</h3>
              <p className="text-2xl font-bold">127</p>
            </div>
            <div className="bg-white p-4 rounded shadow">
              <h3>MRR</h3>
              <p className="text-2xl font-bold">R$ 12.450</p>
            </div>
          </div>
        </div>
      } 
    />
    
    <Route 
      path="/dashboard" 
      element={
        <ProtectedRoute>
          <Index />
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/movimentacoes" 
      element={
        <ProtectedRoute>
          <Index />
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/tower/users" 
      element={
        <AdminProtectedRoute>
          <TowerUsers />
        </AdminProtectedRoute>
      } 
    />
    <Route 
      path="/tower/billing" 
      element={
        <AdminProtectedRoute>
          <TowerBilling />
        </AdminProtectedRoute>
      } 
    />
    <Route 
      path="/tower/analytics" 
      element={
        <AdminProtectedRoute>
          <TowerAnalytics />
        </AdminProtectedRoute>
      } 
    />
    <Route 
      path="/tower/team" 
      element={
        <AdminProtectedRoute>
          <TowerTeam />
        </AdminProtectedRoute>
      } 
    />
    
    <Route 
      path="/login" 
      element={
        <PublicRoute>
          <Auth />
        </PublicRoute>
      } 
    />
    <Route 
      path="/signup" 
      element={
        <PublicRoute>
          <Auth />
        </PublicRoute>
      } 
    />
    <Route path="/pricing" element={<Pricing />} />
    <Route path="/billing" element={<Billing />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
