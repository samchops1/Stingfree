# Sting Free PWA - Design Guidelines

## Design Approach

**Selected System**: Hybrid approach combining **Linear's clean professionalism** with **Material Design's mobile patterns** and **Notion's information hierarchy**

**Rationale**: This is a utility-focused, mission-critical B2B compliance tool requiring trustworthiness, clarity, and mobile-optimized efficiency. The design must convey professional reliability while enabling rapid access to alerts, training, and incident reporting.

---

## Typography System

**Font Stack**: 
- Primary: Inter (via Google Fonts CDN) - exceptional readability at small sizes, professional
- Monospace: JetBrains Mono (for codes, IDs, timestamps)

**Type Scale**:
- Page Titles: text-2xl font-bold (Manager Dashboard, Training Center)
- Section Headers: text-lg font-semibold (Alert Summary, Staff Roster)
- Card Titles: text-base font-semibold (Staff names, module titles)
- Body Text: text-sm font-normal (descriptions, training content)
- Metadata/Labels: text-xs font-medium uppercase tracking-wide (status badges, timestamps)
- Critical Alerts: text-base font-bold (notification headers)

**Mobile Optimization**: Maintain minimum 16px body text for mobile legibility; use font-semibold instead of font-light for better screen readability.

---

## Layout & Spacing System

**Core Spacing Units**: Tailwind primitives of 2, 4, 6, 8, 12, 16
- Component padding: p-4 (mobile), p-6 (tablet+)
- Card spacing: space-y-4 within cards, gap-4 between cards
- Section margins: mb-6 to mb-8
- Icon-text gaps: gap-2
- Form field spacing: space-y-3

**Layout Patterns**:

**Mobile-First Grid** (Manager Dashboard):
- Single column for mobile (default)
- 2-column grid at md: breakpoint for metric cards
- Maximum width: max-w-7xl with px-4 padding

**Navigation**:
- Bottom tab bar (fixed) with 3-4 primary sections - height: h-16
- Manager tabs: Dashboard, Staff, Alerts, Account
- Staff tabs: Training, My Status, Report, Profile
- Active state: bold text + accent indicator line

**Card System**:
- Consistent border radius: rounded-lg
- Subtle elevation: shadow-sm for standard cards, shadow-md for elevated/interactive cards
- Card padding: p-4 (mobile), p-6 (desktop)

**Touch Targets**: Minimum 44px height for all interactive elements (buttons, list items, form inputs)

---

## Component Library

### Navigation & Structure

**Top App Bar** (Manager views):
- Sticky header with venue name (text-lg font-semibold)
- Right-aligned notification bell icon with badge count
- Height: h-14, subtle bottom border

**Bottom Navigation** (Primary):
- Fixed position, backdrop blur effect
- Icon + label format (Heroicons outlined for inactive, filled for active)
- Safe area padding for mobile devices

**Floating Action Button (FAB)**:
- Staff view: Red "Report Incident" button (bottom-right, above nav bar)
- Size: 56x56px circular, shadow-lg, persistent across training/status views

### Dashboard Components

**Metric Cards**:
- Bordered cards with icon (top-left), large number (text-3xl font-bold), and label below
- Grid: 2-column on mobile (grid-cols-2 gap-4)
- Icons from Heroicons (shield-check, users, exclamation-triangle, clock)

**Alert Banner**:
- Full-width, appears at dashboard top when active alerts exist
- Compact design: icon + title + timestamp, tap to expand details
- Critical alerts: Red accent with pulse animation
- Standard alerts: Amber/yellow accent

**Staff Compliance Matrix**:
- Responsive table alternative: Card-based list on mobile
- Each staff card shows: Avatar/initials, name (text-base font-semibold), certification badge, and expiration countdown
- Quick-scan status indicators: Green checkmark (certified), red warning (expired), amber clock (expiring soon)

**Sting History Map View**:
- Full-width map component using Leaflet or similar
- Incident markers clustered by proximity
- Bottom sheet drawer: Swipe up to reveal incident list details
- Map height: h-64 on mobile, h-96 on tablet+

### Training & LMS Components

**Module Cards**:
- Horizontal cards with left-side progress indicator (vertical accent bar or circular progress)
- Title (text-base font-semibold), estimated time (text-xs), completion status
- Locked modules: Reduced opacity with lock icon overlay

**Quiz Interface**:
- Full-screen focus mode (hide navigation during active quiz)
- Question counter at top (text-sm)
- Large radio buttons or tap-cards for multiple choice (min-h-12 touch targets)
- Progress bar: Fixed to bottom, distinct from content

**Certification Badge**:
- Prominent display on staff profile/home screen
- Shield icon with "Sting Certified" text
- Expiration date clearly visible (text-xs)
- Visual state changes: Active (full color), Expiring (amber border pulse), Expired (grayscale)

### Forms & Input

**Quick Incident Report Form**:
- Large category buttons (grid-cols-2 gap-3 on mobile)
- Each button: Icon + label, min-h-24, full-width tap target
- Categories visually distinct: Regulatory (red icon), Hotspot (amber icon), Operational (blue icon)
- Photo upload: Camera icon button, preview thumbnail grid
- GPS indicator: Small chip showing "Location captured" with green dot

**Standard Form Fields**:
- Labels: text-sm font-medium mb-2
- Inputs: h-12 rounded-md border, focus ring accent
- Required field indicator: Red asterisk
- Helper text: text-xs mt-1

**Buttons**:
- Primary action: Solid fill, h-11, rounded-lg, font-semibold
- Secondary: Border style, same height
- Destructive: Red solid for critical actions
- Full-width on mobile forms, auto-width with px-6 on larger screens

### Data Visualization

**Charts** (Manager Dashboard):
- Simple, mobile-optimized bar/line charts using Chart.js or Recharts
- Restrict to 2-3 data series maximum for mobile clarity
- Interactive tooltips on tap
- Height: h-48 to h-64 range

**Status Indicators**:
- Dot badges: Inline circular indicators (w-2 h-2 rounded-full)
- Status chips: Pill-shaped with text (rounded-full px-3 py-1 text-xs)
- Color coding: Green (compliant/active), Red (critical/expired), Amber (warning), Gray (inactive)

---

## Visual Patterns

**Hierarchy Through Elevation**:
- Base level: Plain background
- Card level: shadow-sm
- Modal/drawer: shadow-lg with backdrop
- FAB: shadow-xl

**Information Density**:
- Manager views: Dense information with clear grouping, compact cards
- Staff views: Spacious, focus on one primary action per screen
- Use collapsible sections (accordions) for detailed data on mobile

**Empty States**:
- Centered icon (w-16 h-16), message (text-base), and action button
- Friendly but professional tone

**Loading States**:
- Skeleton screens matching card layouts for perceived performance
- Spinner only for forms/actions (not page loads)

---

## Mobile PWA Specific

**Install Prompt**: 
- Banner at top of first visit: "Install Sting Free for faster access"
- Dismissible, reappears after 7 days if not installed

**Offline Indicators**:
- Subtle banner when offline mode active
- Disable real-time features (alerts, reporting) with clear messaging

**Splash Screen**: 
- App icon centered on solid background during PWA load

---

## Accessibility & Interaction

- All interactive elements have visible focus states (ring-2 ring-offset-2)
- Form validation messages appear as text below fields with error icons
- Alert notifications include both visual and text indicators (no color-only communication)
- Minimum contrast ratio: 4.5:1 for normal text, 3:1 for large text
- Touch targets: Never smaller than 44x44px
- Swipe gestures: Optional enhancement, always provide button alternatives

---

## Role-Specific Design Variations

**Manager Interface**:
- Information-dense dashboards with multiple data points visible simultaneously
- Advanced controls (roster management, geofence settings) in dedicated sections
- Alert history with filtering and export capabilities

**Staff Interface**:
- Simplified, task-focused flows
- Prominent certification status always visible
- Training modules as primary focus with clear progression
- Quick access to incident reporting (FAB)