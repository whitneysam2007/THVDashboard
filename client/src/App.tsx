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
import TeamAccess from "./pages/TeamAccess";
import PortfolioDonors from "./pages/PortfolioDonors";
import ThankYouTracker from "./pages/ThankYouTracker";
import NotFound from "./pages/NotFound";
import { useAuth } from "./_core/hooks/useAuth";
import Login from './pages/Login';
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { trpc } from "./lib/trpc";
import { dashboardAccessGranted } from "./lib/accessGate";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const [accessRevoked, setAccessRevoked] = useState(false);
  const accessQuery = trpc.auth.me.useQuery(undefined, { enabled: Boolean(user), retry: false });
  const accessGranted = dashboardAccessGranted(user, accessQuery.data);

  useEffect(() => {
    if (user && accessQuery.isSuccess && !accessGranted) {
      setAccessRevoked(true);
      void logout();
    }
  }, [accessGranted, accessQuery.isSuccess, logout, user]);

  if (loading || (Boolean(user) && accessQuery.isLoading)) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'oklch(0.965 0.012 80)' }}>
      <Loader2 className="animate-spin w-8 h-8" style={{ color: 'oklch(0.52 0.022 65)' }} />
    </div>
  );
  if (!user) return <Login accessRevoked={accessRevoked} />;
  if (accessQuery.isError) return <Login accessRevoked />;
  if (!accessGranted) return <Login accessRevoked />;
  return <DashboardLayout>{children}</DashboardLayout>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <AuthGuard><Donors /></AuthGuard>} />
      <Route path="/donors-500-5k" component={() => <AuthGuard><PortfolioDonors portfolio="donors-500-5k" /></AuthGuard>} />
      <Route path="/monthly-giving" component={() => <AuthGuard><PortfolioDonors portfolio="monthly-giving" /></AuthGuard>} />
      <Route path="/thank-you-tracker" component={() => <AuthGuard><ThankYouTracker /></AuthGuard>} />
      <Route path="/trips" component={() => <AuthGuard><Trips /></AuthGuard>} />
      <Route path="/initiatives" component={() => <AuthGuard><Initiatives /></AuthGuard>} />
      <Route path="/tasks" component={() => <AuthGuard><Tasks /></AuthGuard>} />
      <Route path="/team-access" component={() => <AuthGuard><TeamAccess /></AuthGuard>} />
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
