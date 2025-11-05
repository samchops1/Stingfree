import { useState, useEffect, useRef } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Search,
  Loader2,
  CheckCircle2,
  Navigation,
  Building2
} from "lucide-react";
import { motion } from "framer-motion";

interface VenueDetails {
  name: string;
  address: string;
  placeId: string;
  latitude: number;
  longitude: number;
  types: string[];
}

interface VenueSelectorProps {
  onVenueSelect: (venue: VenueDetails) => void;
  initialVenue?: VenueDetails | null;
  variant?: "onboarding" | "settings";
}

export function VenueSelector({ onVenueSelect, initialVenue, variant = "onboarding" }: VenueSelectorProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [searchBox, setSearchBox] = useState<google.maps.places.SearchBox | null>(null);
  const [selectedVenue, setSelectedVenue] = useState<VenueDetails | null>(initialVenue || null);
  const [currentMarker, setCurrentMarker] = useState<google.maps.Marker | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Initialize Google Maps
  useEffect(() => {
    const loader = new Loader({
      apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
      version: "weekly",
      libraries: ["places"],
    });

    loader.load().then(async () => {
      if (!mapRef.current) return;

      // Get user's current location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const userPos = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };
            setUserLocation(userPos);

            // Initialize map centered on user location
            const googleMap = new google.maps.Map(mapRef.current!, {
              center: userPos,
              zoom: 15,
              mapTypeControl: false,
              fullscreenControl: false,
              streetViewControl: false,
              styles: [
                {
                  featureType: "poi",
                  elementType: "labels",
                  stylers: [{ visibility: "off" }],
                },
              ],
            });

            setMap(googleMap);

            // Add current location marker
            new google.maps.Marker({
              position: userPos,
              map: googleMap,
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: "#3b82f6",
                fillOpacity: 1,
                strokeColor: "#ffffff",
                strokeWeight: 2,
              },
            });

            setIsLoading(false);
          },
          () => {
            // Fallback to default location if geolocation fails
            const defaultPos = { lat: 40.7128, lng: -74.006 }; // New York
            const googleMap = new google.maps.Map(mapRef.current!, {
              center: defaultPos,
              zoom: 12,
              mapTypeControl: false,
              fullscreenControl: false,
              streetViewControl: false,
            });
            setMap(googleMap);
            setIsLoading(false);
          }
        );
      }
    });
  }, []);

  // Initialize SearchBox
  useEffect(() => {
    if (map && searchInputRef.current) {
      const searchBoxInstance = new google.maps.places.SearchBox(searchInputRef.current, {
        bounds: map.getBounds() || undefined,
      });

      searchBoxInstance.addListener("places_changed", () => {
        const places = searchBoxInstance.getPlaces();
        if (!places || places.length === 0) return;

        const place = places[0];
        if (!place.geometry?.location) return;

        // Clear previous marker
        if (currentMarker) {
          currentMarker.setMap(null);
        }

        // Create new marker
        const marker = new google.maps.Marker({
          map,
          position: place.geometry.location,
          animation: google.maps.Animation.DROP,
        });

        setCurrentMarker(marker);

        // Center map on selected place
        map.setCenter(place.geometry.location);
        map.setZoom(17);

        // Extract venue details
        const venue: VenueDetails = {
          name: place.name || "",
          address: place.formatted_address || "",
          placeId: place.place_id || "",
          latitude: place.geometry.location.lat(),
          longitude: place.geometry.location.lng(),
          types: place.types || [],
        };

        setSelectedVenue(venue);
      });

      setSearchBox(searchBoxInstance);

      // Update search box bounds when map bounds change
      map.addListener("bounds_changed", () => {
        searchBoxInstance.setBounds(map.getBounds() || undefined);
      });
    }
  }, [map]);

  const handleConfirmVenue = () => {
    if (selectedVenue) {
      onVenueSelect(selectedVenue);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!userLocation || !map) return;

    // Search for nearby bars/restaurants
    const service = new google.maps.places.PlacesService(map);
    service.nearbySearch(
      {
        location: userLocation,
        radius: 100,
        type: "bar",
      },
      (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
          const place = results[0];
          if (!place.geometry?.location) return;

          // Clear previous marker
          if (currentMarker) {
            currentMarker.setMap(null);
          }

          // Create new marker
          const marker = new google.maps.Marker({
            map,
            position: place.geometry.location,
            animation: google.maps.Animation.DROP,
          });

          setCurrentMarker(marker);
          map.setCenter(place.geometry.location);
          map.setZoom(17);

          // Get detailed info
          service.getDetails(
            { placeId: place.place_id! },
            (detailResult, detailStatus) => {
              if (detailStatus === google.maps.places.PlacesServiceStatus.OK && detailResult) {
                const venue: VenueDetails = {
                  name: detailResult.name || "",
                  address: detailResult.formatted_address || "",
                  placeId: detailResult.place_id || "",
                  latitude: detailResult.geometry?.location?.lat() || 0,
                  longitude: detailResult.geometry?.location?.lng() || 0,
                  types: detailResult.types || [],
                };
                setSelectedVenue(venue);
              }
            }
          );
        }
      }
    );
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Search for bars, restaurants, venues..."
              className="pl-10 h-12 text-base"
              disabled={isLoading}
            />
          </div>
          {userLocation && (
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-3"
              onClick={handleUseCurrentLocation}
            >
              <Navigation className="w-4 h-4 mr-2" />
              Find Venues Near Me
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Map */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div
            ref={mapRef}
            className="w-full h-[400px] bg-muted relative"
          >
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
                  <p className="text-sm text-muted-foreground">Loading map...</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Selected Venue Details */}
      {selectedVenue && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-2 border-green-500/20 bg-green-500/5">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-6 h-6 text-green-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <h3 className="font-semibold text-lg mb-1">{selectedVenue.name}</h3>
                      <p className="text-sm text-muted-foreground flex items-start gap-1.5">
                        <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>{selectedVenue.address}</span>
                      </p>
                    </div>
                    <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Selected
                    </Badge>
                  </div>
                  {selectedVenue.types.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {selectedVenue.types
                        .filter(type => !type.includes('_'))
                        .slice(0, 3)
                        .map((type) => (
                          <Badge key={type} variant="secondary" className="text-xs capitalize">
                            {type.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              <Button
                className="w-full mt-4 h-12 text-base bg-gradient-to-r from-green-500 to-green-600"
                onClick={handleConfirmVenue}
              >
                <CheckCircle2 className="w-5 h-5 mr-2" />
                {variant === "onboarding" ? "Confirm Venue" : "Set as Home Bar"}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
