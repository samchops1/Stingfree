import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { BottomNav } from "@/components/ui/bottom-nav";
import { FAB } from "@/components/ui/fab";
import { LandingPage } from "@/components/landing-page";
import { ManagerDashboard } from "@/components/manager/dashboard";
import { StaffManagement } from "@/components/manager/staff-management";
import { StaffDashboard } from "@/components/staff/dashboard";
import { TrainingModuleViewer } from "@/components/training-module-viewer";
import { IncidentReportForm } from "@/components/incident-report-form";
import { AlertsPage } from "@/components/alerts-page";
import { AccountPage } from "@/components/account-page";
import { VenueOnboarding } from "@/components/venue-onboarding";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import NotFound from "@/pages/not-found";
import { 
  LayoutDashboard, 
  Users, 
  AlertTriangle, 
  UserCircle,
  BookOpen,
  ShieldCheck,
  FileText,
  AlertCircle
} from "lucide-react";
import { useLocation } from "wouter";

// Manager navigation items
const managerNavItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard, activeIcon: LayoutDashboard },
  { path: "/staff", label: "Staff", icon: Users, activeIcon: Users },
  { path: "/alerts", label: "Alerts", icon: AlertTriangle, activeIcon: AlertCircle },
  { path: "/account", label: "Account", icon: UserCircle, activeIcon: UserCircle },
];

// Staff navigation items
const staffNavItems = [
  { path: "/status", label: "My Status", icon: ShieldCheck, activeIcon: ShieldCheck },
  { path: "/training", label: "Training", icon: BookOpen, activeIcon: BookOpen },
  { path: "/report", label: "Report", icon: FileText, activeIcon: FileText },
  { path: "/account", label: "Account", icon: UserCircle, activeIcon: UserCircle },
];

function Router() {
  const { user, isLoading, isAuthenticated, isManager, isStaff } = useAuth();
  const [location, navigate] = useLocation();

  // Show landing page while loading auth state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 border border-primary/20 animate-pulse" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show landing page if not authenticated
  if (!isAuthenticated) {
    return <LandingPage />;
  }

  // Show venue onboarding for managers without a venue
  if (isManager && !user?.venueId) {
    return <VenueOnboarding onComplete={() => window.location.reload()} />;
  }

  // Determine default route based on role
  const defaultRoute = isManager ? "/dashboard" : "/status";

  // Check if current route is accessible by user's role
  const isManagerRoute = location.startsWith("/dashboard") || location.startsWith("/staff") || location.startsWith("/alerts");
  const isStaffRoute = location.startsWith("/training") || location.startsWith("/status");

  return (
    <>
      <Switch>
        {/* Root - redirect to role-specific default */}
        <Route path="/">
          <Redirect to={defaultRoute} />
        </Route>

        {/* Manager Routes */}
        {isManager && (
          <>
            <Route path="/dashboard" component={ManagerDashboard} />
            <Route path="/staff" component={StaffManagement} />
            <Route path="/alerts" component={AlertsPage} />
          </>
        )}

        {/* Staff Routes */}
        {isStaff && (
          <>
            <Route path="/training" component={StaffDashboard} />
            <Route path="/status" component={StaffDashboard} />
            <Route path="/training/:moduleId" component={TrainingModuleViewer} />
          </>
        )}

        {/* Common Routes (both roles) */}
        <Route path="/report" component={IncidentReportForm} />
        <Route path="/account" component={AccountPage} />

        {/* 404 Fallback */}
        <Route component={NotFound} />
      </Switch>

      {/* Bottom Navigation */}
      {isAuthenticated && (
        <BottomNav items={isManager ? managerNavItems : staffNavItems} />
      )}

      {/* FAB for quick incident reporting (Staff only) */}
      {isStaff && !location.startsWith("/report") && (
        <FAB
          icon={AlertTriangle}
          label="Report Incident"
          onClick={() => navigate("/report")}
          className="bg-destructive hover:bg-destructive text-destructive-foreground"
        />
      )}

      {/* PWA Install Prompt */}
      <PWAInstallPrompt />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
