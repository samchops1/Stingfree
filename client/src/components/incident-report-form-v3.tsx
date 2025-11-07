import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, MapPin, Mic, StopCircle, Play, CheckCircle2, Sparkles, Radio, Target } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const reportSchema = z.object({
  category: z.literal('regulatory_sting'),
  description: z.string().min(20, "Please provide at least 20 characters to describe what happened"),
  latitude: z.number(),
  longitude: z.number(),
  incidentTimestamp: z.date(),
});

type ReportFormData = z.infer<typeof reportSchema>;

// Audio prompt suggestions for describing a sting operation
const audioPrompts = [
  "Describe the person who approached the bar",
  "What did they order or ask for?",
  "Did they show any identification?",
  "What made you suspicious this was a sting?",
  "Were there any other people with them?",
  "What happened after you refused service?",
  "Did they identify themselves as law enforcement?",
  "What time did this occur?",
];

export function IncidentReportFormV3() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [location, setLocation] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [locationError, setLocationError] = useState<string>("");
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const form = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      category: 'regulatory_sting',
      description: '',
      incidentTimestamp: new Date(),
    },
  });

  // Get GPS location on mount
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          setLocation({ latitude, longitude, accuracy });
          form.setValue("latitude", latitude);
          form.setValue("longitude", longitude);
        },
        (error) => {
          setLocationError(error.message);
          toast({
            title: "Location Error",
            description: "Unable to get your location. Please enable GPS.",
            variant: "destructive",
          });
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setLocationError("Geolocation not supported");
    }
  }, [form, toast]);

  // Audio recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());

        // Convert audio to text (simplified - in production use Web Speech API or backend service)
        toast({
          title: "Recording Saved",
          description: "Type or continue recording to add more details",
        });
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      toast({
        title: "Microphone Error",
        description: "Unable to access microphone. Please type your report instead.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const nextPrompt = () => {
    setCurrentPromptIndex((prev) => (prev + 1) % audioPrompts.length);
  };

  const submitMutation = useMutation({
    mutationFn: async (data: ReportFormData) => {
      return await apiRequest("POST", "/api/incidents", data);
    },
    onSuccess: () => {
      toast({
        title: "Report Submitted",
        description: "Your sting report has been recorded and nearby managers have been notified.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/staff/dashboard"] });
      navigate("/status");
    },
    onError: () => {
      toast({
        title: "Submission Failed",
        description: "Unable to submit report. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ReportFormData) => {
    if (!location) {
      toast({
        title: "Location Required",
        description: "Please enable GPS to submit a report.",
        variant: "destructive",
      });
      return;
    }
    submitMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-destructive/5 to-background pb-24 pt-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 mb-6"
      >
        <div className="flex items-center gap-3 mb-2">
          <motion.div
            className="w-12 h-12 rounded-2xl bg-gradient-to-br from-destructive to-red-600 flex items-center justify-center shadow-xl"
            animate={{
              scale: [1, 1.05, 1],
              rotate: [0, 2, -2, 0]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <AlertTriangle className="w-6 h-6 text-white" />
          </motion.div>
          <div>
            <h1 className="text-2xl font-bold">Report Regulatory Sting</h1>
            <p className="text-sm text-muted-foreground">Quick incident documentation</p>
          </div>
        </div>
      </motion.div>

      <div className="px-4 max-w-2xl mx-auto space-y-6">
        {/* Alert Banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="border-2 border-destructive/50 bg-gradient-to-br from-destructive/10 to-red-500/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Radio className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm mb-1">Live Incident Reporting</p>
                  <p className="text-xs text-muted-foreground">
                    Your report will immediately notify nearby venue managers and be added to the regulatory intelligence database.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Location Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className={`border-2 ${location ? 'border-success/30 bg-success/5' : 'border-warning/30 bg-warning/5'}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${location ? 'bg-success/20' : 'bg-warning/20'} flex items-center justify-center`}>
                  <MapPin className={`w-5 h-5 ${location ? 'text-success' : 'text-warning'}`} />
                </div>
                <div className="flex-1">
                  {location ? (
                    <>
                      <p className="font-medium text-sm text-success">Location Acquired</p>
                      <p className="text-xs text-muted-foreground">
                        Accuracy: ±{Math.round(location.accuracy)}m
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-sm text-warning">Getting Location...</p>
                      <p className="text-xs text-muted-foreground">{locationError || "Please enable GPS"}</p>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Audio Prompt Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-purple-500/5">
            <CardContent className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <Sparkles className="w-5 h-5 text-primary" />
                <div>
                  <h3 className="font-semibold text-sm mb-1">Quick Voice Guide</h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    Use these prompts to help describe what happened:
                  </p>
                </div>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={currentPromptIndex}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-4 rounded-xl bg-primary/10 border border-primary/20 mb-3"
                >
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    {audioPrompts[currentPromptIndex]}
                  </p>
                </motion.div>
              </AnimatePresence>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={nextPrompt}
                  className="flex-1"
                >
                  Next Prompt
                </Button>
                {!isRecording ? (
                  <Button
                    type="button"
                    onClick={startRecording}
                    className="flex-1 bg-destructive hover:bg-destructive/90"
                    size="sm"
                  >
                    <Mic className="w-4 h-4 mr-2" />
                    Start Recording
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={stopRecording}
                    variant="destructive"
                    className="flex-1 animate-pulse"
                    size="sm"
                  >
                    <StopCircle className="w-4 h-4 mr-2" />
                    Stop Recording
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Report Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-2">
            <CardContent className="p-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Category (Fixed) */}
                  <div>
                    <label className="text-sm font-medium mb-3 block">Incident Type</label>
                    <div className="p-4 rounded-xl border-2 border-destructive/30 bg-destructive/5">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-destructive/20 flex items-center justify-center">
                          <AlertTriangle className="w-6 h-6 text-destructive" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">Regulatory Sting Operation</p>
                          <p className="text-xs text-muted-foreground">Verified decoy or enforcement action</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Incident Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe what happened in detail... Who approached? What did they order? What made you suspicious? What happened after you refused service?"
                            className="min-h-[200px] text-sm"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                        <p className="text-xs text-muted-foreground mt-1">
                          Minimum 20 characters. Be as detailed as possible to help other venues.
                        </p>
                      </FormItem>
                    )}
                  />

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={!location || submitMutation.isPending}
                    className="w-full h-12 text-base font-semibold bg-gradient-to-r from-destructive to-red-600 hover:from-destructive/90 hover:to-red-600/90"
                  >
                    {submitMutation.isPending ? (
                      "Submitting Report..."
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5 mr-2" />
                        Submit Sting Report
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </motion.div>

        {/* Info Card */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">
                <strong>Privacy Note:</strong> Your report will be shared anonymously with venue managers in the area.
                Location data is used only for geofencing alerts and trend analysis.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
