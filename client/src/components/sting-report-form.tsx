import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  MapPin,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Shield,
  Navigation,
  ChevronLeft,
  FileWarning,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const reportSchema = z.object({
  description: z.string().min(20, "Please provide at least 20 characters with specific details"),
  latitude: z.number(),
  longitude: z.number(),
  address: z.string().optional(),
  incidentTimestamp: z.date(),
});

type ReportFormData = z.infer<typeof reportSchema>;

export function StingReportForm() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [location, setLocation] = useState<{ latitude: number; longitude: number; accuracy?: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const form = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      description: "",
      latitude: 0,
      longitude: 0,
      address: "",
      incidentTimestamp: new Date(),
    },
  });

  // Get user's precise location
  const requestLocation = () => {
    if (!("geolocation" in navigator)) {
      setLocationError("Geolocation is not supported by your device.");
      return;
    }

    setLocationLoading(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setLocation({ latitude, longitude, accuracy });
        form.setValue("latitude", latitude);
        form.setValue("longitude", longitude);
        setLocationLoading(false);

        // Reverse geocode to get address
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
          .then(res => res.json())
          .then(data => {
            if (data.display_name) {
              form.setValue("address", data.display_name);
            }
          })
          .catch(console.error);

        toast({
          title: "Location Captured",
          description: accuracy ? `GPS accuracy: ±${Math.round(accuracy)}m` : "Location set successfully",
        });
      },
      (error) => {
        setLocationLoading(false);
        let errorMessage = "Unable to get location.";

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location permission denied. Please enable location access.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information unavailable.";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out.";
            break;
        }

        setLocationError(errorMessage);
        toast({
          title: "Location Error",
          description: errorMessage,
          variant: "destructive",
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  useEffect(() => {
    requestLocation();
  }, []);

  const reportMutation = useMutation({
    mutationFn: async (data: ReportFormData) => {
      const response = await apiRequest("POST", "/api/incidents", {
        ...data,
        category: 'regulatory_sting',
        verificationStatus: 'pending',
        reporterId: "current-user",
      });
      return response;
    },
    onSuccess: () => {
      setSubmitSuccess(true);
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });

      setTimeout(() => {
        navigate("/status");
      }, 3000);
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit report. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ReportFormData) => {
    if (!location) {
      toast({
        title: "Location Required",
        description: "Please enable location services to submit a report.",
        variant: "destructive",
      });
      return;
    }

    reportMutation.mutate(data);
  };

  // Success state
  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-green-500/5 to-background flex items-center justify-center pb-20 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full"
        >
          <Card className="border-4 border-green-500/20 shadow-2xl">
            <CardContent className="p-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-24 h-24 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6"
              >
                <CheckCircle2 className="w-16 h-16 text-green-500" />
              </motion.div>

              <h2 className="text-2xl font-bold mb-2">Report Submitted</h2>
              <p className="text-muted-foreground mb-6">
                Your sting operation report has been received and is being verified.
                Nearby bars will be alerted once confirmed.
              </p>

              <div className="space-y-2 text-sm text-muted-foreground mb-6">
                <p>✓ Report timestamped and GPS-tagged</p>
                <p>✓ Management notified</p>
                <p>✓ Compliance team reviewing</p>
              </div>

              <Button
                className="w-full"
                onClick={() => navigate("/status")}
              >
                Return to Training
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-red-500/5 pb-20">
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
          <h1 className="text-lg font-semibold ml-2">Report Sting Operation</h1>
        </div>
      </div>

      <div className="px-4 py-6 max-w-3xl mx-auto space-y-6">
        {/* Warning Banner */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-2 border-red-500/20 bg-red-500/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium mb-1 text-red-500">Regulatory Sting Report</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Report confirmed or suspected law enforcement compliance checks.
                    Only submit verified information - your GPS location and timestamp are captured.
                    False reports harm the entire network.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Location */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className={location ? 'border-2 border-green-500/20' : 'border-2 border-orange-500/20'}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Navigation className={location ? 'w-5 h-5 text-green-500' : 'w-5 h-5 text-orange-500'} />
                      <h3 className="font-semibold">Location</h3>
                    </div>
                    {location && (
                      <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        GPS Locked
                      </Badge>
                    )}
                  </div>

                  {locationLoading && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Acquiring GPS coordinates...
                    </div>
                  )}

                  {location && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">Latitude</p>
                          <p className="font-mono font-medium">{location.latitude.toFixed(6)}</p>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">Longitude</p>
                          <p className="font-mono font-medium">{location.longitude.toFixed(6)}</p>
                        </div>
                      </div>
                      {location.accuracy && (
                        <p className="text-xs text-muted-foreground">
                          GPS Accuracy: ±{Math.round(location.accuracy)} meters
                        </p>
                      )}
                      {form.watch("address") && (
                        <p className="text-sm text-muted-foreground">
                          📍 {form.watch("address")}
                        </p>
                      )}
                    </div>
                  )}

                  {locationError && (
                    <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                      <p className="text-sm text-destructive">{locationError}</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={requestLocation}
                        className="mt-2"
                      >
                        Retry Location
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Description */}
            <AnimatePresence>
              {location && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: 0.2 }}
                >
                  <Card>
                    <CardContent className="p-6">
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-semibold">What Did You Observe?</FormLabel>
                            <FormDescription>
                              Be specific: What time? Who was involved? What happened? Were IDs checked? Any citations issued?
                            </FormDescription>
                            <FormControl>
                              <Textarea
                                placeholder="Example: At 10:30 PM, observed undercover officer with clipboard watching ID checks at the door. They were accompanied by what appeared to be an underage decoy (looked about 18-19 years old). Our bartender checked the ID thoroughly and refused service. The officer then identified themselves and commended our compliance..."
                                className="min-h-40 resize-none"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                            <p className="text-xs text-muted-foreground mt-2">
                              {field.value.length} characters (minimum 20 required)
                            </p>
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit Button */}
            <AnimatePresence>
              {location && form.watch("description").length >= 20 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: 0.3 }}
                  className="sticky bottom-0 py-4 bg-gradient-to-t from-background via-background to-transparent"
                >
                  <Button
                    type="submit"
                    disabled={reportMutation.isPending}
                    className="w-full h-14 text-base shadow-2xl bg-gradient-to-r from-red-500 to-red-600"
                  >
                    {reportMutation.isPending ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Submitting Report...
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-5 h-5 mr-2" />
                        Submit Sting Report
                      </>
                    )}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </Form>
      </div>
    </div>
  );
}
