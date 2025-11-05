import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Building2,
  Edit,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { VenueSelector } from "@/components/venue-selector";
import { motion, AnimatePresence } from "framer-motion";

interface VenueDetails {
  name: string;
  address: string;
  placeId: string;
  latitude: number;
  longitude: number;
  types: string[];
}

interface HomeVenue {
  id: string;
  name: string;
  address: string;
  googlePlaceId: string;
  latitude: string;
  longitude: string;
}

export function HomeBarSettings() {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);

  // Fetch current user data to get home venue
  const { data: userData } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  // Fetch home venue details if set
  const { data: homeVenue, isLoading } = useQuery<HomeVenue | null>({
    queryKey: ["/api/venues/home"],
    enabled: !!userData?.homeVenueId,
  });

  const updateHomeVenueMutation = useMutation({
    mutationFn: async (venue: VenueDetails | null) => {
      if (!venue) {
        // Clear home venue
        const response = await apiRequest("DELETE", "/api/users/home-venue");
        return response.json();
      }

      // First, create or find the venue
      const venueResponse = await apiRequest("POST", "/api/venues/find-or-create", {
        name: venue.name,
        address: venue.address,
        googlePlaceId: venue.placeId,
        latitude: venue.latitude,
        longitude: venue.longitude,
        geofenceRadiusMiles: 5,
      });
      const venueData = await venueResponse.json();

      // Then set it as home venue
      const response = await apiRequest("PUT", "/api/users/home-venue", {
        homeVenueId: venueData.id,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Home Bar Updated!",
        description: "Your home bar has been successfully saved.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/venues/home"] });
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update home bar. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleVenueSelect = (venue: VenueDetails) => {
    updateHomeVenueMutation.mutate(venue);
  };

  const handleClearHomeBar = () => {
    updateHomeVenueMutation.mutate(null);
  };

  if (isEditing) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Select Your Home Bar</CardTitle>
                <CardDescription>
                  Choose the venue where you work most frequently
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <VenueSelector
              onVenueSelect={handleVenueSelect}
              initialVenue={homeVenue ? {
                name: homeVenue.name,
                address: homeVenue.address,
                placeId: homeVenue.googlePlaceId || "",
                latitude: parseFloat(homeVenue.latitude),
                longitude: parseFloat(homeVenue.longitude),
                types: [],
              } : null}
              variant="settings"
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Home Bar
        </CardTitle>
        <CardDescription>
          Set your primary work location to receive relevant alerts
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AnimatePresence mode="wait">
          {homeVenue ? (
            <motion.div
              key="has-venue"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="p-4 rounded-lg border-2 border-green-500/20 bg-green-500/5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-green-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg mb-1">{homeVenue.name}</h3>
                      <p className="text-sm text-muted-foreground flex items-start gap-1.5">
                        <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>{homeVenue.address}</span>
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Active
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  You'll receive priority alerts for incidents near this location
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="flex-1"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Change Home Bar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearHomeBar}
                    disabled={updateHomeVenueMutation.isPending}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="no-venue"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="p-6 rounded-lg border-2 border-dashed border-border text-center">
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
                  <Building2 className="w-6 h-6 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-1">No Home Bar Set</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Set your primary work location to receive targeted compliance alerts
                </p>
                <Button
                  onClick={() => setIsEditing(true)}
                  className="w-full sm:w-auto"
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  Set Home Bar
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
