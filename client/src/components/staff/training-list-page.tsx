import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, ChevronRight, Clock, CheckCircle2, PlayCircle, Sparkles, Zap, Trophy, Brain } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import type { TrainingModule, UserProgress } from "@shared/schema";

interface TrainingListData {
  modules: TrainingModule[];
  progress: UserProgress[];
}

export function TrainingListPage() {
  const { data, isLoading } = useQuery<TrainingListData>({
    queryKey: ["/api/staff/dashboard"],
  });

  const modules = data?.modules || [];
  const progress = data?.progress || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background pb-24 pt-6">
        <div className="px-4 max-w-3xl mx-auto space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gradient-to-br from-muted/50 to-muted/20 rounded-3xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const completedCount = progress.filter(p => p.passed).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background pb-24 pt-6">
      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 mb-8"
      >
        <div className="flex items-center gap-3 mb-3">
          <motion.div
            className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg"
            animate={{
              rotate: [0, 5, -5, 0],
              scale: [1, 1.05, 1]
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <Brain className="w-7 h-7 text-white" />
          </motion.div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
              Training Modules
            </h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              {completedCount} of {modules.length} completed
            </p>
          </div>
        </div>

        {/* Progress Overview */}
        {completedCount === modules.length && modules.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-green-500/20 to-teal-500/20 border-2 border-emerald-500/30"
          >
            <div className="flex items-center gap-3">
              <Trophy className="w-6 h-6 text-emerald-600" />
              <div>
                <p className="font-bold text-emerald-900 dark:text-emerald-200">All Modules Complete!</p>
                <p className="text-sm text-emerald-800 dark:text-emerald-300">You've mastered all training content</p>
              </div>
            </div>
          </motion.div>
        ) : null}
      </motion.div>

      <div className="px-4 max-w-3xl mx-auto space-y-4">
        {modules.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="border-2">
              <CardContent className="p-12 text-center">
                <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-semibold mb-2">No Training Modules</h3>
                <p className="text-muted-foreground">Training content will appear here when available</p>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          modules.map((module, index) => {
            const moduleProgress = progress.find(p => p.moduleId === module.id);
            const isCompleted = moduleProgress?.passed;
            const isStarted = moduleProgress?.startedAt;
            const quizAttempts = moduleProgress?.quizAttempts || 0;

            const gradients = [
              'from-blue-500 to-cyan-600',
              'from-purple-500 to-pink-600',
              'from-orange-500 to-red-600',
              'from-green-500 to-emerald-600'
            ];

            const bgGradients = [
              'from-blue-500/10 to-cyan-500/5',
              'from-purple-500/10 to-pink-500/5',
              'from-orange-500/10 to-red-500/5',
              'from-green-500/10 to-emerald-500/5'
            ];

            const borderColors = [
              'border-blue-500/20',
              'border-purple-500/20',
              'border-orange-500/20',
              'border-green-500/20'
            ];

            const gradient = gradients[index % gradients.length];
            const bgGradient = bgGradients[index % bgGradients.length];
            const borderColor = borderColors[index % borderColors.length];

            return (
              <motion.div
                key={module.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link href={`/training/${module.id}`}>
                  <Card className={`relative overflow-hidden border-2 ${borderColor} bg-gradient-to-br ${bgGradient} hover-elevate group cursor-pointer`}>
                    {/* Animated Glow Effect */}
                    <motion.div
                      className={`absolute -inset-1 bg-gradient-to-r ${gradient} rounded-3xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500`}
                      animate={{
                        scale: [1, 1.1, 1],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />

                    <CardContent className="relative p-6">
                      <div className="flex items-start gap-4">
                        {/* Module Number Badge */}
                        <motion.div
                          className={`relative w-16 h-16 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0 shadow-xl`}
                          whileHover={{ scale: 1.05, rotate: 5 }}
                          transition={{ type: "spring", stiffness: 400 }}
                        >
                          {isCompleted ? (
                            <>
                              <CheckCircle2 className="w-8 h-8 text-white relative z-10" />
                              <motion.div
                                className="absolute inset-0 bg-white/30 rounded-2xl"
                                animate={{
                                  scale: [1, 1.2, 1],
                                  opacity: [0.3, 0, 0.3]
                                }}
                                transition={{
                                  duration: 2,
                                  repeat: Infinity
                                }}
                              />
                            </>
                          ) : (
                            <span className="text-2xl font-bold text-white">{module.moduleNumber}</span>
                          )}

                          {/* Sparkle for completed */}
                          {isCompleted && (
                            <motion.div
                              className="absolute -top-1 -right-1"
                              animate={{
                                rotate: [0, 180, 360]
                              }}
                              transition={{
                                duration: 3,
                                repeat: Infinity,
                                ease: "linear"
                              }}
                            >
                              <Sparkles className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                            </motion.div>
                          )}
                        </motion.div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <h3 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors">
                                {module.title}
                              </h3>
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {module.description}
                              </p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
                          </div>

                          {/* Stats */}
                          <div className="flex flex-wrap items-center gap-3 mt-4">
                            <Badge variant="secondary" className="gap-1.5">
                              <Clock className="w-3 h-3" />
                              {module.estimatedMinutes} min
                            </Badge>

                            {isCompleted && (
                              <Badge className={`gap-1.5 bg-gradient-to-r ${gradient} border-0`}>
                                <CheckCircle2 className="w-3 h-3" />
                                Completed
                              </Badge>
                            )}

                            {!isCompleted && isStarted && (
                              <Badge variant="outline" className="gap-1.5 border-amber-500 text-amber-600">
                                <PlayCircle className="w-3 h-3" />
                                In Progress
                              </Badge>
                            )}

                            {!isCompleted && !isStarted && (
                              <Badge variant="outline" className="gap-1.5">
                                <Zap className="w-3 h-3" />
                                Start Now
                              </Badge>
                            )}

                            {quizAttempts > 0 && (
                              <Badge variant="secondary" className="gap-1.5 text-xs">
                                {quizAttempts} {quizAttempts === 1 ? 'attempt' : 'attempts'}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar for Started Modules */}
                      {isStarted && !isCompleted && (
                        <div className="mt-4 pt-4 border-t border-border/50">
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <motion.div
                              className={`h-full bg-gradient-to-r ${gradient}`}
                              initial={{ width: 0 }}
                              animate={{ width: "50%" }}
                              transition={{ duration: 0.8, ease: "easeOut" }}
                            />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
