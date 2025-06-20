import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { getCurrentEmployee, Employee as EmployeeType } from "@/services/supabaseService";
import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import Index from "./pages/Index";
import Login from "./pages/Login";
import History from "./pages/History";
import Admin from "./pages/Admin";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import ResetPasswordPage from './pages/ResetPasswordPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

// AppLayout now correctly uses Layout and Outlet for nested protected routes
const AppLayout = () => (
  <Layout>
    <Outlet />
  </Layout>
);

const ProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-foreground">
        Uygulama Yükleniyor...
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <Outlet />;
};

const AdminRoute = () => {
  const { user, isLoading: authIsLoading, isAuthenticated } = useAuth();
  const [employee, setEmployee] = useState<EmployeeType | null>(null);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);
  
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
      try {
        const employeeData = await getCurrentEmployee(user);
          setEmployee(employeeData);
      } catch (error) {
          console.error('Admin check error:', error);
          setEmployee(null);
        }
      }
        setIsCheckingAdmin(false);
    };
    
    if (!authIsLoading && isAuthenticated) {
      checkAdminStatus();
    } else if (!isAuthenticated && !authIsLoading) {
      setIsCheckingAdmin(false);
    }
  }, [user, authIsLoading, isAuthenticated]);
  
  if (authIsLoading || isCheckingAdmin) {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-foreground">
        Yetki Kontrol Ediliyor...
      </div>
    );
  }
  
  if (!isAuthenticated || !employee || employee.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  
  return <Outlet />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              
              {/* Protected routes are wrapped by AppLayout first, then ProtectedRoute */}
              <Route element={<AppLayout />}> 
                <Route element={<ProtectedRoute />}>
                  <Route path="/" element={<Index />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/history" element={<History />} />
                  {/* Admin routes are further protected by AdminRoute */}
                  <Route path="/admin" element={<AdminRoute />}>
                    <Route index element={<Admin />} /> 
                  </Route>
                </Route>
              </Route>
              
              {/* NotFoundPage uses Layout directly, as it's a top-level catch-all */}
              <Route path="*" element={<Layout><NotFound /></Layout>} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
