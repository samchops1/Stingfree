import { useQuery } from "@tanstack/react-query";
import { TopAppBar } from "@/components/ui/top-app-bar";
import { MetricCard } from "@/components/ui/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldCheck, Users, AlertTriangle, Clock, MapPin } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Certification, Alert as AlertType, User } from "@shared/schema";

interface StaffWithCertification extends User {
  certification?: Certification | null;
}

interface DashboardData {
  venue: any;
  metrics: {
    totalStaff: number;
    certifiedStaff: number;
    expiringCertifications: number;
    criticalAlerts: number;
  };
  recentAlerts: AlertType[];
  staffCertifications: StaffWithCertification[];
}

export function ManagerDashboard() {
  // Fetch unified dashboard data
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/manager/dashboard"],
  });

  const metrics = data?.metrics;
  const activeAlerts = data?.recentAlerts?.filter(a => a.isActive) || [];
  const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical');
  const staffList = data?.staffCertifications || [];

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopAppBar 
        title="Dashboard" 
        notificationCount={activeAlerts.length}
        onNotificationClick={() => {}}
      />

      <div className="px-4 py-6 max-w-7xl mx-auto space-y-6">
        {/* Critical Alert Banner */}
        {criticalAlerts.length > 0 && (
          <Alert variant="destructive" className="border-danger bg-danger/10 animate-pulse" data-testid="alert-banner-critical">
            <AlertTriangle className="h-5 w-5" />
            <AlertDescription className="font-semibold">
              {criticalAlerts.length} critical regulatory {criticalAlerts.length === 1 ? 'alert' : 'alerts'} in your area
            </AlertDescription>
          </Alert>
        )}

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <MetricCard
            title="Certified Staff"
            value={isLoading ? "-" : `${metrics?.certifiedStaff || 0}/${metrics?.totalStaff || 0}`}
            icon={ShieldCheck}
            iconClassName="bg-success/10 text-success"
            data-testid="card-metric-certified-staff"
          />
          
          <MetricCard
            title="Active Alerts"
            value={isLoading ? "-" : activeAlerts.length}
            icon={AlertTriangle}
            iconClassName="bg-warning/10 text-warning"
            data-testid="card-metric-active-alerts"
          />
          
          <MetricCard
            title="Expiring Soon"
            value={isLoading ? "-" : metrics?.expiringCertifications || 0}
            icon={Clock}
            iconClassName="bg-warning/10 text-warning"
            data-testid="card-metric-expiring"
          />
          
          <MetricCard
            title="Compliance Rate"
            value={isLoading ? "-" : `${metrics?.totalStaff > 0 ? Math.round((metrics?.certifiedStaff / metrics?.totalStaff) * 100) : 0}%`}
            icon={Users}
            iconClassName="bg-primary/10 text-primary"
            data-testid="card-metric-compliance-rate"
          />
        </div>

        {/* Recent Alerts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4">
            <CardTitle className="text-lg font-semibold">Recent Alerts</CardTitle>
            <Link href="/alerts" data-testid="link-view-all-alerts">
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : activeAlerts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No active alerts in your area</p>
              </div>
            ) : (
              activeAlerts.slice(0, 3).map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start gap-3 p-3 rounded-lg border hover-elevate"
                  data-testid={`alert-card-${alert.id}`}
                >
                  <MapPin className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                    alert.severity === 'critical' ? 'text-danger' : 'text-warning'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm mb-1">{alert.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{alert.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(alert.publishedAt).toLocaleDateString()} at {new Date(alert.publishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Staff Compliance Matrix */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4">
            <CardTitle className="text-lg font-semibold">Staff Compliance</CardTitle>
            <Link href="/staff" data-testid="link-manage-staff">
              <Button variant="ghost" size="sm">
                Manage
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : !staffList || staffList.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No staff members yet</p>
                <Link href="/staff" data-testid="link-add-staff">
                  <Button variant="outline" size="sm" className="mt-4">
                    Add Staff
                  </Button>
                </Link>
              </div>
            ) : (
              staffList.slice(0, 5).map((staff) => (
                <div
                  key={staff.id}
                  className="flex items-center gap-3 p-3 rounded-lg border hover-elevate"
                  data-testid={`staff-card-${staff.id}`}
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm flex-shrink-0">
                    {staff.firstName?.[0]}{staff.lastName?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {staff.firstName} {staff.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{staff.email}</p>
                  </div>
                  <div className="flex-shrink-0">
                    <StatusBadge status={staff.certification?.status || 'not_certified'} />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
