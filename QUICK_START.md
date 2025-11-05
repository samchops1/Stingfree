# 🚀 Sting Free - Quick Start Guide

## 1. First Time Setup

```bash
# Install dependencies
npm install

# Push database schema
npm run db:push

# Start development server
npm run dev
```

## 2. Seed Training Content

The app will automatically seed training modules on first run in development mode.

Or manually:
```bash
curl -X POST http://localhost:5000/api/seed
```

This creates:
- 4 comprehensive training modules with real educational content
- 20 scenario-based quiz questions
- Complete certification system

## 3. Test Push Notifications

### Setup VAPID Keys (Already Done)
The VAPID keys for push notifications are pre-configured in `.env.example`.

### Test the System

1. **Install the PWA**:
   - Open the app in Chrome/Edge
   - Wait for the install prompt (appears after 3 seconds)
   - Click "Install"
   - App will auto-request notification permission

2. **Test Notifications**:
   ```bash
   # After logging in, send a test notification
   curl -X POST http://localhost:5000/api/push/test \
     -H "Content-Type: application/json" \
     -H "Cookie: your-session-cookie"
   ```

3. **Test Geofenced Alerts**:
   - Create a staff/manager account
   - Submit an incident report as staff
   - Manager endpoint `/api/incidents/:id` to validate it
   - Push notifications sent to all managers within 5 miles

## 4. User Flows to Test

### Staff Member Flow
1. Login → See Training Dashboard
2. Click "Training Module 1"
3. Read content (beautiful markdown rendering)
4. Click "Take Quiz"
5. Answer 5 questions
6. Pass with 80%+ → Get certified ✅
7. Go to Account → Set Home Bar (Google Maps selection)
8. Click FAB → Report sting operation
9. GPS auto-captures → Add details → Submit

### Manager Flow
1. Login → Onboard venue with Google Maps (if first time)
2. Search for your bar/venue on Google Maps
3. Confirm venue selection
4. See dashboard with KPIs
5. Navigate to "Alerts"
6. See nearby incidents (geofenced)
7. Receive push notification when sting validated

## 5. Key Features to Explore

### ✨ Training System
- **Module 1**: Sting Operations (30 min)
- **Module 2**: ID Verification (35 min)
- **Module 3**: Loss Prevention (28 min)
- **Module 4**: Compliance (22 min)

Each has real, detailed educational content and scenario-based quizzes.

### 📱 Sting Reporting
- GPS location with accuracy display
- Simplified form focused on regulatory stings only
- No photo uploads (streamlined UX)
- Beautiful animations and feedback

### 🗺️ Google Maps Integration
- Venue selection during manager onboarding
- Search for bars/restaurants on Google Maps
- "Find Venues Near Me" button
- Staff can set their "Home Bar" in account settings
- Venues are linked to Google Places for rich data

### 🔔 Push Notifications
- Works when app installed to home screen
- Geofenced alerts (5-mile radius)
- Automatic when incidents validated
- Rich notifications with actions

### 🎯 Automatic Recertification
- Triggered when staff involved in incident
- Certification revoked automatically
- Staff must retake training
- Compliance audit trail created

## 6. PWA Features

When installed to home screen:
- **Offline mode** - Service worker caches content
- **Push notifications** - Real-time alerts
- **App-like experience** - Fullscreen, no browser chrome
- **Fast loading** - Cached assets

## 7. Database Schema

Already includes:
- ✅ Users & Venues
- ✅ Training Modules & Quizzes
- ✅ User Progress & Certifications
- ✅ Incidents & Alerts
- ✅ Push Subscriptions

## 8. Environment Variables

Copy `.env.example` to `.env` and update:
- `DATABASE_URL` - Your PostgreSQL connection
- `VITE_GOOGLE_MAPS_API_KEY` - Your Google Maps API key (required for venue selection)
- VAPID keys are pre-configured ✅

### Getting a Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/google/maps-apis/)
2. Create a new project or select an existing one
3. Enable these APIs:
   - Maps JavaScript API
   - Places API
4. Create credentials → API Key
5. Copy the API key to your `.env` file as `VITE_GOOGLE_MAPS_API_KEY`
6. (Optional) Restrict the API key to your domain for production

## 9. Troubleshooting

**Push notifications not working?**
- Make sure app is installed to home screen
- Check browser supports Web Push (Chrome, Edge, Firefox)
- Safari on iOS requires special handling (future enhancement)

**Location not capturing?**
- Grant location permission when prompted
- Use HTTPS (required for geolocation)
- Replit provides HTTPS by default ✅

**Training content not showing?**
- Run seed script: `POST /api/seed`
- Check database connection
- Verify modules were created

## 10. Production Deployment

For production:
1. Update VAPID keys (generate new ones)
2. Set `NODE_ENV=production`
3. Configure proper database (not dev DB)
4. Set up proper domain with HTTPS
5. Configure VAPID_MAILTO with real email

---

**That's it! You're ready to use Sting Free.** 🎉

Check `IMPLEMENTATION_SUMMARY.md` for complete technical details.
