# Client Booking Feature

## Overview

The Client Booking Feature allows users with the default USER role to browse organizations, departments, and providers, view available time slots, and book appointments. The system includes email notifications and prevents double-booking.

## Architecture

### User Flow

1. **Browse Organizations** → Select an enabled organization
2. **Select Department** → Choose a department within the organization
3. **Choose Provider** → View providers and their specializations
4. **View Calendar** → See available time slots (only non-booked events)
5. **Book Appointment** → Confirm booking and receive email confirmation

### Routes

#### Client Routes (Frontend)

```
/client/                                                                    - Organization listing
/client/organizations/:orgId                                                - Department listing
/client/organizations/:orgId/departments/:deptId                           - Provider listing
/client/organizations/:orgId/departments/:deptId/providers/:providerId     - Calendar & Booking
```

All routes are protected and require authentication.

#### API Endpoints (Backend)

```
GET  /api/client/organizations                                             - List all enabled organizations
GET  /api/client/organizations/:id                                         - Get organization details
GET  /api/client/organizations/:id/departments                             - List departments in organization
GET  /api/client/departments/:id                                           - Get department details
GET  /api/client/departments/:id/providers                                 - List providers in department
GET  /api/client/providers/:id                                             - Get provider details
GET  /api/client/providers/:id/available-events?date=YYYY-MM-DD            - Get available time slots
POST /api/client/bookings                                                  - Create a new booking
```

## Features

### 1. Organization Browsing
- Shows only **enabled** organizations
- Displays organization name, description, and department count
- Card-based UI with hover effects

### 2. Department Selection
- Lists all departments within selected organization
- Shows provider count per department
- Breadcrumb navigation back to organizations

### 3. Provider Selection
- Displays provider information:
  - Name
  - Specialization
  - Bio
  - Available appointment count
- Only shows providers with future available slots

### 4. Calendar View
- **Date Selector**: 7-day view showing available slot counts
- **Time Slot Cards**: Shows individual appointments with:
  - Title and description
  - Start/end time
  - Duration
  - Price (if set)
- **Real-time Availability**: Only shows non-booked slots
- Filters events by selected date

### 5. Booking System
- **Validation**:
  - Prevents booking past events
  - Checks if slot is still available
  - Ensures only one booking per event
- **Database Updates**:
  - Creates Booking record
  - Marks Event as booked (`isBooked = true`)
- **Email Notifications**:
  - Sends confirmation to client
  - Notifies provider of new booking

## Database Schema

### Updated Models

```prisma
model Organization {
  description   String?  // New: Organization description
  // ... other fields
}

model Department {
  description   String?  // New: Department description
  // ... other fields
}

model Provider {
  bio            String?  // New: Provider biography
  specialization String?  // New: Provider specialization
  // ... other fields
}

model Event {
  start       DateTime   // Existing: For calendar display
  end         DateTime   // Existing: For calendar display
  startTime   DateTime?  // New: For booking display
  endTime     DateTime?  // New: For booking display
  duration    Int?       // New: Duration in minutes
  price       Float?     // New: Optional price
  isBooked    Boolean    @default(false)
  // ... other fields
}

model Booking {
  status    String   @default("CONFIRMED")  // New: CONFIRMED, CANCELLED, COMPLETED
  // ... other fields
}
```

## Email Notifications

### Client Confirmation Email

Sent to client upon successful booking:
- Confirmation message
- Provider details
- Organization and department information
- Date and time details
- Duration and price
- Instructions for cancellation/rescheduling

### Provider Notification Email

Sent to provider when client books:
- New booking alert
- Client information (name and email)
- Service details
- Date and time
- Reminder to prepare

## UI Components

### Organization Cards
- Building icon
- Organization name and description
- Department count
- "Book Appointment" CTA button

### Department Cards
- Users icon
- Department name and description
- Provider count
- "View Providers" CTA button

### Provider Cards
- User avatar placeholder
- Provider name and specialization
- Biography snippet
- Available slots count
- "View Calendar" CTA button

### Time Slot Cards
- Service title and description
- Clock icon with time range
- Calendar icon with duration
- Price display (if applicable)
- "Book This Slot" CTA button

## Security & Permissions

### Client Endpoints
- **Authentication Required**: All client routes require active session
- **No Special Roles**: Any authenticated user can access
- **Organization Filtering**: Only enabled organizations are visible
- **Event Filtering**: Only future, non-booked events are shown

### Booking Creation
- Validates event availability
- Prevents double-booking
- Checks event is not in the past
- Uses transactions to ensure consistency

## Navigation

### Header Integration
All authenticated users see "Book Appointment" link in the header, providing easy access to the booking flow regardless of their role (USER, OWNER, PROVIDER, ADMIN).

### Breadcrumb Navigation
- Back to Organizations (from departments)
- Back to Departments (from providers)
- Back to Providers (from calendar)

## Error Handling

### Common Error Scenarios
- **No organizations available**: Displays message to wait
- **No departments**: Shows empty state
- **No providers**: Indicates no providers in department
- **No time slots**: Prompts to select different date
- **Slot no longer available**: Shows error toast
- **Past event booking**: Prevents with error message
- **Email failure**: Booking still succeeds, error logged

## Testing Checklist

### Client Flow Testing
- [ ] View list of organizations
- [ ] Navigate to organization departments
- [ ] Select department and view providers
- [ ] View provider calendar
- [ ] Select date and view available slots
- [ ] Book an appointment
- [ ] Verify booking confirmation
- [ ] Check email received

### Provider Perspective
- [ ] Create availability in calendar
- [ ] Verify event appears as available
- [ ] After client books, event shows as booked (red)
- [ ] View booking details in provider calendar
- [ ] Receive email notification

### Edge Cases
- [ ] Try booking past event (should fail)
- [ ] Try booking already booked slot (should fail)
- [ ] Multiple clients viewing same slot
- [ ] Email service failure (booking should succeed)
- [ ] Network interruption during booking

## Future Enhancements

### Potential Improvements
1. **Booking Management**:
   - Client dashboard to view all bookings
   - Cancel/reschedule functionality
   - Booking history

2. **Advanced Search**:
   - Filter providers by specialization
   - Search across organizations
   - Location-based filtering

3. **Enhanced Calendar**:
   - Week/month view for clients
   - Recurring availability for providers
   - Buffer time between appointments

4. **Payment Integration**:
   - Pay at time of booking
   - Deposit requirements
   - Refund policies

5. **Reminders**:
   - Email reminders before appointment
   - SMS notifications
   - Calendar invites (.ics files)

6. **Reviews & Ratings**:
   - Client feedback after appointments
   - Provider ratings
   - Testimonials

## API Usage Examples

### Browse Organizations
```javascript
const response = await fetch('http://localhost:3000/api/client/organizations', {
  credentials: 'include'
});
const organizations = await response.json();
```

### Get Available Events
```javascript
const response = await fetch(
  `http://localhost:3000/api/client/providers/${providerId}/available-events?date=2025-10-20`,
  { credentials: 'include' }
);
const events = await response.json();
```

### Create Booking
```javascript
const response = await fetch('http://localhost:3000/api/client/bookings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ eventId: 'event-uuid' })
});
const booking = await response.json();
```

## Troubleshooting

### Common Issues

**Issue**: No organizations showing
- **Solution**: Ensure organizations are enabled by admin

**Issue**: No available slots
- **Solution**: Provider needs to create availability in their calendar

**Issue**: Booking fails with "no longer available"
- **Solution**: Another client booked it first; refresh and select different slot

**Issue**: Email not received
- **Solution**: Check spam folder; verify Resend API key is configured

**Issue**: Provider calendar not updating
- **Solution**: Refresh page; ensure event has `isBooked: true` in database

## Configuration

### Required Environment Variables

```env
# Server (.env)
DATABASE_URL="file:C:/sqlite/db/express.db"
RESEND_API_KEY="your-resend-api-key"
CORS_ORIGIN="http://localhost:3001"
```

### Email Configuration

Update email sender in `apps/server/src/index.ts`:
```typescript
from: "noreply@yourdomain.com"  // Change to your verified domain
```

## Maintenance

### Regular Tasks
- Monitor booking success rate
- Review failed email logs
- Clean up past bookings
- Archive completed appointments
- Update provider availability

### Database Cleanup
Consider adding cron jobs to:
- Mark past bookings as COMPLETED
- Archive bookings older than 6 months
- Clean up cancelled events

