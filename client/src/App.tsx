import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { DashboardProvider } from "./contexts/DashboardContext";
import DashboardLayout from "./components/DashboardLayout";
import Donors from "./pages/Donors";
import Trips from "./pages/Trips";
import Initiatives from "./pages/Initiatives";
import Tasks from "./pages/Tasks";
import NotFound from "./pages/NotFound";
import { useAuth } from "./_core/hooks/useAuth";
import { startLogin } from "./const";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) startLogin();
  }, [loading, user]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'oklch(0.965 0.012 80)' }}>
      <Loader2 className="animate-spin w-8 h-8" style={{ color: 'oklch(0.52 0.022 65)' }} />
    </div>
  );
  if (!user) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'oklch(0.965 0.012 80)' }}>
      <p className="text-sm" style={{ color: 'oklch(0.52 0.022 65)' }}>Redirecting to login…</p>
    </div>
  );
  return <DashboardLayout>{children}</DashboardLayout>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <AuthGuard><Donors /></AuthGuard>} />
      <Route path="/trips" component={() => <AuthGuard><Trips /></AuthGuard>} />
      <Route path="/initiatives" component={() => <AuthGuard><Initiatives /></AuthGuard>} />
      <Route path="/tasks" component={() => <AuthGuard><Tasks /></AuthGuard>} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <DashboardProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </DashboardProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
