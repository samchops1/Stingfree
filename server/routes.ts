import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { attachUser, requireAuth, requireManager, requireStaff } from "./auth";
import { insertIncidentSchema, insertAlertSchema, insertVenueSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up Replit Auth
  await setupAuth(app);
  
  // Attach user to all requests
  app.use(attachUser);

  // ============================================================================
  // AUTH ROUTES
  // ============================================================================

  // Get current user (already attached by attachUser middleware)
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      // User is already attached by attachUser middleware after isAuthenticated
      // We need to fetch the full user data again to ensure we have the latest
      const userId = req.user?.claims?.sub || req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // ============================================================================
  // USER ROUTES
  // ============================================================================

  // Set user's home venue
  app.put("/api/users/home-venue", isAuthenticated, attachUser, async (req, res) => {
    try {
      if (!req.dbUser) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { homeVenueId } = req.body;

      // Verify venue exists
      const venue = await storage.getVenue(homeVenueId);
      if (!venue) {
        return res.status(404).json({ message: "Venue not found" });
      }

      const updatedUser = await storage.updateUser(req.dbUser.id, {
        homeVenueId,
      });

      res.json(updatedUser);
    } catch (error) {
      console.error("Error setting home venue:", error);
      res.status(500).json({ message: "Failed to set home venue" });
    }
  });

  // Clear user's home venue
  app.delete("/api/users/home-venue", isAuthenticated, attachUser, async (req, res) => {
    try {
      if (!req.dbUser) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const updatedUser = await storage.updateUser(req.dbUser.id, {
        homeVenueId: null,
      });

      res.json(updatedUser);
    } catch (error) {
      console.error("Error clearing home venue:", error);
      res.status(500).json({ message: "Failed to clear home venue" });
    }
  });

  // ============================================================================
  // MANAGER ROUTES - Dashboard & Analytics
  // ============================================================================

  // Get manager dashboard data
  app.get("/api/manager/dashboard", isAuthenticated, attachUser, requireManager, async (req, res) => {
    try {
      if (!req.dbUser?.venueId) {
        return res.status(400).json({ message: "No venue associated with this manager" });
      }

      const venue = await storage.getVenue(req.dbUser.venueId);
      if (!venue) {
        return res.status(404).json({ message: "Venue not found" });
      }

      // Get staff compliance data
      const staffCertifications = await storage.getVenueStaffCertifications(req.dbUser.venueId);
      
      // Get recent incidents
      const recentIncidents = await storage.getIncidentsByVenue(req.dbUser.venueId, 10);
      
      // Get active alerts
      const alerts = await storage.getAlertsByVenue(req.dbUser.venueId);

      // Calculate metrics
      const totalStaff = staffCertifications.length;
      const certifiedStaff = staffCertifications.filter(c => c.status === 'active').length;
      const expiringCertifications = staffCertifications.filter(c => c.status === 'expiring_soon').length;
      const criticalAlerts = alerts.filter(a => a.severity === 'critical' && a.isActive).length;

      res.json({
        venue,
        metrics: {
          totalStaff,
          certifiedStaff,
          expiringCertifications,
          criticalAlerts,
        },
        staffCertifications: staffCertifications.slice(0, 5),
        recentIncidents: recentIncidents.slice(0, 3),
        recentAlerts: alerts.filter(a => a.isActive).slice(0, 5),
      });
    } catch (error) {
      console.error("Error fetching manager dashboard:", error);
      res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
  });

  // Get all staff for a venue
  app.get("/api/manager/staff", isAuthenticated, attachUser, requireManager, async (req, res) => {
    try {
      if (!req.dbUser?.venueId) {
        return res.status(400).json({ message: "No venue associated with this manager" });
      }

      const staffCertifications = await storage.getVenueStaffCertifications(req.dbUser.venueId);
      res.json(staffCertifications);
    } catch (error) {
      console.error("Error fetching staff:", error);
      res.status(500).json({ message: "Failed to fetch staff" });
    }
  });

  // Get all alerts for manager
  app.get("/api/manager/alerts", isAuthenticated, attachUser, requireManager, async (req, res) => {
    try {
      if (!req.dbUser?.venueId) {
        return res.status(400).json({ message: "No venue associated with this manager" });
      }

      const alerts = await storage.getAlertsByVenue(req.dbUser.venueId);
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching alerts:", error);
      res.status(500).json({ message: "Failed to fetch alerts" });
    }
  });

  // Create a new alert (manager only)
  app.post("/api/manager/alerts", isAuthenticated, attachUser, requireManager, async (req, res) => {
    try {
      const alertData = insertAlertSchema.omit({ id: true }).parse(req.body);
      const alert = await storage.createAlert(alertData);
      res.status(201).json(alert);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating alert:", error);
      res.status(500).json({ message: "Failed to create alert" });
    }
  });

  // Create a new venue and assign manager to it
  app.post("/api/venues", isAuthenticated, attachUser, async (req, res) => {
    try {
      const venueData = insertVenueSchema.parse(req.body);
      const venue = await storage.createVenue(venueData);
      
      // Assign the current user (assumed to be a manager) to this venue
      if (req.dbUser) {
        await storage.updateUser(req.dbUser.id, {
          venueId: venue.id,
          role: 'manager', // Ensure they are a manager
        });
      }
      
      res.status(201).json(venue);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating venue:", error);
      res.status(500).json({ message: "Failed to create venue" });
    }
  });

  // Find or create venue (for home bar selection)
  app.post("/api/venues/find-or-create", isAuthenticated, attachUser, async (req, res) => {
    try {
      const { googlePlaceId, name, address, latitude, longitude, geofenceRadiusMiles } = req.body;

      // Try to find existing venue by Google Place ID
      if (googlePlaceId) {
        const existingVenue = await storage.getVenueByPlaceId(googlePlaceId);
        if (existingVenue) {
          return res.json(existingVenue);
        }
      }

      // Create new venue
      const venue = await storage.createVenue({
        name,
        address,
        googlePlaceId,
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        geofenceRadiusMiles: geofenceRadiusMiles?.toString() || "5.0",
      });

      res.status(201).json(venue);
    } catch (error) {
      console.error("Error finding or creating venue:", error);
      res.status(500).json({ message: "Failed to find or create venue" });
    }
  });

  // Get user's home venue
  app.get("/api/venues/home", isAuthenticated, attachUser, async (req, res) => {
    try {
      if (!req.dbUser?.homeVenueId) {
        return res.json(null);
      }

      const venue = await storage.getVenue(req.dbUser.homeVenueId);
      res.json(venue);
    } catch (error) {
      console.error("Error fetching home venue:", error);
      res.status(500).json({ message: "Failed to fetch home venue" });
    }
  });

  // Update venue details
  app.patch("/api/venues/:id", isAuthenticated, attachUser, requireManager, async (req, res) => {
    try {
      const { id } = req.params;

      // Ensure manager owns this venue
      if (req.dbUser?.venueId !== id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const updates = req.body;
      const venue = await storage.updateVenue(id, updates);

      if (!venue) {
        return res.status(404).json({ message: "Venue not found" });
      }

      res.json(venue);
    } catch (error) {
      console.error("Error updating venue:", error);
      res.status(500).json({ message: "Failed to update venue" });
    }
  });

  // Update alert status (archive)
  app.patch("/api/manager/alerts/:id", isAuthenticated, attachUser, requireManager, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const alert = await storage.updateAlert(id, updates);
      if (!alert) {
        return res.status(404).json({ message: "Alert not found" });
      }
      
      res.json(alert);
    } catch (error) {
      console.error("Error updating alert:", error);
      res.status(500).json({ message: "Failed to update alert" });
    }
  });

  // ============================================================================
  // STAFF ROUTES - Training & Certification
  // ============================================================================

  // Get staff dashboard data
  app.get("/api/staff/dashboard", isAuthenticated, attachUser, requireStaff, async (req, res) => {
    try {
      // Get user's certification
      const certification = await storage.getUserCertification(req.dbUser!.id);
      
      // Get user's progress on all modules
      const progress = await storage.getUserProgress(req.dbUser!.id);
      
      // Get all training modules
      const modules = await storage.getAllTrainingModules();

      res.json({
        certification,
        progress,
        modules,
      });
    } catch (error) {
      console.error("Error fetching staff dashboard:", error);
      res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
  });

  // Get all training modules
  app.get("/api/training/modules", isAuthenticated, attachUser, requireStaff, async (req, res) => {
    try {
      const modules = await storage.getAllTrainingModules();
      res.json(modules);
    } catch (error) {
      console.error("Error fetching training modules:", error);
      res.status(500).json({ message: "Failed to fetch training modules" });
    }
  });

  // Get a specific training module with questions and progress
  app.get("/api/training/modules/:id", isAuthenticated, attachUser, requireStaff, async (req, res) => {
    try {
      const { id } = req.params;
      
      const module = await storage.getTrainingModule(id);
      if (!module) {
        return res.status(404).json({ message: "Module not found" });
      }

      const questions = await storage.getQuizQuestionsByModule(id);
      const progress = await storage.getModuleProgress(req.dbUser!.id, id);

      res.json({
        module,
        questions,
        progress,
      });
    } catch (error) {
      console.error("Error fetching training module:", error);
      res.status(500).json({ message: "Failed to fetch training module" });
    }
  });

  // Start a training module
  app.post("/api/training/modules/:id/start", isAuthenticated, attachUser, requireStaff, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if module exists
      const module = await storage.getTrainingModule(id);
      if (!module) {
        return res.status(404).json({ message: "Module not found" });
      }

      // Check if progress already exists
      const existingProgress = await storage.getModuleProgress(req.dbUser!.id, id);
      if (existingProgress) {
        return res.json(existingProgress);
      }

      // Create new progress entry
      const progress = await storage.createUserProgress({
        userId: req.dbUser!.id,
        moduleId: id,
        startedAt: new Date(),
        passed: false,
      });

      res.status(201).json(progress);
    } catch (error) {
      console.error("Error starting module:", error);
      res.status(500).json({ message: "Failed to start module" });
    }
  });

  // Submit quiz answers and get results
  app.post("/api/training/modules/:id/quiz", isAuthenticated, attachUser, requireStaff, async (req, res) => {
    try {
      const { id: moduleId } = req.params;
      const { answers } = req.body;

      if (!answers || typeof answers !== 'object') {
        return res.status(400).json({ message: "Invalid answers format" });
      }

      // Get all questions for the module
      const questions = await storage.getQuizQuestionsByModule(moduleId);
      if (questions.length === 0) {
        return res.status(404).json({ message: "No quiz questions found for this module" });
      }

      // Grade the quiz
      let correctCount = 0;
      const totalQuestions = questions.length;

      for (const question of questions) {
        const userAnswer = answers[question.id];
        if (userAnswer === question.correctAnswer) {
          correctCount++;
        }
      }

      const score = Math.round((correctCount / totalQuestions) * 100);
      const passed = score >= 80; // 80% passing grade

      // Update user progress
      const existingProgress = await storage.getModuleProgress(req.dbUser!.id, moduleId);
      
      if (existingProgress) {
        await storage.updateUserProgress(existingProgress.id, {
          completedAt: passed ? new Date() : undefined,
          passed,
          quizScore: score,
          quizAttempts: (existingProgress.quizAttempts || 0) + 1,
        });
      }

      // Check if user has completed all modules
      if (passed) {
        const allProgress = await storage.getUserProgress(req.dbUser!.id);
        const allModules = await storage.getAllTrainingModules();
        const requiredModules = allModules.filter(m => m.isRequired);
        
        const completedRequired = allProgress.filter(p => 
          p.passed && requiredModules.some(m => m.id === p.moduleId)
        );

        // If all required modules are completed, update/create certification
        if (completedRequired.length === requiredModules.length) {
          const existingCert = await storage.getUserCertification(req.dbUser!.id);
          
          if (existingCert) {
            await storage.updateCertification(existingCert.id, {
              status: 'active',
              lastCertifiedAt: new Date(),
              expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
              requiresRecertification: false,
              recertificationReason: null,
            });
          } else {
            await storage.createCertification({
              userId: req.dbUser!.id,
              status: 'active',
              lastCertifiedAt: new Date(),
              expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
              incidentCount: 0,
              requiresRecertification: false,
            });
          }
        }
      }

      res.json({
        passed,
        score,
        correctCount,
        totalQuestions,
      });
    } catch (error) {
      console.error("Error submitting quiz:", error);
      res.status(500).json({ message: "Failed to submit quiz" });
    }
  });

  // ============================================================================
  // INCIDENT ROUTES (Both roles)
  // ============================================================================

  // Create incident report
  app.post("/api/incidents", isAuthenticated, attachUser, requireAuth, async (req, res) => {
    try {
      // Validate input
      const incidentData = insertIncidentSchema.omit({ id: true, createdAt: true, updatedAt: true }).parse({
        ...req.body,
        reportedBy: req.dbUser!.id,
        venueId: req.dbUser!.venueId || req.body.venueId,
      });

      const incident = await storage.createIncident(incidentData);

      // Automatic Recertification: If staff member is involved in incident, trigger recertification
      if (incident.reporterId && (incident.category === 'regulatory_sting' || incident.verificationStatus === 'validated')) {
        const reporter = await storage.getUser(incident.reporterId);
        if (reporter) {
          const certification = await storage.getUserCertification(incident.reporterId);

          if (certification) {
            // Mark for recertification and increment incident count
            await storage.updateCertification(certification.id, {
              requiresRecertification: true,
              recertificationReason: `Involved in ${incident.category === 'regulatory_sting' ? 'regulatory sting operation' : 'validated compliance incident'} on ${new Date(incident.incidentTimestamp).toLocaleDateString()}. Mandatory retraining required per compliance policy.`,
              relatedIncidentCount: (certification.relatedIncidentCount || 0) + 1,
              status: 'expired', // Revoke active certification
            });

            console.log(`Automatic recertification triggered for user ${incident.reporterId} due to incident ${incident.id}`);
          }
        }
      }

      // If it's a validated regulatory sting, create an alert and broadcast to nearby managers
      if (incident.verificationStatus === 'validated' && incident.category === 'regulatory_sting') {
        const alert = await storage.createAlert({
          incidentId: incident.id,
          latitude: incident.latitude,
          longitude: incident.longitude,
          radiusMiles: '5.0',
          severity: 'critical',
          title: `Verified Regulatory Incident Nearby`,
          message: `A verified regulatory incident was reported ${new Date(incident.incidentTimestamp).toLocaleDateString()} in your area. Review protocols and update staff training as needed.`,
          isActive: true,
        });

        // Broadcast push notification to all managers within geofence
        const { sendGeofencedAlert } = require("./pushNotifications");
        const lat = parseFloat(incident.latitude);
        const lon = parseFloat(incident.longitude);

        sendGeofencedAlert(lat, lon, 5.0, {
          title: '🚨 Verified Sting Operation Nearby',
          body: `A regulatory incident was reported in your area on ${new Date(incident.incidentTimestamp).toLocaleDateString()}. Tap to review and update protocols.`,
          icon: '/icon-192.png',
          badge: '/badge-72.png',
          tag: `alert-${alert.id}`,
          requireInteraction: true,
          data: {
            url: '/alerts',
            alertId: alert.id,
            incidentId: incident.id,
            type: 'regulatory_sting',
          },
          actions: [
            {
              action: 'view',
              title: 'View Details',
            },
            {
              action: 'dismiss',
              title: 'Dismiss',
            },
          ],
          vibrate: [200, 100, 200, 100, 200],
        }).catch(err => {
          console.error('Failed to send geofenced alert:', err);
        });
      }

      res.status(201).json(incident);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating incident:", error);
      res.status(500).json({ message: "Failed to create incident" });
    }
  });

  // Get incident by ID
  app.get("/api/incidents/:id", isAuthenticated, attachUser, requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const incident = await storage.getIncidentById(id);
      
      if (!incident) {
        return res.status(404).json({ message: "Incident not found" });
      }

      // Check if user has access to this incident
      if (req.dbUser!.role === 'staff' && incident.reportedBy !== req.dbUser!.id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      res.json(incident);
    } catch (error) {
      console.error("Error fetching incident:", error);
      res.status(500).json({ message: "Failed to fetch incident" });
    }
  });

  // Update incident (manager only - for verification)
  app.patch("/api/incidents/:id", isAuthenticated, attachUser, requireManager, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const incident = await storage.updateIncident(id, updates);
      if (!incident) {
        return res.status(404).json({ message: "Incident not found" });
      }
      
      res.json(incident);
    } catch (error) {
      console.error("Error updating incident:", error);
      res.status(500).json({ message: "Failed to update incident" });
    }
  });

  // Get all incidents for a venue (manager only)
  app.get("/api/venues/:venueId/incidents", isAuthenticated, attachUser, requireManager, async (req, res) => {
    try {
      const { venueId } = req.params;
      
      // Check if manager has access to this venue
      if (req.dbUser!.venueId !== venueId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const incidents = await storage.getIncidentsByVenue(venueId, 100);
      res.json(incidents);
    } catch (error) {
      console.error("Error fetching venue incidents:", error);
      res.status(500).json({ message: "Failed to fetch incidents" });
    }
  });

  // ============================================================================
  // PUSH NOTIFICATION ROUTES
  // ============================================================================

  // Get VAPID public key for client-side push subscription
  app.get("/api/push/vapid-public-key", (req, res) => {
    const { getVAPIDPublicKey } = require("./pushNotifications");
    res.json({ publicKey: getVAPIDPublicKey() });
  });

  // Register push subscription
  app.post("/api/push/subscribe", isAuthenticated, attachUser, requireAuth, async (req, res) => {
    try {
      const { subscribeToPush } = require("./pushNotifications");
      const { subscription } = req.body;

      if (!subscription || !subscription.endpoint) {
        return res.status(400).json({ message: "Invalid subscription data" });
      }

      await subscribeToPush(
        req.dbUser!.id,
        subscription,
        req.headers['user-agent']
      );

      res.json({ success: true, message: "Push subscription registered" });
    } catch (error) {
      console.error("Error registering push subscription:", error);
      res.status(500).json({ message: "Failed to register push subscription" });
    }
  });

  // Unsubscribe from push notifications
  app.post("/api/push/unsubscribe", isAuthenticated, attachUser, requireAuth, async (req, res) => {
    try {
      const { unsubscribeFromPush } = require("./pushNotifications");
      const { endpoint } = req.body;

      if (!endpoint) {
        return res.status(400).json({ message: "Endpoint is required" });
      }

      await unsubscribeFromPush(endpoint);
      res.json({ success: true, message: "Push subscription removed" });
    } catch (error) {
      console.error("Error unsubscribing from push:", error);
      res.status(500).json({ message: "Failed to unsubscribe from push" });
    }
  });

  // Send test notification (for testing purposes)
  app.post("/api/push/test", isAuthenticated, attachUser, requireAuth, async (req, res) => {
    try {
      const { sendTestNotification } = require("./pushNotifications");
      const result = await sendTestNotification(req.dbUser!.id);
      res.json({ success: true, result });
    } catch (error) {
      console.error("Error sending test notification:", error);
      res.status(500).json({ message: "Failed to send test notification" });
    }
  });

  // ============================================================================
  // SEED DATA ROUTES
  // ============================================================================

  app.post("/api/seed", async (req, res) => {
      try {
        // Import comprehensive training content
        const { trainingModules, quizQuestions } = await import("./trainingContent");

        // Create training modules if they don't exist
        const existingModules = await storage.getAllTrainingModules();

        if (existingModules.length === 0) {
          for (const moduleData of trainingModules) {
            const created = await storage.createTrainingModule(moduleData);

            // Create quiz questions for this module
            const moduleQuestions = quizQuestions[moduleData.moduleNumber as keyof typeof quizQuestions] || [];
            for (const question of moduleQuestions) {
              await storage.createQuizQuestion({
                moduleId: created.id,
                ...question,
              });
            }
          }

          res.json({
            message: "Comprehensive training content created successfully",
            moduleCount: trainingModules.length,
            totalQuestions: Object.values(quizQuestions).reduce((sum, q) => sum + q.length, 0)
          });
        } else {
          res.json({ message: "Modules already exist", moduleCount: existingModules.length });
        }
      } catch (error) {
        console.error("Error seeding data:", error);
        res.status(500).json({ message: "Failed to seed data" });
      }
    });

  const httpServer = createServer(app);
  return httpServer;
}
