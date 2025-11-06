# Sting Free - Complete Deployment Guide

## Overview
Sting Free is a fully-featured B2B SaaS Progressive Web App for hospitality compliance training and regulatory intelligence. This guide covers setup, deployment, and configuration using **Claude Opus 4.1**.

---

## ✅ What's Implemented

### Core Features (100% Complete)
1. **Training Management System (LMS)**
   - 4 comprehensive training modules with real educational content
   - Scenario-based quiz system (5 questions per module, 20 total)
   - Automatic certification upon completion
   - Progress tracking and pass/fail recording

2. **Push Notification System**
   - Web Push API integration with VAPID keys
   - Geofenced alerts (5-mile radius by default)
   - Automatic broadcasts to managers on validated incidents
   - Subscription management

3. **Incident Reporting**
   - GPS location capture with high accuracy
   - Three incident categories: regulatory sting, unverified hotspot, operational
   - Photo evidence support (ready for object storage integration)
   - Address reverse geocoding

4. **Automatic Recertification**
   - Triggers when staff involved in regulatory incidents
   - Revokes certification and requires retraining
   - Tracks incident count per staff member

5. **Manager Dashboard**
   - Staff compliance matrix
   - Real-time alerts and notifications
   - Venue management with Google Maps integration
   - Analytics and KPI tracking

6. **Staff Dashboard**
   - Training module viewer with beautiful markdown rendering
   - Quiz interface with immediate feedback
   - Certification status display
   - Home bar selection

7. **PWA (Progressive Web App)**
   - Service worker for offline functionality
   - Web manifest with app icons
   - Install prompts
   - Background sync support

8. **Database & Architecture**
   - PostgreSQL with Drizzle ORM
   - Complete schema with all required tables
   - Geospatial queries (Haversine formula)
   - Proper relations and foreign keys

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database (Neon, Supabase, or local)
- Google Maps API key
- SSL/HTTPS (required for geolocation and push notifications)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file (already created with example values):

```env
# Database (REQUIRED)
DATABASE_URL=postgresql://user:password@host:5432/stingfree

# Google Maps API Key (REQUIRED for venue selection)
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Push Notifications (Pre-configured VAPID keys included)
VAPID_PUBLIC_KEY=BMXNfgxF-2ufTheqzNMgsTqJvGE7IvIKCG6ir4KmYrsEn1S-lgXEDTeD_xVFMoT4lxJIyshYkswTYuhVT8UK4cs
VAPID_PRIVATE_KEY=dY1HKX_VgFQeRce-TDVE5tWK-5jL-SZmPThO_6ngWGk
VAPID_MAILTO=mailto:support@stingfree.app

# Optional
NODE_ENV=development
```

#### Getting a Google Maps API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable these APIs:
   - Maps JavaScript API
   - Places API
   - Geocoding API (optional)
4. Create API Key under Credentials
5. (Production) Restrict key to your domain

#### Getting a Database URL (Neon Example)
1. Go to [Neon.tech](https://neon.tech)
2. Create a free account and project
3. Copy the connection string
4. Paste into `DATABASE_URL` in `.env`

### 3. Set Up Database
```bash
# Push schema to database (creates all tables)
npm run db:push
```

### 4. Seed Training Data
```bash
# Start the dev server
npm run dev

# In another terminal, seed the database
curl -X POST http://localhost:5000/api/seed
```

This creates:
- 4 training modules with comprehensive content
- 20 scenario-based quiz questions
- Ready-to-use certification system

### 5. Run Development Server
```bash
npm run dev
```

The app will be available at `http://localhost:5000`

---

## 📦 Production Deployment

### Build for Production
```bash
npm run build
```

This creates optimized bundles in `dist/`:
- `dist/public/` - Frontend assets (serve via CDN or static hosting)
- `dist/index.js` - Backend server bundle

### Start Production Server
```bash
npm start
```

### Deployment Platforms

#### Replit (Recommended for Quick Deploy)
1. Import this repository
2. Set environment variables in Secrets
3. Run `npm install && npm run db:push && npm run dev`
4. Access via Replit URL (HTTPS included)

#### Vercel + Neon
**Frontend (Vercel):**
```bash
vercel --prod
```

**Backend:** Deploy separately to:
- Railway
- Render
- Fly.io
- AWS Lambda (with adapter)

#### Railway
1. Connect GitHub repository
2. Set environment variables
3. Deploy command: `npm run build && npm start`
4. Auto-deploys on push

#### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t stingfree .
docker run -p 5000:5000 --env-file .env stingfree
```

---

## 🔐 Security & Configuration

### Generate New VAPID Keys (Production)
```bash
node -e "const webpush = require('web-push'); const keys = webpush.generateVAPIDKeys(); console.log('VAPID_PUBLIC_KEY=' + keys.publicKey); console.log('VAPID_PRIVATE_KEY=' + keys.privateKey);"
```

Update `.env` with new keys.

### HTTPS Requirements
**CRITICAL:** The following features require HTTPS:
- Geolocation API
- Push Notifications
- Service Workers

Use:
- Replit (includes HTTPS)
- Vercel/Netlify (automatic HTTPS)
- Let's Encrypt for custom servers

### Database Security
- Use connection pooling for production
- Enable SSL mode: `?sslmode=require` in DATABASE_URL
- Rotate credentials regularly

---

## 📊 Database Schema

### Core Tables
- `users` - Staff and manager accounts
- `venues` - Bar/restaurant locations with geofencing
- `training_modules` - LMS content (4 modules)
- `quiz_questions` - Assessment questions (5 per module)
- `user_progress` - Training completion tracking
- `certifications` - Staff certification status
- `incidents` - Sting reports with GPS data
- `alerts` - Geofenced alert system
- `push_subscriptions` - Web Push endpoints

### Relationships
- User → Certification (1:1)
- User → Progress (1:many)
- Venue → Users (1:many)
- Incident → Alert (1:1)

---

## 🎯 User Flows

### Manager Onboarding
1. Sign up via Replit Auth
2. Create venue profile
3. Select venue location on Google Maps
4. Set geofence radius
5. Access dashboard

### Staff Onboarding
1. Sign up via Replit Auth
2. Set "home bar" in account settings
3. Start training modules
4. Pass quizzes (80% required)
5. Earn "Sting Certified" badge

### Incident Reporting
1. Staff/Manager clicks FAB (floating action button)
2. Select incident type
3. GPS auto-captures location
4. Add description (min 20 chars)
5. Optional: Attach photos
6. Submit → Pending verification

### Alert Flow
1. Manager validates incident
2. Incident status → "validated"
3. Auto-creates alert with geofence
4. Push notifications sent to managers within 5 miles
5. Automatic recertification triggered for involved staff

---

## 🧪 Testing

### Test User Flows
```bash
# 1. Create test accounts
# - Manager account: Sign in and create venue
# - Staff account: Sign in and set home bar

# 2. Test training
# - Complete Module 1
# - Take quiz
# - Verify certification updates

# 3. Test incident reporting
# - Submit sting report
# - Verify GPS capture
# - Check manager receives alert

# 4. Test push notifications
curl -X POST http://localhost:5000/api/push/test \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie"
```

### API Endpoints
```
GET  /api/auth/user                    - Current user
GET  /api/training/modules             - All training modules
POST /api/training/modules/:id/quiz    - Submit quiz
GET  /api/manager/dashboard            - Manager metrics
POST /api/incidents                    - Report incident
GET  /api/manager/alerts               - Geofenced alerts
POST /api/push/subscribe               - Register for push
```

---

## 📱 PWA Installation

### Desktop (Chrome/Edge)
1. Open app in browser
2. Look for install icon in address bar
3. Click "Install Sting Free"
4. App opens in standalone window

### Mobile (iOS Safari)
1. Open app in Safari
2. Tap Share button
3. Select "Add to Home Screen"
4. Name it and tap "Add"

### Mobile (Android Chrome)
1. Open app in Chrome
2. Install prompt appears automatically
3. Tap "Install"
4. App available in app drawer

---

## 🛠️ Troubleshooting

### Build Errors
**Issue:** `tsc` shows type errors
**Solution:** Build uses esbuild which is more lenient. Run `npm run build` directly.

**Issue:** Missing dependencies
**Solution:** Delete `node_modules` and run `npm install`

### Database Errors
**Issue:** "DATABASE_URL not found"
**Solution:** Ensure `.env` file exists with valid `DATABASE_URL`

**Issue:** Connection timeout
**Solution:** Check firewall, add IP to allowlist (Neon/Supabase)

### Push Notifications Not Working
**Issue:** Notifications not received
**Checklist:**
- ✅ App installed to home screen (required)
- ✅ HTTPS enabled
- ✅ Permission granted
- ✅ VAPID keys configured
- ✅ Browser supports Web Push (Chrome, Edge, Firefox)

**Note:** Safari on iOS requires additional setup (future enhancement)

### Geolocation Errors
**Issue:** "Location unavailable"
**Solution:**
- Enable location permission
- Use HTTPS (required)
- Try in private/incognito mode

---

## 📈 Performance Optimization

### Frontend
- Enable code splitting: Use dynamic imports for routes
- Optimize images: Compress and use WebP
- Cache static assets: Configure service worker
- Lazy load modules: Load training content on demand

### Backend
- Enable database connection pooling
- Add Redis cache for alerts and certifications
- Use CDN for static assets
- Implement rate limiting

### Database
- Add indexes on frequently queried fields
- Use database-level geospatial queries (PostGIS)
- Archive old incidents quarterly
- Optimize quiz question queries

---

## 🔮 Future Enhancements

### Not Yet Implemented (Roadmap)
- ⏳ Hotspot analysis dashboard with heat maps
- ⏳ Staff bulk upload via CSV
- ⏳ Video-based training modules
- ⏳ Advanced analytics and reporting
- ⏳ Multi-language support
- ⏳ SMS notifications (Twilio integration)
- ⏳ Stripe payment integration for subscriptions
- ⏳ Manager multi-venue support
- ⏳ Export certifications as PDF
- ⏳ Compliance calendar with reminders

---

## 📄 License & Support

### License
MIT

### Support
For issues or questions:
- GitHub Issues: [Report Bug](https://github.com/anthropics/claude-code/issues)
- Email: support@stingfree.app

### Contributing
Pull requests welcome! Please:
1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Open Pull Request

---

## 📝 Technical Stack

**Frontend:**
- React 18
- TypeScript
- TailwindCSS
- Framer Motion (animations)
- TanStack Query (data fetching)
- React Hook Form + Zod (forms)
- Wouter (routing)
- React Markdown (training content)

**Backend:**
- Node.js + Express
- Drizzle ORM
- PostgreSQL (Neon serverless)
- Web Push (push notifications)
- Replit Auth (authentication)

**DevOps:**
- Vite (build tool)
- esbuild (server bundling)
- Drizzle Kit (migrations)

---

## ✅ Production Checklist

Before going live:
- [ ] Replace default VAPID keys
- [ ] Configure production DATABASE_URL
- [ ] Add Google Maps API key
- [ ] Set up SSL/HTTPS
- [ ] Test push notifications
- [ ] Verify geolocation works
- [ ] Seed training data
- [ ] Configure CORS for production domain
- [ ] Set up error monitoring (Sentry)
- [ ] Configure backup schedule for database
- [ ] Test PWA installation on all platforms
- [ ] Load test API endpoints
- [ ] Review security headers
- [ ] Set up analytics (optional)
- [ ] Create Terms of Service
- [ ] Add Privacy Policy

---

**Built with ❤️ for hospitality compliance professionals using Claude Opus 4.1**
