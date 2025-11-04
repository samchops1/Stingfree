import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { TopAppBar } from "@/components/ui/top-app-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, ChevronLeft, BookOpen } from "lucide-react";
import { useState } from "react";
import type { TrainingModule, QuizQuestion, UserProgress } from "@shared/schema";

interface ModuleData {
  module: TrainingModule;
  questions: QuizQuestion[];
  progress: UserProgress | null;
}

export function TrainingModuleViewer() {
  const params = useParams<{ moduleId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showQuiz, setShowQuiz] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [quizResults, setQuizResults] = useState<{ passed: boolean; score: number } | null>(null);

  const { data, isLoading } = useQuery<ModuleData>({
    queryKey: ["/api/training/modules", params.moduleId],
  });

  const startModuleMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/training/modules/${params.moduleId}/start`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training/modules", params.moduleId] });
      queryClient.invalidateQueries({ queryKey: ["/api/staff/dashboard"] });
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
          title: "Quiz Passed!",
          description: `You scored ${results.score}%. Great job!`,
        });
      } else {
        toast({
          title: "Quiz Not Passed",
          description: `You scored ${results.score}%. Review the material and try again.`,
          variant: "destructive",
        });
      }
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <TopAppBar title="Loading..." />
        <div className="px-4 py-6 max-w-3xl mx-auto space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted/50 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <TopAppBar title="Module Not Found" />
        <div className="px-4 py-6 max-w-3xl mx-auto text-center">
          <p className="text-muted-foreground">Module not found</p>
          <Button onClick={() => navigate("/training")} className="mt-4" data-testid="button-back-to-training-list">
            Back to Training
          </Button>
        </div>
      </div>
    );
  }

  const { module, questions, progress } = data;
  const isCompleted = progress?.passed;

  // Quiz Interface
  if (showQuiz && !quizResults) {
    const currentQuestion = questions[currentQuestionIndex];
    const totalQuestions = questions.length;
    const progressPercent = ((currentQuestionIndex + 1) / totalQuestions) * 100;
    const options = currentQuestion?.options as string[] || [];

    return (
      <div className="min-h-screen bg-background pb-20">
        <TopAppBar title={`Quiz: ${module.title}`} />
        
        <div className="px-4 py-6 max-w-2xl mx-auto">
          {/* Progress */}
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">
                Question {currentQuestionIndex + 1} of {totalQuestions}
              </span>
              <span className="font-semibold">{Math.round(progressPercent)}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          {/* Question */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">{currentQuestion.questionText}</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={answers[currentQuestion.id] || ""}
                onValueChange={(value) => setAnswers({ ...answers, [currentQuestion.id]: value })}
              >
                <div className="space-y-3">
                  {options.map((option, index) => (
                    <div
                      key={index}
                      className="flex items-start space-x-3 p-4 rounded-lg border hover-elevate"
                    >
                      <RadioGroupItem value={option} id={`option-${index}`} className="mt-0.5" />
                      <Label
                        htmlFor={`option-${index}`}
                        className="flex-1 cursor-pointer text-sm leading-relaxed"
                      >
                        {option}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex gap-3">
            {currentQuestionIndex > 0 && (
              <Button
                variant="outline"
                onClick={() => setCurrentQuestionIndex(currentQuestionIndex - 1)}
                data-testid="button-previous-question"
              >
                Previous
              </Button>
            )}
            
            {currentQuestionIndex < totalQuestions - 1 ? (
              <Button
                className="flex-1"
                onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                disabled={!answers[currentQuestion.id]}
                data-testid="button-next-question"
              >
                Next Question
              </Button>
            ) : (
              <Button
                className="flex-1"
                onClick={() => submitQuizMutation.mutate(answers)}
                disabled={Object.keys(answers).length < totalQuestions || submitQuizMutation.isPending}
                data-testid="button-submit-quiz"
              >
                {submitQuizMutation.isPending ? "Submitting..." : "Submit Quiz"}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Quiz Results
  if (quizResults) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <TopAppBar title="Quiz Results" />
        
        <div className="px-4 py-6 max-w-2xl mx-auto">
          <Card className={`border-2 ${quizResults.passed ? 'border-success' : 'border-danger'}`}>
            <CardContent className="p-8 text-center">
              {quizResults.passed ? (
                <CheckCircle2 className="w-16 h-16 text-success mx-auto mb-4" />
              ) : (
                <XCircle className="w-16 h-16 text-danger mx-auto mb-4" />
              )}
              
              <h2 className="text-2xl font-bold mb-2">
                {quizResults.passed ? "Congratulations!" : "Not Quite"}
              </h2>
              
              <p className="text-muted-foreground mb-4">
                You scored <span className="font-bold text-2xl">{quizResults.score}%</span>
              </p>
              
              <p className="text-sm text-muted-foreground mb-6">
                {quizResults.passed 
                  ? "You've successfully completed this module."
                  : "You need 80% or higher to pass. Review the material and try again."}
              </p>
              
              <div className="flex gap-3">
                {!quizResults.passed && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setQuizResults(null);
                      setAnswers({});
                      setCurrentQuestionIndex(0);
                      setShowQuiz(true);
                    }}
                    data-testid="button-retry-quiz"
                  >
                    Try Again
                  </Button>
                )}
                <Button
                  onClick={() => navigate("/training")}
                  className="flex-1"
                  data-testid="button-back-to-training"
                >
                  Back to Training
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Module Content View
  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border">
        <div className="flex items-center h-14 px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/training")}
            data-testid="button-back"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold ml-2 truncate">Module {module.moduleNumber}</h1>
        </div>
      </div>

      <div className="px-4 py-6 max-w-3xl mx-auto space-y-6">
        {/* Module Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                isCompleted ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'
              }`}>
                {isCompleted ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : (
                  <BookOpen className="w-6 h-6" />
                )}
              </div>
              
              <div className="flex-1">
                <h2 className="text-xl font-bold mb-2">{module.title}</h2>
                <p className="text-sm text-muted-foreground mb-3">{module.description}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{module.estimatedMinutes} minutes</span>
                  {isCompleted && (
                    <span className="text-success font-medium">✓ Completed</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Module Content */}
        <Card>
          <CardContent className="p-6 prose prose-sm max-w-none">
            <div dangerouslySetInnerHTML={{ __html: module.content }} />
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          {!progress?.startedAt && (
            <Button
              className="w-full h-12"
              onClick={() => startModuleMutation.mutate()}
              disabled={startModuleMutation.isPending}
              data-testid="button-start-module"
            >
              {startModuleMutation.isPending ? "Starting..." : "Start Module"}
            </Button>
          )}
          
          {progress?.startedAt && !isCompleted && (
            <Button
              className="w-full h-12"
              onClick={() => {
                setShowQuiz(true);
                setCurrentQuestionIndex(0);
                setAnswers({});
              }}
              data-testid="button-take-quiz"
            >
              Take Quiz
            </Button>
          )}
          
          {isCompleted && (
            <Button
              variant="outline"
              className="w-full h-12"
              onClick={() => {
                setShowQuiz(true);
                setCurrentQuestionIndex(0);
                setAnswers({});
                setQuizResults(null);
              }}
              data-testid="button-retake-quiz"
            >
              Retake Quiz
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
