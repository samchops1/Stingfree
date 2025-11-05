import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2 } from "lucide-react";
import { VenueSelector } from "@/components/venue-selector";

interface VenueDetails {
  name: string;
  address: string;
  placeId: string;
  latitude: number;
  longitude: number;
  types: string[];
}

export function VenueOnboarding({ onComplete }: { onComplete: () => void }) {
  const { toast } = useToast();

  const createVenueMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/venues", {
        name: data.name,
        address: data.address,
        googlePlaceId: data.placeId,
        latitude: data.latitude,
        longitude: data.longitude,
        geofenceRadiusMiles: 5, // Default 5 mile radius
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Venue Created!",
        description: "Your venue has been successfully registered.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      onComplete();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create venue. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleVenueSelect = (venue: VenueDetails) => {
    createVenueMutation.mutate(venue);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">Welcome to Sting Free</CardTitle>
                <CardDescription className="mt-1">
                  Select your venue from Google Maps to get started
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <VenueSelector
              onVenueSelect={handleVenueSelect}
              variant="onboarding"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
