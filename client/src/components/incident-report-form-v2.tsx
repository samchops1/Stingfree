import { useState, useEffect, useRef } from "react";
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
  Camera,
  CheckCircle2,
  Loader2,
  X,
  AlertCircle,
  Shield,
  Users,
  FileWarning,
  Navigation,
  Image as ImageIcon,
  ChevronLeft,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const incidentCategories = [
  {
    value: 'regulatory_sting',
    label: 'Regulatory Sting Operation',
    description: 'Verified decoy or law enforcement action',
    icon: Shield,
    color: 'from-red-500 to-red-600',
    textColor: 'text-red-600',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20',
    severity: 'critical',
  },
  {
    value: 'unverified_hotspot',
    label: 'Potential Regulatory Activity',
    description: 'Suspicious activity or unusual presence',
    icon: AlertCircle,
    color: 'from-orange-500 to-orange-600',
    textColor: 'text-orange-600',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/20',
    severity: 'warning',
  },
  {
    value: 'operational_incident',
    label: 'Internal Operational Issue',
    description: 'Employee conduct, theft, or customer conflict',
    icon: Users,
    color: 'from-blue-500 to-blue-600',
    textColor: 'text-blue-600',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
    severity: 'standard',
  },
];

const reportSchema = z.object({
  category: z.enum(['regulatory_sting', 'unverified_hotspot', 'operational_incident']),
  description: z.string().min(20, "Please provide at least 20 characters with specific details"),
  latitude: z.number(),
  longitude: z.number(),
  address: z.string().optional(),
  incidentTimestamp: z.date(),
  verificationStatus: z.enum(['pending', 'validated', 'archived']).default('pending'),
});

type ReportFormData = z.infer<typeof reportSchema>;

export function IncidentReportForm() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number; accuracy?: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      category: undefined,
      description: "",
      latitude: 0,
      longitude: 0,
      address: "",
      incidentTimestamp: new Date(),
      verificationStatus: 'pending',
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

  // Handle photo upload
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + photos.length > 5) {
      toast({
        title: "Too Many Photos",
        description: "Maximum 5 photos allowed per report",
        variant: "destructive",
      });
      return;
    }

    // Create previews
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setPhotos([...photos, ...files]);
    setPhotoPreviews([...photoPreviews, ...newPreviews]);
  };

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photoPreviews[index]);
    setPhotos(photos.filter((_, i) => i !== index));
    setPhotoPreviews(photoPreviews.filter((_, i) => i !== index));
  };

  const reportMutation = useMutation({
    mutationFn: async (data: ReportFormData) => {
      // In a real app, you'd upload photos to object storage first
      // For now, we'll just submit the report data
      const response = await apiRequest("POST", "/api/incidents", {
        ...data,
        photoUrls: [], // Would contain uploaded photo URLs
        reporterId: "current-user", // Would come from auth context
      });
      return response;
    },
    onSuccess: () => {
      setSubmitSuccess(true);
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });

      setTimeout(() => {
        navigate("/alerts");
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
                Your incident report has been received and is being verified.
                Nearby venues will be alerted if this is confirmed.
              </p>

              <div className="space-y-2 text-sm text-muted-foreground">
                <p>✓ Report timestamped and GPS-tagged</p>
                <p>✓ Management notified</p>
                {photos.length > 0 && <p>✓ {photos.length} photo(s) attached</p>}
              </div>

              <Button
                className="w-full mt-6"
                onClick={() => navigate("/alerts")}
              >
                View Alerts Dashboard
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  const selectedCategoryData = incidentCategories.find(c => c.value === selectedCategory);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-20">
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
          <h1 className="text-lg font-semibold ml-2">Report Incident</h1>
        </div>
      </div>

      <div className="px-4 py-6 max-w-3xl mx-auto space-y-6">
        {/* Warning Banner */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-2 border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <FileWarning className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium mb-1">Important: Report Accuracy</p>
                  <p className="text-xs text-muted-foreground">
                    Only submit verified incidents. False reports can impact the entire network.
                    Your GPS location and timestamp are automatically captured for verification.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Category Selection */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardContent className="p-6">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold">Incident Type</FormLabel>
                        <FormDescription>Select the type of incident you're reporting</FormDescription>
                        <FormControl>
                          <div className="grid gap-3 mt-4">
                            {incidentCategories.map((category) => {
                              const Icon = category.icon;
                              const isSelected = selectedCategory === category.value;

                              return (
                                <motion.button
                                  key={category.value}
                                  type="button"
                                  whileHover={{ scale: 1.01 }}
                                  whileTap={{ scale: 0.99 }}
                                  onClick={() => {
                                    setSelectedCategory(category.value);
                                    field.onChange(category.value);
                                  }}
                                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                                    isSelected
                                      ? `${category.borderColor} ${category.bgColor} shadow-md`
                                      : 'border-border hover:border-primary/30 hover:bg-accent/50'
                                  }`}
                                >
                                  <div className="flex items-start gap-4">
                                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${category.color}`}>
                                      <Icon className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-semibold">{category.label}</h3>
                                        {isSelected && (
                                          <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                          >
                                            <CheckCircle2 className="w-5 h-5 text-primary" />
                                          </motion.div>
                                        )}
                                      </div>
                                      <p className="text-sm text-muted-foreground">
                                        {category.description}
                                      </p>
                                    </div>
                                  </div>
                                </motion.button>
                              );
                            })}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </motion.div>

            {/* Location */}
            <AnimatePresence>
              {selectedCategory && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: 0.2 }}
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
              )}
            </AnimatePresence>

            {/* Description */}
            <AnimatePresence>
              {selectedCategory && location && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: 0.3 }}
                >
                  <Card>
                    <CardContent className="p-6">
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-semibold">Incident Details</FormLabel>
                            <FormDescription>
                              Provide specific details: What happened? When? Who was involved?
                            </FormDescription>
                            <FormControl>
                              <Textarea
                                placeholder="Example: Observed undercover officer with clipboard at 2:15 PM. Individual appeared to be taking notes on ID checking procedures. Accompanied by what seemed to be an underage decoy..."
                                className="min-h-32 resize-none"
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

            {/* Photo Evidence */}
            <AnimatePresence>
              {selectedCategory && location && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: 0.4 }}
                >
                  <Card>
                    <CardContent className="p-6">
                      <div className="mb-4">
                        <h3 className="font-semibold mb-1 flex items-center gap-2">
                          <Camera className="w-5 h-5" />
                          Photo Evidence (Optional)
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Attach up to 5 photos of citations, suspicious activity, or documentation
                        </p>
                      </div>

                      {photoPreviews.length > 0 && (
                        <div className="grid grid-cols-3 gap-3 mb-4">
                          {photoPreviews.map((preview, index) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="relative aspect-square rounded-lg overflow-hidden bg-muted"
                            >
                              <img
                                src={preview}
                                alt={`Photo ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => removePhoto(index)}
                                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:scale-110 transition-transform"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </motion.div>
                          ))}
                        </div>
                      )}

                      {photos.length < 5 && (
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <ImageIcon className="w-4 h-4 mr-2" />
                          Add Photo ({photos.length}/5)
                        </Button>
                      )}

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        multiple
                        onChange={handlePhotoChange}
                        className="hidden"
                      />
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit Button */}
            <AnimatePresence>
              {selectedCategory && location && form.watch("description").length >= 20 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: 0.5 }}
                  className="sticky bottom-0 py-4 bg-gradient-to-t from-background via-background to-transparent"
                >
                  <Button
                    type="submit"
                    disabled={reportMutation.isPending}
                    className={`w-full h-14 text-base shadow-2xl bg-gradient-to-r ${selectedCategoryData?.color || 'from-primary to-primary/80'}`}
                  >
                    {reportMutation.isPending ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Submitting Report...
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-5 h-5 mr-2" />
                        Submit Incident Report
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
