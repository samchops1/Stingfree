import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Award, TrendingUp, AlertCircle, Sparkles, Zap, Target, Clock } from "lucide-react";
import { motion } from "framer-motion";
import type { Certification } from "@shared/schema";

interface StatusPageData {
  certification: Certification | null;
  progress: any[];
  modules: any[];
}

export function StatusPage() {
  const { data, isLoading } = useQuery<StatusPageData>({
    queryKey: ["/api/staff/dashboard"],
  });

  const certification = data?.certification;
  const progress = data?.progress || [];
  const modules = data?.modules || [];

  const completedModules = progress.filter(p => p.passed).length;
  const totalModules = modules.length;
  const completionPercentage = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

  const getDaysUntilExpiration = () => {
    if (!certification?.expiresAt) return null;
    const days = Math.ceil((new Date(certification.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const daysUntilExpiration = getDaysUntilExpiration();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-24 pt-6">
        <div className="px-4 max-w-3xl mx-auto space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-gradient-to-br from-muted/50 to-muted/20 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const statusColor = certification?.status === 'active'
    ? 'from-emerald-500 to-green-600'
    : certification?.status === 'expiring_soon'
    ? 'from-amber-500 to-orange-600'
    : 'from-slate-400 to-slate-600';

  const statusBgGlow = certification?.status === 'active'
    ? 'bg-emerald-500/20'
    : certification?.status === 'expiring_soon'
    ? 'bg-amber-500/20'
    : 'bg-slate-500/20';

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-24 pt-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 mb-8"
      >
        <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent mb-2">
          My Status
        </h1>
        <p className="text-muted-foreground flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Your certification and compliance overview
        </p>
      </motion.div>

      <div className="px-4 max-w-3xl mx-auto space-y-6">
        {/* Certification Hero Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="relative overflow-hidden border-2 bg-gradient-to-br from-card via-card to-primary/5">
            {/* Animated Background Glow */}
            <div className={`absolute inset-0 ${statusBgGlow} blur-3xl opacity-20 animate-pulse`} />

            <CardContent className="relative p-8">
              <div className="flex items-start gap-6">
                {/* Animated Badge Icon */}
                <motion.div
                  className={`relative w-24 h-24 rounded-3xl bg-gradient-to-br ${statusColor} flex items-center justify-center flex-shrink-0 shadow-2xl`}
                  animate={{
                    rotate: [0, 5, -5, 0],
                    scale: [1, 1.05, 1]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  {/* Glow effect */}
                  <div className="absolute inset-0 bg-white/20 rounded-3xl blur-xl" />
                  <ShieldCheck className="w-12 h-12 text-white relative z-10" />

                  {/* Sparkle effect */}
                  {certification?.status === 'active' && (
                    <motion.div
                      className="absolute -top-1 -right-1"
                      animate={{
                        scale: [1, 1.2, 1],
                        rotate: [0, 180, 360]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity
                      }}
                    >
                      <Sparkles className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                    </motion.div>
                  )}
                </motion.div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3">
                    <h2 className="text-2xl font-bold">Sting Certified</h2>
                    {certification && (
                      <Badge
                        variant={certification.status === 'active' ? 'default' : 'secondary'}
                        className={`px-3 py-1 ${
                          certification.status === 'active'
                            ? 'bg-gradient-to-r from-emerald-500 to-green-600 border-0'
                            : ''
                        }`}
                      >
                        {certification.status === 'active' ? '✓ Active' :
                         certification.status === 'expiring_soon' ? '⚠ Expiring Soon' :
                         'Expired'}
                      </Badge>
                    )}
                  </div>

                  {certification?.status === 'active' && daysUntilExpiration ? (
                    <p className="text-muted-foreground mb-4 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Valid for {daysUntilExpiration} more days
                    </p>
                  ) : certification?.status === 'expiring_soon' && daysUntilExpiration ? (
                    <p className="text-amber-600 font-medium mb-4 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Expires in {daysUntilExpiration} days - Renew soon!
                    </p>
                  ) : certification?.status === 'expired' ? (
                    <p className="text-destructive font-medium mb-4 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Certification expired - Renewal required
                    </p>
                  ) : (
                    <p className="text-muted-foreground mb-4">
                      Complete all training modules to earn certification
                    </p>
                  )}

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground font-medium">Training Progress</span>
                      <span className="font-bold text-lg">{completionPercentage}%</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-primary via-primary to-primary/80 rounded-full relative"
                        initial={{ width: 0 }}
                        animate={{ width: `${completionPercentage}%` }}
                        transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                      >
                        {/* Shimmer effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                      </motion.div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {completedModules} of {totalModules} modules completed
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recertification Alert */}
        {certification?.requiresRecertification && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-2 border-amber-500/50 bg-gradient-to-br from-amber-500/10 to-orange-500/5">
              <CardContent className="p-6 flex items-start gap-4">
                <motion.div
                  animate={{
                    rotate: [0, 10, -10, 0],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity
                  }}
                >
                  <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0" />
                </motion.div>
                <div>
                  <p className="font-bold text-amber-900 dark:text-amber-200 mb-2 flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Recertification Required
                  </p>
                  <p className="text-sm text-amber-800 dark:text-amber-300">
                    {certification.recertificationReason || 'You must complete training modules again to maintain certification.'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border-blue-500/20 hover-elevate">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                </div>
                <p className="text-3xl font-bold mb-1">{completedModules}/{totalModules}</p>
                <p className="text-sm text-muted-foreground">Modules Done</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/5 border-purple-500/20 hover-elevate">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                    <Award className="w-6 h-6 text-white" />
                  </div>
                </div>
                <p className="text-3xl font-bold mb-1">{certification?.relatedIncidentCount || 0}</p>
                <p className="text-sm text-muted-foreground">Incidents</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Achievement Message */}
        {certification?.status === 'active' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="bg-gradient-to-r from-emerald-500/10 via-green-500/10 to-teal-500/10 border-emerald-500/30">
              <CardContent className="p-6 flex items-center gap-4">
                <motion.div
                  animate={{
                    rotate: [0, 360],
                  }}
                  transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                >
                  <Sparkles className="w-8 h-8 text-emerald-600" />
                </motion.div>
                <div>
                  <p className="font-bold text-emerald-900 dark:text-emerald-200 mb-1">
                    🎉 You're Certified!
                  </p>
                  <p className="text-sm text-emerald-800 dark:text-emerald-300">
                    Great job maintaining your compliance certification. Keep up the excellent work!
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Add shimmer keyframe */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}
