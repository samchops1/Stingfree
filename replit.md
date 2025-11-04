# Sting Free PWA - B2B Compliance Training & Regulatory Intelligence

**Status**: MVP Core Features Complete - Integration & Polish Phase

## Project Overview

Sting Free is a specialized B2B SaaS Progressive Web App for hospitality compliance training and regulatory risk management. It serves bars and restaurants by combining:

1. **Proprietary LMS**: "Sting Certified" 4-module training curriculum
2. **Real-Time Intelligence**: Geofenced regulatory alerts based on verified incidents
3. **Staff Compliance Tracking**: Automated certification status and incident correlation
4. **Quick Incident Reporting**: GPS-stamped reports with photo evidence

## Completed MVP Features

### Core Authentication & User Management
- ✅ Dual-role authentication (Manager/Staff) with Replit Auth
- ✅ Venue onboarding flow with geofence configuration
- ✅ Staff roster management page with certification status display
- ✅ Role-based routing and access control

### Manager Features
- ✅ Unified dashboard with metrics (certified staff, active alerts, compliance rate)
- ✅ Staff management page showing all venue staff with certification details
- ✅ Alerts page with active/archived views
- ✅ Incident tracking (backend complete, frontend integrated)

### Staff Features
- ✅ Training dashboard with certification badge and progress tracking
- ✅ 4-module LMS with quiz system (80% passing threshold)
- ✅ Automatic certification upon completing all required modules
- ✅ Training module viewer with content and quiz interface

### Backend Infrastructure
- ✅ PostgreSQL storage layer with Drizzle ORM
- ✅ Complete API endpoints for all CRUD operations
- ✅ Geofence calculation using Haversine formula
- ✅ Quiz grading and certification auto-generation logic
- ✅ Role-based middleware (requireManager, requireStaff)
- ✅ Seeded database with 4 training modules and quiz questions

## Recent Implementation

### Database Schema
Complete PostgreSQL schema with 11 tables:
- `users` - Replit Auth + dual-role (manager/staff)
- `venues` - Location data with geofence configuration
- `training_modules` - 4 proprietary training modules
- `quiz_questions` - Scenario-based assessments
- `user_progress` - Training completion tracking
- `certifications` - Status, expiration, incident counts
- `incidents` - GPS-stamped reports with verification workflow
- `alerts` - Geofenced notifications for managers

### Frontend Components (All Built)
**Core Components:**
- Landing Page with value proposition
- Manager Dashboard with metrics, alerts, compliance matrix
- Staff Dashboard with certification badge and training progress
- Training Module Viewer with quiz interface
- Incident Report Form with GPS and category selection
- Alerts Page with active/archived views
- Account Page with profile and logout

**UI Components:**
- BottomNav - Mobile-first tab navigation
- TopAppBar - Sticky header with notifications
- FAB - Floating Action Button for quick reporting
- MetricCard - Dashboard analytics display
- StatusBadge - Visual certification status indicators

### Design System
- **Primary Color**: Professional trust-building blue (HSL 210 85% 42%)
- **Typography**: Inter for UI, JetBrains Mono for codes/timestamps
- **Layout**: Mobile-first with 44px minimum touch targets
- **Spacing**: Consistent 4-6-8-12-16 scale
- **Status Colors**: Green (certified), Amber (expiring), Red (critical)

### Tech Stack
- **Frontend**: React + TypeScript, Wouter routing, TanStack Query
- **Backend**: Express + TypeScript (to be implemented)
- **Database**: PostgreSQL (Replit Managed) with Drizzle ORM
- **Auth**: Replit Auth with dual-role support
- **Storage**: Object Storage for incident photos (configured)
- **Payments**: Stripe integration (configured)

## Remaining MVP Tasks

### Object Storage Integration (Task 7)
- Connect incident report form to Object Storage
- Photo upload widget for incident evidence
- Photo gallery view in incident details

### Map Visualization (Task 8)
- Leaflet integration for geofenced alerts
- Map view on Alerts Page with radius circles
- Sting History page with incident markers
- Geofence visualization on venue config

### PWA Features (Task 9)
- Create manifest.json for installable app
- Service worker for offline training access
- Background sync for offline incident reports
- Push notifications for manager alerts

### Stripe Integration (Task 10)
- Subscription tier selection (Starter/Professional/Enterprise)
- Stripe Checkout integration
- Subscription management page
- Usage-based pricing by staff count
- Webhook handlers for subscription events

### Final Polish (Task 11)
- End-to-end testing for both roles
- Comprehensive error handling
- Performance optimization
- Architect code review

## Architecture Decisions

### Mobile-First PWA Approach
Chosen over native mobile app for:
- Single codebase deployment
- Faster iteration cycles
- Cross-platform compatibility
- No app store approval delays

### Dual-Role Authentication
Manager and Staff roles share the same app with different UIs:
- Managers: Dashboard, alerts, staff management
- Staff: Training, certification status, quick reporting
- Common: Incident reporting, account management

### Geofenced Alerts (Legal Compliance)
System delivers **historical intelligence**, NOT real-time obstruction:
- Server-side verification prevents instant "tip-offs"
- Alerts trigger only after incident validation
- Based on aggregated reports + public records
- Designed to comply with obstruction laws

### Training & Certification System
- 4 proprietary modules with micro-quizzing
- Scenario-based questions for engagement
- Automatic recertification triggers
- Direct incident-to-training correlation

## Development Guidelines

### Component Standards
- All interactive elements have `data-testid` attributes
- Mobile-first responsive design
- Minimum 44px touch targets
- Follow design_guidelines.md religiously
- Use Shadcn UI components exclusively

### Code Conventions
- Schema-first development in `shared/schema.ts`
- Storage interface pattern for data access
- Thin API routes with business logic in storage layer
- TanStack Query for all data fetching
- Form validation with react-hook-form + Zod

### Testing Requirements
- Playwright e2e tests for critical paths
- Test both manager and staff user journeys
- Include quiz submission and grading
- Verify incident reporting with GPS
- Test alert geofencing logic

## Project Structure
```
client/
  src/
    components/
      manager/         # Manager-specific components
        dashboard.tsx
      staff/           # Staff-specific components
        dashboard.tsx
      ui/              # Reusable UI components
        bottom-nav.tsx
        top-app-bar.tsx
        metric-card.tsx
        status-badge.tsx
        fab.tsx
      landing-page.tsx
      training-module-viewer.tsx
      incident-report-form.tsx
      alerts-page.tsx
      account-page.tsx
    hooks/
      useAuth.ts       # Authentication hook
    lib/
      authUtils.ts     # Auth helper functions
      queryClient.ts   # TanStack Query configuration
    App.tsx            # Main routing with role-based access
    index.css          # Design system tokens
    
server/
  routes.ts            # API endpoints (to be implemented)
  storage.ts           # Data access layer (to be implemented)
  
shared/
  schema.ts            # Complete database schema with types
```

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection (Replit managed)
- `SESSION_SECRET` - Session encryption
- `DEFAULT_OBJECT_STORAGE_BUCKET_ID` - Photo storage bucket
- `STRIPE_SECRET_KEY` - Payment processing (to be configured)
- `VITE_STRIPE_PUBLIC_KEY` - Frontend Stripe SDK (to be configured)

## User Preferences
- Follows design_guidelines.md for all UI work
- Mobile-first approach for hospitality workers
- Professional, trust-building design language
- Emphasis on data-driven compliance metrics
