import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, MapPin, Camera, CheckCircle2 } from "lucide-react";
import { TopAppBar } from "@/components/ui/top-app-bar";

const incidentCategories = [
  {
    value: 'regulatory_sting',
    label: 'Regulatory Sting',
    description: 'Verified decoy or enforcement action',
    icon: AlertTriangle,
    color: 'text-danger',
    bgColor: 'bg-danger/10',
  },
  {
    value: 'unverified_hotspot',
    label: 'Unverified Hotspot',
    description: 'Potential regulatory presence',
    icon: AlertTriangle,
    color: 'text-warning',
    bgColor: 'bg-warning/10',
  },
  {
    value: 'operational_incident',
    label: 'Operational Incident',
    description: 'Internal issue or customer conflict',
    icon: AlertTriangle,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
];

const reportSchema = z.object({
  category: z.enum(['regulatory_sting', 'unverified_hotspot', 'operational_incident']),
  description: z.string().min(10, "Please provide at least 10 characters"),
  latitude: z.number(),
  longitude: z.number(),
});

type ReportFormData = z.infer<typeof reportSchema>;

export function IncidentReportForm() {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [photoCount, setPhotoCount] = useState(0);

  const form = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      category: undefined,
      description: "",
      latitude: 0,
      longitude: 0,
    },
  });

  // Get user's location
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLocation({ latitude, longitude });
          form.setValue("latitude", latitude);
          form.setValue("longitude", longitude);
        },
        (error) => {
          setLocationError("Unable to get your location. Please enable location services.");
          console.error("Geolocation error:", error);
        }
      );
    } else {
      setLocationError("Geolocation is not supported by your device.");
    }
  }, [form]);

  const reportMutation = useMutation({
    mutationFn: async (data: ReportFormData) => {
      const response = await apiRequest("POST", "/api/incidents", {
        ...data,
        incidentTimestamp: new Date().toISOString(),
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Report Submitted",
        description: "Your incident report has been received and is being verified.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
      form.reset();
      setSelectedCategory(null);
      setPhotoCount(0);
    },
    onError: (error: Error) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ReportFormData) => {
    reportMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopAppBar title="Report Incident" />

      <div className="px-4 py-6 max-w-2xl mx-auto">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Step 1: Category Selection */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Select Incident Type</h2>
              <div className="grid grid-cols-1 gap-3">
                {incidentCategories.map((category) => {
                  const Icon = category.icon;
                  const isSelected = selectedCategory === category.value;
                  
                  return (
                    <Card
                      key={category.value}
                      className={`cursor-pointer transition-all hover-elevate active-elevate-2 ${
                        isSelected ? 'border-primary border-2' : ''
                      }`}
                      onClick={() => {
                        setSelectedCategory(category.value);
                        form.setValue('category', category.value as any);
                      }}
                      data-testid={`category-${category.value}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`w-12 h-12 rounded-lg ${category.bgColor} ${category.color} flex items-center justify-center flex-shrink-0`}>
                            <Icon className="w-6 h-6" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm mb-1">{category.label}</h3>
                            <p className="text-xs text-muted-foreground">{category.description}</p>
                          </div>
                          {isSelected && (
                            <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              <FormMessage>{form.formState.errors.category?.message}</FormMessage>
            </div>

            {/* Step 2: Location */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <MapPin className={`w-5 h-5 flex-shrink-0 mt-1 ${location ? 'text-success' : 'text-muted-foreground'}`} />
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm mb-1">Location</h3>
                    {location ? (
                      <div className="space-y-1">
                        <p className="text-xs text-success font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Location captured
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                        </p>
                      </div>
                    ) : locationError ? (
                      <p className="text-xs text-danger">{locationError}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Getting your location...</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step 3: Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Provide details about the incident..."
                      className="resize-none min-h-24"
                      {...field}
                      data-testid="input-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Step 4: Photo Evidence (Optional) */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Camera className="w-5 h-5 flex-shrink-0 mt-1 text-muted-foreground" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm mb-1">Photo Evidence (Optional)</h3>
                    <p className="text-xs text-muted-foreground mb-3">
                      Add photos to support your report
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Photo upload will be implemented in Task 3 with ObjectUploader
                        toast({ title: "Photo upload coming soon" });
                      }}
                      data-testid="button-add-photo"
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Add Photo
                    </Button>
                    {photoCount > 0 && (
                      <p className="text-xs text-success mt-2">
                        {photoCount} {photoCount === 1 ? 'photo' : 'photos'} added
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-12"
              disabled={!selectedCategory || !location || reportMutation.isPending}
              data-testid="button-submit-report"
            >
              {reportMutation.isPending ? "Submitting..." : "Submit Report"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
