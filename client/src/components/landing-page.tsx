import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck, AlertTriangle, Users, TrendingUp } from "lucide-react";

export function LandingPage() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      {/* Hero Section */}
      <div className="relative px-4 pt-16 pb-24 sm:pt-24 sm:pb-32">
        <div className="max-w-3xl mx-auto text-center">
          <div className="flex justify-center mb-6">
            <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20">
              <ShieldCheck className="w-10 h-10 text-primary" />
            </div>
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
            Sting Free
            <span className="block text-2xl sm:text-3xl font-semibold text-muted-foreground mt-2">
              The Compliance & Awareness Nexus
            </span>
          </h1>
          
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Proactive compliance training and real-time regulatory intelligence for bars and restaurants. 
            Transform reactive measures into risk-prevention strategy.
          </p>
          
          <Button 
            size="lg" 
            className="h-12 px-8 text-base font-semibold"
            onClick={handleLogin}
            data-testid="button-login"
          >
            Log In to Get Started
          </Button>
        </div>
      </div>

      {/* Features Section */}
      <div className="px-4 pb-24 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="hover-elevate">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-success/10 text-success flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-semibold mb-2">Sting Certified Training</h3>
                  <p className="text-sm text-muted-foreground">
                    Proprietary 4-module curriculum covering responsible service, conflict resolution, 
                    internal loss prevention, and regulatory check preparedness.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-warning/10 text-warning flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-semibold mb-2">Real-Time Alerts</h3>
                  <p className="text-sm text-muted-foreground">
                    Geofenced push notifications for validated regulatory incidents within your area. 
                    Historical intelligence for preventative action.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-semibold mb-2">Staff Compliance Matrix</h3>
                  <p className="text-sm text-muted-foreground">
                    Real-time tracking of staff certification status, expiration dates, and incident counts. 
                    Automated recertification triggers.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-chart-2/10 text-chart-2 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-semibold mb-2">Measurable ROI</h3>
                  <p className="text-sm text-muted-foreground">
                    Direct correlation between training efficacy and incident reduction. 
                    Quantify compliance improvement and reduce liability.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border py-8 px-4">
        <div className="max-w-7xl mx-auto text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Sting Free. Professional compliance solutions for hospitality.</p>
        </div>
      </div>
    </div>
  );
}
