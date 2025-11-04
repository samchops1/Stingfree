import { useAuth } from "@/hooks/useAuth";
import { TopAppBar } from "@/components/ui/top-app-bar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Building2, LogOut, Shield } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";

export function AccountPage() {
  const { user, isManager } = useAuth();

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopAppBar title="Account" />

      <div className="px-4 py-6 max-w-2xl mx-auto space-y-6">
        {/* User Info */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4 mb-6">
              {user?.profileImageUrl ? (
                <img 
                  src={user.profileImageUrl}
                  alt="Profile"
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xl">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
              )}
              
              <div className="flex-1">
                <h2 className="text-xl font-bold mb-1">
                  {user?.firstName} {user?.lastName}
                </h2>
                <p className="text-sm text-muted-foreground mb-2">{user?.email}</p>
                <StatusBadge status={user?.role === 'manager' ? 'validated' : 'active'} className="text-xs">
                  {user?.role === 'manager' ? 'Manager' : 'Staff'}
                </StatusBadge>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <User className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Role</p>
                  <p className="font-medium">{isManager ? 'Venue Manager' : 'Staff Member'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 text-sm">
                <Building2 className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Venue</p>
                  <p className="font-medium">{user?.venueId || 'Not assigned'}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Settings/Actions */}
        <Card>
          <CardContent className="p-4 space-y-2">
            <Button
              variant="ghost"
              className="w-full justify-start"
              disabled
            >
              <Shield className="w-5 h-5 mr-3" />
              Privacy & Security
            </Button>
            
            <Button
              variant="ghost"
              className="w-full justify-start text-danger hover:text-danger hover:bg-danger/10"
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Log Out
            </Button>
          </CardContent>
        </Card>

        {/* App Info */}
        <div className="text-center text-xs text-muted-foreground pt-4">
          <p>Sting Free v1.0.0</p>
          <p className="mt-1">© {new Date().getFullYear()} Compliance & Awareness Nexus</p>
        </div>
      </div>
    </div>
  );
}
