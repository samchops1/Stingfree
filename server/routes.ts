import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { attachUser, requireAuth, requireManager, requireStaff } from "./auth";
import { insertIncidentSchema, insertAlertSchema } from "@shared/schema";
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
          recentIncidents: recentIncidents.length,
        },
        staffCertifications: staffCertifications.slice(0, 5),
        recentIncidents: recentIncidents.slice(0, 3),
        alerts: alerts.filter(a => a.isActive).slice(0, 3),
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

      // If it's a validated regulatory sting, create an alert for nearby venues
      if (incident.verificationStatus === 'validated' && incident.category === 'regulatory_sting') {
        const alert = await storage.createAlert({
          venueId: incident.venueId,
          latitude: incident.latitude,
          longitude: incident.longitude,
          radiusMiles: '5.0',
          severity: incident.severity === 'high' ? 'critical' : 'standard',
          title: `Verified Regulatory Incident Nearby`,
          message: `A verified regulatory incident was reported ${new Date(incident.incidentTime).toLocaleDateString()} in your area. Review protocols and update staff training as needed.`,
          isActive: true,
          publishedAt: new Date(),
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
  // SEED DATA ROUTES (Development only)
  // ============================================================================

  if (process.env.NODE_ENV === 'development') {
    app.post("/api/seed", async (req, res) => {
      try {
        // Create sample training modules if they don't exist
        const existingModules = await storage.getAllTrainingModules();
        
        if (existingModules.length === 0) {
          const modules = [
            {
              moduleNumber: 1,
              title: "Sting Operations & Legal Framework",
              description: "Understanding regulatory compliance enforcement and your rights during sting operations",
              content: "<h2>Introduction to Sting Operations</h2><p>This module covers the legal framework around sting operations in the hospitality industry, your rights as a venue operator, and best practices for compliance.</p><h3>Key Topics:</h3><ul><li>What is a sting operation?</li><li>Legal boundaries and your rights</li><li>Documentation requirements</li><li>Staff training protocols</li></ul>",
              estimatedMinutes: 25,
              orderIndex: 1,
              isRequired: true,
            },
            {
              moduleNumber: 2,
              title: "ID Verification Best Practices",
              description: "Comprehensive guide to proper ID checking procedures and spotting fake IDs",
              content: "<h2>ID Verification Mastery</h2><p>Learn industry-standard techniques for verifying identification documents and protecting your venue from underage service violations.</p><h3>Key Topics:</h3><ul><li>Acceptable forms of ID</li><li>Security features to check</li><li>Common fake ID indicators</li><li>When to refuse service</li></ul>",
              estimatedMinutes: 30,
              orderIndex: 2,
              isRequired: true,
            },
            {
              moduleNumber: 3,
              title: "Responsible Service & Over-Service Prevention",
              description: "Techniques for identifying intoxication and managing service responsibly",
              content: "<h2>Responsible Service Protocols</h2><p>Master the skills needed to identify signs of intoxication and implement responsible service practices that protect both customers and your business.</p><h3>Key Topics:</h3><ul><li>Signs of intoxication</li><li>Service refusal techniques</li><li>De-escalation strategies</li><li>Documentation procedures</li></ul>",
              estimatedMinutes: 35,
              orderIndex: 3,
              isRequired: true,
            },
            {
              moduleNumber: 4,
              title: "Incident Response & Documentation",
              description: "Step-by-step procedures for handling regulatory incidents and maintaining compliance records",
              content: "<h2>Incident Management</h2><p>Learn the critical procedures for responding to regulatory incidents, proper documentation practices, and maintaining defensible compliance records.</p><h3>Key Topics:</h3><ul><li>Immediate response procedures</li><li>Evidence preservation</li><li>Report writing best practices</li><li>Follow-up protocols</li></ul>",
              estimatedMinutes: 20,
              orderIndex: 4,
              isRequired: true,
            },
          ];

          for (const module of modules) {
            const created = await storage.createTrainingModule(module);
            
            // Create sample quiz questions for each module
            const sampleQuestions = [
              {
                moduleId: created.id,
                questionText: `What is the most important thing to do when you suspect a regulatory compliance issue in ${module.title}?`,
                questionType: 'multiple_choice',
                options: [
                  'Immediately call the police',
                  'Document everything and follow established protocols',
                  'Confront the individual directly',
                  'Ignore it if you\'re not sure'
                ],
                correctAnswer: 'Document everything and follow established protocols',
                explanation: 'Proper documentation and following established protocols protects both you and your venue legally.',
                orderIndex: 1,
              },
              {
                moduleId: created.id,
                questionText: `Which of the following is NOT a recommended practice for ${module.title}?`,
                questionType: 'multiple_choice',
                options: [
                  'Maintaining detailed records',
                  'Regular staff training updates',
                  'Making assumptions without verification',
                  'Following documented procedures'
                ],
                correctAnswer: 'Making assumptions without verification',
                explanation: 'Always verify before acting and never make assumptions in compliance matters.',
                orderIndex: 2,
              },
              {
                moduleId: created.id,
                questionText: `In a scenario related to ${module.title}, what should be your first priority?`,
                questionType: 'multiple_choice',
                options: [
                  'Customer satisfaction',
                  'Legal compliance and safety',
                  'Speed of service',
                  'Avoiding confrontation'
                ],
                correctAnswer: 'Legal compliance and safety',
                explanation: 'Compliance and safety always come first, protecting both staff and customers.',
                orderIndex: 3,
              },
            ];

            for (const question of sampleQuestions) {
              await storage.createQuizQuestion(question);
            }
          }

          res.json({ message: "Seed data created successfully", moduleCount: modules.length });
        } else {
          res.json({ message: "Modules already exist", moduleCount: existingModules.length });
        }
      } catch (error) {
        console.error("Error seeding data:", error);
        res.status(500).json({ message: "Failed to seed data" });
      }
    });
  }

  const httpServer = createServer(app);
  return httpServer;
}
