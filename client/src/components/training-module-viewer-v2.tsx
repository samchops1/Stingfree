import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  XCircle,
  ChevronLeft,
  BookOpen,
  Clock,
  Award,
  AlertCircle,
  Lightbulb,
  Target,
  TrendingUp,
  ShieldCheck
} from "lucide-react";
import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { TrainingModule, QuizQuestion, UserProgress } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";

interface ModuleData {
  module: TrainingModule;
  questions: QuizQuestion[];
  progress: UserProgress | null;
}

// Custom markdown components for beautiful rendering
const markdownComponents = {
  h1: ({ children }: any) => (
    <h1 className="text-3xl font-bold text-foreground mb-6 mt-8 pb-3 border-b-2 border-primary/20">
      {children}
    </h1>
  ),
  h2: ({ children }: any) => (
    <h2 className="text-2xl font-bold text-foreground mb-4 mt-6 flex items-center gap-2">
      <div className="w-1 h-6 bg-primary rounded-full" />
      {children}
    </h2>
  ),
  h3: ({ children }: any) => (
    <h3 className="text-xl font-semibold text-foreground mb-3 mt-5">
      {children}
    </h3>
  ),
  p: ({ children }: any) => (
    <p className="text-base text-muted-foreground leading-relaxed mb-4">
      {children}
    </p>
  ),
  ul: ({ children }: any) => (
    <ul className="space-y-2 mb-6 ml-4">
      {children}
    </ul>
  ),
  ol: ({ children }: any) => (
    <ol className="space-y-2 mb-6 ml-4 list-decimal">
      {children}
    </ol>
  ),
  li: ({ children }: any) => (
    <li className="text-muted-foreground flex items-start gap-2">
      <span className="text-primary mt-1.5 text-xs">▸</span>
      <span className="flex-1">{children}</span>
    </li>
  ),
  strong: ({ children }: any) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }: any) => (
    <em className="italic text-primary">{children}</em>
  ),
  blockquote: ({ children }: any) => (
    <blockquote className="border-l-4 border-primary/30 pl-4 py-2 my-4 bg-primary/5 rounded-r">
      {children}
    </blockquote>
  ),
  code: ({ inline, children }: any) => (
    inline ? (
      <code className="px-1.5 py-0.5 bg-muted rounded text-sm font-mono text-primary">
        {children}
      </code>
    ) : (
      <code className="block p-4 bg-muted rounded-lg my-4 overflow-x-auto text-sm font-mono">
        {children}
      </code>
    )
  ),
  hr: () => (
    <hr className="my-8 border-border" />
  ),
};

export function TrainingModuleViewer() {
  const params = useParams<{ moduleId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showQuiz, setShowQuiz] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [quizResults, setQuizResults] = useState<{ passed: boolean; score: number; correctCount: number; totalQuestions: number } | null>(null);
  const [readingProgress, setReadingProgress] = useState(0);

  const { data, isLoading } = useQuery<ModuleData>({
    queryKey: ["/api/training/modules", params.moduleId],
  });

  // Track scroll progress for reading
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = Math.min((scrollTop / docHeight) * 100, 100);
      setReadingProgress(progress);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const startModuleMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/training/modules/${params.moduleId}/start`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training/modules", params.moduleId] });
      queryClient.invalidateQueries({ queryKey: ["/api/staff/dashboard"] });
      toast({
        title: "Module Started",
        description: "Your progress is being tracked. Take your time to learn!",
      });
    },
  });

  const submitQuizMutation = useMutation({
    mutationFn: async (answers: Record<string, string>) => {
      const response = await apiRequest("POST", `/api/training/modules/${params.moduleId}/quiz`, { answers });
      return response.json();
    },
    onSuccess: (results) => {
      setQuizResults(results);
      queryClient.invalidateQueries({ queryKey: ["/api/training/modules", params.moduleId] });
      queryClient.invalidateQueries({ queryKey: ["/api/staff/dashboard"] });

      if (results.passed) {
        toast({
          title: "🎉 Congratulations!",
          description: `You scored ${results.score}% and earned your certification!`,
        });
      } else {
        toast({
          title: "Keep Learning",
          description: `You scored ${results.score}%. Review the material and try again - you've got this!`,
          variant: "destructive",
        });
      }
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-20">
        <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
          <div className="h-14 px-4 flex items-center">
            <div className="h-8 w-48 bg-muted/50 rounded animate-pulse" />
          </div>
        </div>
        <div className="px-4 py-6 max-w-4xl mx-auto space-y-6">
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="h-48 bg-muted/30 rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-20 flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Module Not Found</h2>
            <p className="text-muted-foreground mb-6">
              This training module doesn't exist or has been removed.
            </p>
            <Button onClick={() => navigate("/status")} className="w-full">
              Back to Training
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { module, questions, progress } = data;
  const isCompleted = progress?.passed;

  // Enhanced Quiz Interface with animations
  if (showQuiz && !quizResults) {
    const currentQuestion = questions[currentQuestionIndex];
    const totalQuestions = questions.length;
    const progressPercent = ((currentQuestionIndex + 1) / totalQuestions) * 100;
    const options = currentQuestion?.options as string[] || [];

    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background pb-20">
        {/* Header with progress */}
        <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between mb-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowQuiz(false);
                  setAnswers({});
                  setCurrentQuestionIndex(0);
                }}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Exit Quiz
              </Button>
              <Badge variant="secondary" className="font-mono">
                {currentQuestionIndex + 1} / {totalQuestions}
              </Badge>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        </div>

        <div className="px-4 py-6 max-w-3xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestionIndex}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              {/* Question Card */}
              <Card className="mb-6 border-2 border-primary/20 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-start gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Target className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">
                        Scenario-Based Question
                      </p>
                      <h3 className="text-lg font-semibold leading-relaxed">
                        {currentQuestion.questionText}
                      </h3>
                    </div>
                  </div>

                  {/* Answer Options */}
                  <div className="space-y-3">
                    {options.map((option, index) => {
                      const isSelected = answers[currentQuestion.id] === option;
                      return (
                        <motion.button
                          key={index}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => setAnswers({ ...answers, [currentQuestion.id]: option })}
                          className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                            isSelected
                              ? 'border-primary bg-primary/10 shadow-md'
                              : 'border-border hover:border-primary/50 hover:bg-accent/50'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                              isSelected ? 'border-primary bg-primary' : 'border-muted-foreground'
                            }`}>
                              {isSelected && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="w-3 h-3 rounded-full bg-primary-foreground"
                                />
                              )}
                            </div>
                            <span className="flex-1 text-sm leading-relaxed">
                              {option}
                            </span>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Navigation */}
              <div className="flex gap-3">
                {currentQuestionIndex > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => setCurrentQuestionIndex(currentQuestionIndex - 1)}
                    className="w-32"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>
                )}

                {currentQuestionIndex < totalQuestions - 1 ? (
                  <Button
                    className="flex-1"
                    onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                    disabled={!answers[currentQuestion.id]}
                  >
                    Next Question
                    <ChevronLeft className="w-4 h-4 ml-1 rotate-180" />
                  </Button>
                ) : (
                  <Button
                    className="flex-1 bg-gradient-to-r from-primary to-primary/80"
                    onClick={() => submitQuizMutation.mutate(answers)}
                    disabled={Object.keys(answers).length < totalQuestions || submitQuizMutation.isPending}
                  >
                    {submitQuizMutation.isPending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Award className="w-4 h-4 mr-2" />
                        Submit Quiz
                      </>
                    )}
                  </Button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // Enhanced Quiz Results with celebration
  if (quizResults) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-20 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="px-4 w-full max-w-2xl"
        >
          <Card className={`border-4 shadow-2xl ${quizResults.passed ? 'border-green-500' : 'border-orange-500'}`}>
            <CardContent className="p-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="text-center mb-6"
              >
                {quizResults.passed ? (
                  <>
                    <div className="w-24 h-24 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-16 h-16 text-green-500" />
                    </div>
                    <h2 className="text-3xl font-bold text-green-500 mb-2">
                      🎉 Congratulations!
                    </h2>
                    <p className="text-lg text-muted-foreground">
                      You've earned your certification
                    </p>
                  </>
                ) : (
                  <>
                    <div className="w-24 h-24 rounded-full bg-orange-500/10 flex items-center justify-center mx-auto mb-4">
                      <TrendingUp className="w-16 h-16 text-orange-500" />
                    </div>
                    <h2 className="text-3xl font-bold text-orange-500 mb-2">
                      Keep Learning!
                    </h2>
                    <p className="text-lg text-muted-foreground">
                      Review and try again - you're almost there
                    </p>
                  </>
                )}
              </motion.div>

              {/* Score Display */}
              <div className="bg-muted/50 rounded-xl p-6 mb-6">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-3xl font-bold text-primary mb-1">{quizResults.score}%</div>
                    <div className="text-xs text-muted-foreground">Score</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-foreground mb-1">
                      {quizResults.correctCount}/{quizResults.totalQuestions}
                    </div>
                    <div className="text-xs text-muted-foreground">Correct</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-muted-foreground mb-1">80%</div>
                    <div className="text-xs text-muted-foreground">Pass Mark</div>
                  </div>
                </div>
              </div>

              {/* Message */}
              <div className={`p-4 rounded-lg mb-6 ${
                quizResults.passed ? 'bg-green-500/10' : 'bg-orange-500/10'
              }`}>
                <p className="text-sm text-center text-muted-foreground">
                  {quizResults.passed
                    ? "Your certification has been recorded. You're now one step closer to becoming Sting Certified!"
                    : "Don't worry - most people need a few tries. Review the material and you'll get it next time!"}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                {!quizResults.passed && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setQuizResults(null);
                      setAnswers({});
                      setCurrentQuestionIndex(0);
                      setShowQuiz(false);
                    }}
                    className="col-span-2"
                  >
                    <BookOpen className="w-4 h-4 mr-2" />
                    Review Material
                  </Button>
                )}
                <Button
                  variant={quizResults.passed ? "outline" : "default"}
                  onClick={() => {
                    setQuizResults(null);
                    setAnswers({});
                    setCurrentQuestionIndex(0);
                    setShowQuiz(true);
                  }}
                  className={!quizResults.passed ? "col-span-2" : ""}
                >
                  Try Again
                </Button>
                {quizResults.passed && (
                  <Button
                    onClick={() => navigate("/status")}
                    className="bg-gradient-to-r from-primary to-primary/80"
                  >
                    Continue Training
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Beautiful Module Content View with animations
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-20">
      {/* Reading Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-muted z-50">
        <motion.div
          className="h-full bg-gradient-to-r from-primary to-primary/60"
          style={{ width: `${readingProgress}%` }}
        />
      </div>

      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center h-14 px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/status")}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="ml-2 flex-1">
            <h1 className="text-sm font-semibold truncate">Module {module.moduleNumber}</h1>
            <p className="text-xs text-muted-foreground truncate">{module.title}</p>
          </div>
          {isCompleted && (
            <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
              <ShieldCheck className="w-3 h-3 mr-1" />
              Certified
            </Badge>
          )}
        </div>
      </div>

      <div className="px-4 py-6 max-w-4xl mx-auto space-y-6">
        {/* Hero Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="overflow-hidden border-2 border-primary/20 shadow-xl bg-gradient-to-br from-card to-primary/5">
            <CardContent className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg ${
                  isCompleted
                    ? 'bg-gradient-to-br from-green-500 to-green-600'
                    : 'bg-gradient-to-br from-primary to-primary/80'
                }`}>
                  {isCompleted ? (
                    <Award className="w-8 h-8 text-white" />
                  ) : (
                    <BookOpen className="w-8 h-8 text-white" />
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className="text-xs">
                      Module {module.moduleNumber}
                    </Badge>
                    {module.isRequired && (
                      <Badge variant="destructive" className="text-xs">
                        Required
                      </Badge>
                    )}
                  </div>
                  <h2 className="text-2xl font-bold mb-2">{module.title}</h2>
                  <p className="text-sm text-muted-foreground mb-4">{module.description}</p>

                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>{module.estimatedMinutes} minutes</span>
                    </div>
                    {isCompleted && (
                      <div className="flex items-center gap-1.5 text-green-500 font-medium">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Completed</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Start Info */}
              {!progress?.startedAt && (
                <div className="mt-6 p-4 bg-primary/10 rounded-lg border border-primary/20">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium mb-1">Ready to learn?</p>
                      <p className="text-xs text-muted-foreground">
                        This module contains real-world scenarios and practical knowledge to help you stay compliant.
                        Take your time and complete the quiz at the end.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Module Content - Beautiful Markdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="shadow-lg">
            <CardContent className="p-6 md:p-8">
              <div className="prose prose-slate dark:prose-invert max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={markdownComponents}
                >
                  {module.content}
                </ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Action Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="sticky bottom-0 py-4 bg-gradient-to-t from-background via-background to-transparent"
        >
          <Card className="shadow-xl border-2">
            <CardContent className="p-4">
              {!progress?.startedAt && (
                <Button
                  className="w-full h-12 text-base bg-gradient-to-r from-primary to-primary/80 shadow-lg"
                  onClick={() => startModuleMutation.mutate()}
                  disabled={startModuleMutation.isPending}
                >
                  {startModuleMutation.isPending ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <BookOpen className="w-5 h-5 mr-2" />
                      Start Module
                    </>
                  )}
                </Button>
              )}

              {progress?.startedAt && !isCompleted && (
                <Button
                  className="w-full h-12 text-base bg-gradient-to-r from-primary to-primary/80 shadow-lg"
                  onClick={() => {
                    setShowQuiz(true);
                    setCurrentQuestionIndex(0);
                    setAnswers({});
                  }}
                >
                  <Target className="w-5 h-5 mr-2" />
                  Take Quiz ({questions.length} Questions)
                </Button>
              )}

              {isCompleted && (
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full h-12 text-base border-2"
                    onClick={() => {
                      setShowQuiz(true);
                      setCurrentQuestionIndex(0);
                      setAnswers({});
                      setQuizResults(null);
                    }}
                  >
                    <TrendingUp className="w-5 h-5 mr-2" />
                    Retake Quiz
                  </Button>
                  <Button
                    className="w-full h-12 text-base bg-gradient-to-r from-primary to-primary/80"
                    onClick={() => navigate("/status")}
                  >
                    Continue to Next Module
                    <ChevronLeft className="w-5 h-5 ml-2 rotate-180" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
