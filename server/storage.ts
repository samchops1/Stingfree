import { eq, and, desc, sql, lt, gte, lte } from "drizzle-orm";
import { db } from "./db";
import type {
  User,
  InsertUser,
  Venue,
  InsertVenue,
  TrainingModule,
  InsertTrainingModule,
  QuizQuestion,
  InsertQuizQuestion,
  UserProgress,
  InsertUserProgress,
  Certification,
  InsertCertification,
  Incident,
  InsertIncident,
  Alert,
  InsertAlert,
} from "@shared/schema";
import {
  users,
  venues,
  trainingModules,
  quizQuestions,
  userProgress,
  certifications,
  incidents,
  alerts,
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined>;
  upsertUser(user: any): Promise<User>; // For Replit Auth
  getUsersByVenue(venueId: string): Promise<User[]>;

  // Venue operations
  getVenue(id: string): Promise<Venue | undefined>;
  getVenuesByManager(managerId: string): Promise<Venue[]>;
  createVenue(venue: InsertVenue): Promise<Venue>;
  updateVenue(id: string, updates: Partial<InsertVenue>): Promise<Venue | undefined>;

  // Training Module operations
  getAllTrainingModules(): Promise<TrainingModule[]>;
  getTrainingModule(id: string): Promise<TrainingModule | undefined>;
  createTrainingModule(module: InsertTrainingModule): Promise<TrainingModule>;
  updateTrainingModule(id: string, updates: Partial<InsertTrainingModule>): Promise<TrainingModule | undefined>;

  // Quiz Question operations
  getQuizQuestionsByModule(moduleId: string): Promise<QuizQuestion[]>;
  createQuizQuestion(question: InsertQuizQuestion): Promise<QuizQuestion>;

  // User Progress operations
  getUserProgress(userId: string): Promise<UserProgress[]>;
  getModuleProgress(userId: string, moduleId: string): Promise<UserProgress | undefined>;
  createUserProgress(progress: InsertUserProgress): Promise<UserProgress>;
  updateUserProgress(id: string, updates: Partial<InsertUserProgress>): Promise<UserProgress | undefined>;

  // Certification operations
  getUserCertification(userId: string): Promise<Certification | undefined>;
  createCertification(cert: InsertCertification): Promise<Certification>;
  updateCertification(id: string, updates: Partial<InsertCertification>): Promise<Certification | undefined>;
  getVenueStaffCertifications(venueId: string): Promise<Array<Certification & { user: User }>>;

  // Incident operations
  createIncident(incident: InsertIncident): Promise<Incident>;
  getIncidentsByVenue(venueId: string, limit?: number): Promise<Incident[]>;
  updateIncident(id: string, updates: Partial<InsertIncident>): Promise<Incident | undefined>;
  getIncidentById(id: string): Promise<Incident | undefined>;

  // Alert operations
  createAlert(alert: InsertAlert): Promise<Alert>;
  getActiveAlertsByLocation(latitude: string, longitude: string, radiusMiles: string): Promise<Alert[]>;
  getAlertsByVenue(venueId: string): Promise<Alert[]>;
  updateAlert(id: string, updates: Partial<InsertAlert>): Promise<Alert | undefined>;
}

export class PostgresStorage implements IStorage {
  // ============================================================================
  // USER OPERATIONS
  // ============================================================================

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getUsersByVenue(venueId: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.venueId, venueId));
  }

  async upsertUser(userData: any): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        id: userData.id,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        profileImageUrl: userData.profileImageUrl,
        // role and venueId will use schema defaults on first insert
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          // Only update profile fields on subsequent logins, preserve role and venueId
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // ============================================================================
  // VENUE OPERATIONS
  // ============================================================================

  async getVenue(id: string): Promise<Venue | undefined> {
    const [venue] = await db.select().from(venues).where(eq(venues.id, id)).limit(1);
    return venue;
  }

  async getVenuesByManager(managerId: string): Promise<Venue[]> {
    const managerUser = await this.getUser(managerId);
    if (!managerUser?.venueId) return [];
    
    const venue = await this.getVenue(managerUser.venueId);
    return venue ? [venue] : [];
  }

  async createVenue(insertVenue: InsertVenue): Promise<Venue> {
    const [venue] = await db.insert(venues).values(insertVenue).returning();
    return venue;
  }

  async updateVenue(id: string, updates: Partial<InsertVenue>): Promise<Venue | undefined> {
    const [venue] = await db
      .update(venues)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(venues.id, id))
      .returning();
    return venue;
  }

  // ============================================================================
  // TRAINING MODULE OPERATIONS
  // ============================================================================

  async getAllTrainingModules(): Promise<TrainingModule[]> {
    return await db.select().from(trainingModules).orderBy(trainingModules.orderIndex);
  }

  async getTrainingModule(id: string): Promise<TrainingModule | undefined> {
    const [module] = await db
      .select()
      .from(trainingModules)
      .where(eq(trainingModules.id, id))
      .limit(1);
    return module;
  }

  async createTrainingModule(module: InsertTrainingModule): Promise<TrainingModule> {
    const [created] = await db.insert(trainingModules).values(module).returning();
    return created;
  }

  async updateTrainingModule(
    id: string,
    updates: Partial<InsertTrainingModule>
  ): Promise<TrainingModule | undefined> {
    const [module] = await db
      .update(trainingModules)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(trainingModules.id, id))
      .returning();
    return module;
  }

  // ============================================================================
  // QUIZ QUESTION OPERATIONS
  // ============================================================================

  async getQuizQuestionsByModule(moduleId: string): Promise<QuizQuestion[]> {
    return await db
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.moduleId, moduleId))
      .orderBy(quizQuestions.orderIndex);
  }

  async createQuizQuestion(question: InsertQuizQuestion): Promise<QuizQuestion> {
    const [created] = await db.insert(quizQuestions).values(question).returning();
    return created;
  }

  // ============================================================================
  // USER PROGRESS OPERATIONS
  // ============================================================================

  async getUserProgress(userId: string): Promise<UserProgress[]> {
    return await db.select().from(userProgress).where(eq(userProgress.userId, userId));
  }

  async getModuleProgress(userId: string, moduleId: string): Promise<UserProgress | undefined> {
    const [progress] = await db
      .select()
      .from(userProgress)
      .where(and(eq(userProgress.userId, userId), eq(userProgress.moduleId, moduleId)))
      .limit(1);
    return progress;
  }

  async createUserProgress(progress: InsertUserProgress): Promise<UserProgress> {
    const [created] = await db.insert(userProgress).values(progress).returning();
    return created;
  }

  async updateUserProgress(
    id: string,
    updates: Partial<InsertUserProgress>
  ): Promise<UserProgress | undefined> {
    const [progress] = await db
      .update(userProgress)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(userProgress.id, id))
      .returning();
    return progress;
  }

  // ============================================================================
  // CERTIFICATION OPERATIONS
  // ============================================================================

  async getUserCertification(userId: string): Promise<Certification | undefined> {
    const [cert] = await db
      .select()
      .from(certifications)
      .where(eq(certifications.userId, userId))
      .limit(1);
    return cert;
  }

  async createCertification(cert: InsertCertification): Promise<Certification> {
    const [created] = await db.insert(certifications).values(cert).returning();
    return created;
  }

  async updateCertification(
    id: string,
    updates: Partial<InsertCertification>
  ): Promise<Certification | undefined> {
    const [cert] = await db
      .update(certifications)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(certifications.id, id))
      .returning();
    return cert;
  }

  async getVenueStaffCertifications(venueId: string): Promise<Array<Certification & { user: User }>> {
    const result = await db
      .select()
      .from(certifications)
      .innerJoin(users, eq(certifications.userId, users.id))
      .where(eq(users.venueId, venueId));

    return result.map(({ certifications: cert, users: user }) => ({
      ...cert,
      user,
    }));
  }

  // ============================================================================
  // INCIDENT OPERATIONS
  // ============================================================================

  async createIncident(incident: InsertIncident): Promise<Incident> {
    const [created] = await db.insert(incidents).values(incident).returning();
    return created;
  }

  async getIncidentsByVenue(venueId: string, limit = 50): Promise<Incident[]> {
    return await db
      .select()
      .from(incidents)
      .where(eq(incidents.venueId, venueId))
      .orderBy(desc(incidents.incidentTime))
      .limit(limit);
  }

  async updateIncident(id: string, updates: Partial<InsertIncident>): Promise<Incident | undefined> {
    const [incident] = await db
      .update(incidents)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(incidents.id, id))
      .returning();
    return incident;
  }

  async getIncidentById(id: string): Promise<Incident | undefined> {
    const [incident] = await db.select().from(incidents).where(eq(incidents.id, id)).limit(1);
    return incident;
  }

  // ============================================================================
  // ALERT OPERATIONS (with geofence calculations)
  // ============================================================================

  async createAlert(alert: InsertAlert): Promise<Alert> {
    const [created] = await db.insert(alerts).values(alert).returning();
    return created;
  }

  async getActiveAlertsByLocation(
    latitude: string,
    longitude: string,
    radiusMiles: string
  ): Promise<Alert[]> {
    // Using Haversine formula to calculate distance
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    const radius = parseFloat(radiusMiles);

    // Get all active alerts and filter by distance
    const activeAlerts = await db
      .select()
      .from(alerts)
      .where(and(eq(alerts.isActive, true)));

    return activeAlerts.filter((alert) => {
      const alertLat = parseFloat(alert.latitude);
      const alertLon = parseFloat(alert.longitude);
      const alertRadius = parseFloat(alert.radiusMiles || '5.0');

      const distance = this.calculateDistance(lat, lon, alertLat, alertLon);
      return distance <= radius + alertRadius;
    });
  }

  async getAlertsByVenue(venueId: string): Promise<Alert[]> {
    const venue = await this.getVenue(venueId);
    if (!venue) return [];

    return this.getActiveAlertsByLocation(
      venue.latitude,
      venue.longitude,
      venue.geofenceRadiusMiles || '5.0'
    );
  }

  async updateAlert(id: string, updates: Partial<InsertAlert>): Promise<Alert | undefined> {
    const [alert] = await db
      .update(alerts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(alerts.id, id))
      .returning();
    return alert;
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  // Calculate distance between two lat/lon coordinates using Haversine formula
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

export const storage = new PostgresStorage();
