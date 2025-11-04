import { useQuery } from "@tanstack/react-query";
import { TopAppBar } from "@/components/ui/top-app-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ShieldCheck, BookOpen, FileText, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Certification, TrainingModule, UserProgress } from "@shared/schema";

interface StaffDashboardData {
  certification: Certification | null;
  modules: TrainingModule[];
  progress: UserProgress[];
  completionPercentage: number;
}

export function StaffDashboard() {
  const { data, isLoading } = useQuery<StaffDashboardData>({
    queryKey: ["/api/staff/dashboard"],
  });

  const certification = data?.certification;
  const modules = data?.modules || [];
  const progress = data?.progress || [];
  const completionPercentage = data?.completionPercentage || 0;

  const getDaysUntilExpiration = () => {
    if (!certification?.expiresAt) return null;
    const days = Math.ceil((new Date(certification.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const daysUntilExpiration = getDaysUntilExpiration();

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopAppBar title="My Training" />

      <div className="px-4 py-6 max-w-3xl mx-auto space-y-6">
        {/* Certification Badge */}
        <Card className="border-2" data-testid="certification-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                certification?.status === 'active' 
                  ? 'bg-success/10 text-success' 
                  : certification?.status === 'expiring_soon'
                  ? 'bg-warning/10 text-warning'
                  : 'bg-muted text-muted-foreground'
              }`}>
                <ShieldCheck className="w-8 h-8" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-lg font-bold">Sting Certified</h2>
                  {certification && (
                    <StatusBadge status={certification.status} />
                  )}
                </div>
                
                {certification?.status === 'active' && daysUntilExpiration ? (
                  <p className="text-sm text-muted-foreground">
                    Expires in {daysUntilExpiration} days
                  </p>
                ) : certification?.status === 'expiring_soon' && daysUntilExpiration ? (
                  <p className="text-sm text-warning font-medium">
                    Expires in {daysUntilExpiration} days - Renew soon!
                  </p>
                ) : certification?.status === 'expired' ? (
                  <p className="text-sm text-danger font-medium">
                    Certification expired - Renewal required
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Complete all modules to get certified
                  </p>
                )}
              </div>
            </div>

            {/* Overall Progress */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Overall Progress</span>
                <span className="font-semibold" data-testid="completion-percentage">{completionPercentage}%</span>
              </div>
              <Progress value={completionPercentage} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Recertification Alert */}
        {certification?.requiresRecertification && (
          <Card className="border-warning bg-warning/5">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm mb-1">Recertification Required</p>
                <p className="text-xs text-muted-foreground">
                  {certification.recertificationReason || 'You must complete training modules again to maintain certification.'}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Training Modules */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Training Modules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-24 bg-muted/50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : modules.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No training modules available</p>
              </div>
            ) : (
              modules.map((module) => {
                const moduleProgress = progress.find(p => p.moduleId === module.id);
                const isCompleted = moduleProgress?.passed;
                const progressPercent = isCompleted ? 100 : moduleProgress?.startedAt ? 50 : 0;
                
                return (
                  <Link key={module.id} href={`/training/${module.id}`} data-testid={`link-module-${module.moduleNumber}`}>
                    <div
                      className="flex items-start gap-4 p-4 rounded-lg border hover-elevate active-elevate-2"
                      data-testid={`module-card-${module.moduleNumber}`}
                    >
                      {/* Progress Indicator */}
                      <div className={`w-1 h-full absolute left-0 top-0 bottom-0 rounded-l-lg ${
                        isCompleted ? 'bg-success' : progressPercent > 0 ? 'bg-warning' : 'bg-muted'
                      }`} />
                      
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isCompleted ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                      }`}>
                        {isCompleted ? (
                          <ShieldCheck className="w-6 h-6" />
                        ) : (
                          <span className="text-lg font-bold">{module.moduleNumber}</span>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm mb-1">{module.title}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                          {module.description}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{module.estimatedMinutes} min</span>
                          {isCompleted && (
                            <span className="text-success font-medium">✓ Completed</span>
                          )}
                          {!isCompleted && moduleProgress?.startedAt && (
                            <span className="text-warning font-medium">In Progress</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/report" data-testid="link-report-incident">
              <Button 
                variant="outline" 
                className="w-full justify-start h-auto py-3"
              >
                <FileText className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <p className="font-semibold text-sm">Report Incident</p>
                  <p className="text-xs text-muted-foreground">Submit a quick incident report</p>
                </div>
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
