import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  decimal,
  pgEnum,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================================
// REPLIT AUTH TABLES (Mandatory for Replit Auth)
// ============================================================================

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// ============================================================================
// ENUMS
// ============================================================================

export const userRoleEnum = pgEnum('user_role', ['manager', 'staff']);
export const incidentCategoryEnum = pgEnum('incident_category', [
  'regulatory_sting',
  'unverified_hotspot',
  'operational_incident'
]);
export const verificationStatusEnum = pgEnum('verification_status', [
  'pending',
  'validated',
  'archived'
]);
export const certificationStatusEnum = pgEnum('certification_status', [
  'active',
  'expiring_soon',
  'expired',
  'not_certified'
]);
export const subscriptionTierEnum = pgEnum('subscription_tier', [
  'starter',
  'professional',
  'enterprise'
]);

// ============================================================================
// USER & VENUE TABLES
// ============================================================================

// Users table with Replit Auth fields + role-based access
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: userRoleEnum("role").notNull().default('staff'),
  venueId: varchar("venue_id"), // Foreign key to venues (for managers)
  homeVenueId: varchar("home_venue_id"), // Home bar for staff members
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Venues table for venue/location management
export const venues = pgTable("venues", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  legalEntityId: varchar("legal_entity_id"),
  googlePlaceId: varchar("google_place_id"), // Google Maps Place ID
  address: text("address").notNull(),
  city: varchar("city"),
  state: varchar("state"),
  zipCode: varchar("zip_code"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  geofenceRadiusMiles: decimal("geofence_radius_miles", { precision: 4, scale: 1 }).default('5.0'),
  subscriptionTier: subscriptionTierEnum("subscription_tier").default('starter'),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================================
// LMS & TRAINING TABLES
// ============================================================================

// Training modules (4 proprietary modules)
export const trainingModules = pgTable("training_modules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  moduleNumber: integer("module_number").notNull().unique(), // 1-4
  title: varchar("title").notNull(),
  description: text("description"),
  content: text("content").notNull(), // Rich text/markdown content
  estimatedMinutes: integer("estimated_minutes").default(20),
  orderIndex: integer("order_index").notNull(),
  isRequired: boolean("is_required").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Quiz questions for each module
export const quizQuestions = pgTable("quiz_questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  moduleId: varchar("module_id").notNull(),
  questionText: text("question_text").notNull(),
  questionType: varchar("question_type").default('multiple_choice'), // scenario-based
  options: jsonb("options").notNull(), // Array of answer options
  correctAnswer: varchar("correct_answer").notNull(),
  explanation: text("explanation"),
  orderIndex: integer("order_index").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// User progress tracking for training modules
export const userProgress = pgTable("user_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  moduleId: varchar("module_id").notNull(),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  quizScore: integer("quiz_score"), // Percentage 0-100
  quizAttempts: integer("quiz_attempts").default(0),
  passed: boolean("passed").default(false),
  lastAccessedAt: timestamp("last_accessed_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Staff certifications with expiration tracking
export const certifications = pgTable("certifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  status: certificationStatusEnum("status").notNull().default('not_certified'),
  certifiedAt: timestamp("certified_at"),
  expiresAt: timestamp("expires_at"),
  relatedIncidentCount: integer("related_incident_count").default(0),
  requiresRecertification: boolean("requires_recertification").default(false),
  recertificationReason: text("recertification_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================================
// INCIDENT & ALERT TABLES
// ============================================================================

// Incident reports with GPS and photo evidence
export const incidents = pgTable("incidents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: incidentCategoryEnum("category").notNull(),
  venueId: varchar("venue_id"),
  reporterId: varchar("reporter_id").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  address: text("address"),
  description: text("description"),
  photoUrls: jsonb("photo_urls"), // Array of object storage paths
  verificationStatus: verificationStatusEnum("verification_status").default('pending'),
  incidentTimestamp: timestamp("incident_timestamp").notNull(),
  reportedAt: timestamp("reported_at").defaultNow(),
  validatedAt: timestamp("validated_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Geofenced alerts for managers
export const alerts = pgTable("alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  incidentId: varchar("incident_id").notNull(),
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  severity: varchar("severity").default('standard'), // 'critical' or 'standard'
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  radiusMiles: decimal("radius_miles", { precision: 4, scale: 1 }).default('5.0'),
  publishedAt: timestamp("published_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Push notification subscriptions for PWA
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  endpoint: text("endpoint").notNull().unique(),
  p256dhKey: text("p256dh_key").notNull(),
  authKey: text("auth_key").notNull(),
  userAgent: text("user_agent"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================================
// RELATIONS
// ============================================================================

export const usersRelations = relations(users, ({ one, many }) => ({
  venue: one(venues, {
    fields: [users.venueId],
    references: [venues.id],
  }),
  certification: one(certifications, {
    fields: [users.id],
    references: [certifications.userId],
  }),
  progress: many(userProgress),
  incidents: many(incidents),
  pushSubscriptions: many(pushSubscriptions),
}));

export const venuesRelations = relations(venues, ({ many }) => ({
  staff: many(users),
  incidents: many(incidents),
}));

export const trainingModulesRelations = relations(trainingModules, ({ many }) => ({
  questions: many(quizQuestions),
  progress: many(userProgress),
}));

export const quizQuestionsRelations = relations(quizQuestions, ({ one }) => ({
  module: one(trainingModules, {
    fields: [quizQuestions.moduleId],
    references: [trainingModules.id],
  }),
}));

export const userProgressRelations = relations(userProgress, ({ one }) => ({
  user: one(users, {
    fields: [userProgress.userId],
    references: [users.id],
  }),
  module: one(trainingModules, {
    fields: [userProgress.moduleId],
    references: [trainingModules.id],
  }),
}));

export const certificationsRelations = relations(certifications, ({ one }) => ({
  user: one(users, {
    fields: [certifications.userId],
    references: [users.id],
  }),
}));

export const incidentsRelations = relations(incidents, ({ one }) => ({
  venue: one(venues, {
    fields: [incidents.venueId],
    references: [venues.id],
  }),
  reporter: one(users, {
    fields: [incidents.reporterId],
    references: [users.id],
  }),
  alert: one(alerts, {
    fields: [incidents.id],
    references: [alerts.incidentId],
  }),
}));

export const alertsRelations = relations(alerts, ({ one }) => ({
  incident: one(incidents, {
    fields: [alerts.incidentId],
    references: [incidents.id],
  }),
}));

export const pushSubscriptionsRelations = relations(pushSubscriptions, ({ one }) => ({
  user: one(users, {
    fields: [pushSubscriptions.userId],
    references: [users.id],
  }),
}));

// ============================================================================
// ZOD SCHEMAS & TYPES
// ============================================================================

// User types
export type UpsertUser = typeof users.$inferInsert;
export type InsertUser = UpsertUser; // Alias for compatibility
export type User = typeof users.$inferSelect;

// Venue types
export const insertVenueSchema = createInsertSchema(venues).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertVenue = z.infer<typeof insertVenueSchema>;
export type Venue = typeof venues.$inferSelect;

// Training module types
export const insertTrainingModuleSchema = createInsertSchema(trainingModules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertTrainingModule = z.infer<typeof insertTrainingModuleSchema>;
export type TrainingModule = typeof trainingModules.$inferSelect;

// Quiz question types
export const insertQuizQuestionSchema = createInsertSchema(quizQuestions).omit({
  id: true,
  createdAt: true,
});
export type InsertQuizQuestion = z.infer<typeof insertQuizQuestionSchema>;
export type QuizQuestion = typeof quizQuestions.$inferSelect;

// User progress types
export const insertUserProgressSchema = createInsertSchema(userProgress).omit({
  id: true,
});
export type InsertUserProgress = z.infer<typeof insertUserProgressSchema>;
export type UserProgress = typeof userProgress.$inferSelect;

// Certification types
export const insertCertificationSchema = createInsertSchema(certifications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCertification = z.infer<typeof insertCertificationSchema>;
export type Certification = typeof certifications.$inferSelect;

// Incident types
export const insertIncidentSchema = createInsertSchema(incidents).omit({
  id: true,
  reportedAt: true,
  createdAt: true,
});
export type InsertIncident = z.infer<typeof insertIncidentSchema>;
export type Incident = typeof incidents.$inferSelect;

// Alert types
export const insertAlertSchema = createInsertSchema(alerts).omit({
  id: true,
  publishedAt: true,
  createdAt: true,
});
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alerts.$inferSelect;

// Push subscription types
export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
