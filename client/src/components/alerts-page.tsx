import { useQuery } from "@tanstack/react-query";
import { TopAppBar } from "@/components/ui/top-app-bar";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { MapPin, AlertTriangle, Clock } from "lucide-react";
import type { Alert } from "@shared/schema";

export function AlertsPage() {
  const { data: alerts, isLoading } = useQuery<Alert[]>({
    queryKey: ["/api/manager/alerts"],
  });

  const activeAlerts = alerts?.filter(a => a.isActive) || [];
  const archivedAlerts = alerts?.filter(a => !a.isActive) || [];
  const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical');

  const formatDistance = (radiusMiles: string) => {
    const miles = parseFloat(radiusMiles);
    return miles < 1 ? `${(miles * 5280).toFixed(0)} ft` : `${miles.toFixed(1)} mi`;
  };

  const AlertCard = ({ alert }: { alert: Alert }) => (
    <Card 
      className={`hover-elevate ${alert.severity === 'critical' ? 'border-danger' : 'border-warning'}`}
      data-testid={`alert-${alert.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <MapPin className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
            alert.severity === 'critical' ? 'text-danger' : 'text-warning'
          }`} />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-semibold text-sm">{alert.title}</h3>
              <Badge 
                variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}
                className="flex-shrink-0"
              >
                {alert.severity === 'critical' ? 'Critical' : 'Standard'}
              </Badge>
            </div>
            
            <p className="text-sm text-muted-foreground mb-3">{alert.message}</p>
            
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(alert.publishedAt).toLocaleDateString()} at{' '}
                {new Date(alert.publishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                Within {formatDistance(alert.radiusMiles || '5.0')}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopAppBar title="Alerts" notificationCount={activeAlerts.length} />

      <div className="px-4 py-6 max-w-3xl mx-auto">
        {/* Critical Alert Summary */}
        {criticalAlerts.length > 0 && (
          <Card className="mb-6 border-danger bg-danger/5">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm mb-1">
                  {criticalAlerts.length} Critical {criticalAlerts.length === 1 ? 'Alert' : 'Alerts'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Verified regulatory incidents reported in your area. Review and update staff protocols.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs for Active/Archived */}
        <Tabs defaultValue="active" className="space-y-4">
          <TabsList className="w-full">
            <TabsTrigger value="active" className="flex-1" data-testid="tab-active">
              Active ({activeAlerts.length})
            </TabsTrigger>
            <TabsTrigger value="archived" className="flex-1" data-testid="tab-archived">
              Archived ({archivedAlerts.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-3">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 bg-muted/50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : activeAlerts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <AlertTriangle className="w-16 h-16 mx-auto mb-3 opacity-30" />
                <p className="text-base font-medium">No Active Alerts</p>
                <p className="text-sm mt-1">You'll be notified when new incidents are reported</p>
              </div>
            ) : (
              activeAlerts.map((alert) => <AlertCard key={alert.id} alert={alert} />)
            )}
          </TabsContent>

          <TabsContent value="archived" className="space-y-3">
            {archivedAlerts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="w-16 h-16 mx-auto mb-3 opacity-30" />
                <p className="text-base font-medium">No Archived Alerts</p>
                <p className="text-sm mt-1">Resolved alerts will appear here</p>
              </div>
            ) : (
              archivedAlerts.map((alert) => <AlertCard key={alert.id} alert={alert} />)
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
