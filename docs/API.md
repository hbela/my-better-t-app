# Medisched API Documentation

## Overview

Medisched is a multi-tenant healthcare scheduling platform with role-based access control, automated email notifications, and subscription-based onboarding.

## Base URL

```
http://localhost:3000/api
```

## Authentication

All protected endpoints require a valid session cookie from Better Auth. The session is established after successful login via `/api/auth` endpoints.

## Roles

| Role | Scope | Description |
|------|-------|-------------|
| `owner` | Organization | Hospital administrator. Can manage departments, providers, and members. |
| `provider` | Organization | Doctor or service provider. Can manage their calendar and appointments. |
| `member` | Organization | Patient or client. Can browse and book appointments. |
| `ADMIN` | Global | Platform-level superuser for oversight and moderation. |

---

## Endpoints

### Authentication

Better Auth handles authentication at `/api/auth/*`. Refer to Better Auth documentation for detailed endpoints.

---

### Organizations

#### Get All Organizations (Public)

```http
GET /api/organizations
```

Returns a list of all organizations for signup/browsing.

**Response:**
```json
[
  {
    "id": "org_123",
    "name": "CityCare Hospital",
    "slug": "citycare-hospital",
    "logo": "https://..."
  }
]
```

---

### Departments

#### Create Department

```http
POST /api/departments
```

**Authorization:** Owner only

**Request Body:**
```json
{
  "name": "Cardiology",
  "organizationId": "org_123"
}
```

**Response:**
```json
{
  "id": "dept_123",
  "name": "Cardiology",
  "organizationId": "org_123",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

#### List Departments

```http
GET /api/departments?organizationId=org_123
```

**Authorization:** Authenticated users

**Query Parameters:**
- `organizationId` (required): Organization ID

**Response:**
```json
[
  {
    "id": "dept_123",
    "name": "Cardiology",
    "organizationId": "org_123",
    "providers": [
      {
        "id": "prov_123",
        "userId": "user_123",
        "user": {
          "id": "user_123",
          "name": "Dr. Smith",
          "email": "smith@example.com"
        }
      }
    ]
  }
]
```

#### Delete Department

```http
DELETE /api/departments/:id
```

**Authorization:** Owner only

**Response:**
```json
{
  "success": true
}
```

---

### Providers

#### Create Provider

```http
POST /api/providers
```

**Authorization:** Owner only

**Request Body:**
```json
{
  "organizationId": "org_123",
  "departmentId": "dept_123",
  "userId": "user_123"
}
```

This endpoint:
1. Creates or updates the user's organization membership with role `provider`
2. Creates a provider record linking the user to the department

**Response:**
```json
{
  "id": "prov_123",
  "userId": "user_123",
  "departmentId": "dept_123",
  "user": {
    "id": "user_123",
    "name": "Dr. Smith",
    "email": "smith@example.com"
  },
  "department": {
    "id": "dept_123",
    "name": "Cardiology"
  },
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

#### List Providers

```http
GET /api/providers?organizationId=org_123&departmentId=dept_123
```

**Authorization:** Authenticated users

**Query Parameters:**
- `organizationId` (required): Organization ID
- `departmentId` (optional): Filter by department

**Response:**
```json
[
  {
    "id": "prov_123",
    "userId": "user_123",
    "departmentId": "dept_123",
    "user": {
      "id": "user_123",
      "name": "Dr. Smith",
      "email": "smith@example.com",
      "image": "https://..."
    },
    "department": {
      "id": "dept_123",
      "name": "Cardiology"
    }
  }
]
```

#### Get Provider by ID

```http
GET /api/providers/:id
```

**Authorization:** Authenticated users

**Response:**
```json
{
  "id": "prov_123",
  "userId": "user_123",
  "user": {
    "id": "user_123",
    "name": "Dr. Smith",
    "email": "smith@example.com"
  },
  "department": {
    "id": "dept_123",
    "name": "Cardiology",
    "organization": {
      "id": "org_123",
      "name": "CityCare Hospital"
    }
  },
  "events": [
    {
      "id": "event_123",
      "title": "Consultation",
      "start": "2025-01-15T10:00:00.000Z",
      "end": "2025-01-15T10:30:00.000Z",
      "isBooked": false
    }
  ]
}
```

#### Delete Provider

```http
DELETE /api/providers/:id
```

**Authorization:** Owner only

**Response:**
```json
{
  "success": true
}
```

---

### Events

#### Create Event

```http
POST /api/events
```

**Authorization:** Provider only (must be the provider creating the event)

**Request Body:**
```json
{
  "providerId": "prov_123",
  "title": "Consultation",
  "description": "General health checkup",
  "start": "2025-01-15T10:00:00.000Z",
  "end": "2025-01-15T10:30:00.000Z"
}
```

**Response:**
```json
{
  "id": "event_123",
  "providerId": "prov_123",
  "title": "Consultation",
  "description": "General health checkup",
  "start": "2025-01-15T10:00:00.000Z",
  "end": "2025-01-15T10:30:00.000Z",
  "isBooked": false,
  "provider": {
    "id": "prov_123",
    "user": {
      "id": "user_123",
      "name": "Dr. Smith",
      "email": "smith@example.com"
    }
  },
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

#### List Events

```http
GET /api/events?providerId=prov_123&available=true
```

**Authorization:** Authenticated users

**Query Parameters:**
- `providerId` (optional): Filter by provider
- `departmentId` (optional): Filter by department
- `organizationId` (optional): Filter by organization
- `available` (optional): If `true`, only show available (not booked) future events

**Response:**
```json
[
  {
    "id": "event_123",
    "providerId": "prov_123",
    "title": "Consultation",
    "start": "2025-01-15T10:00:00.000Z",
    "end": "2025-01-15T10:30:00.000Z",
    "isBooked": false,
    "provider": {
      "user": {
        "name": "Dr. Smith"
      },
      "department": {
        "name": "Cardiology"
      }
    }
  }
]
```

#### Get Event by ID

```http
GET /api/events/:id
```

**Authorization:** Authenticated users

**Response:**
```json
{
  "id": "event_123",
  "providerId": "prov_123",
  "title": "Consultation",
  "description": "General health checkup",
  "start": "2025-01-15T10:00:00.000Z",
  "end": "2025-01-15T10:30:00.000Z",
  "isBooked": true,
  "provider": {
    "user": {
      "name": "Dr. Smith"
    },
    "department": {
      "name": "Cardiology",
      "organization": {
        "name": "CityCare Hospital"
      }
    }
  },
  "booking": {
    "id": "booking_123",
    "member": {
      "name": "John Doe"
    }
  }
}
```

#### Update Event

```http
PUT /api/events/:id
```

**Authorization:** Provider only (must be the provider who created the event)

**Request Body:**
```json
{
  "title": "Updated Consultation",
  "description": "Updated description",
  "start": "2025-01-15T11:00:00.000Z",
  "end": "2025-01-15T11:30:00.000Z"
}
```

**Notes:**
- Cannot update events that are already booked
- All fields are optional

**Response:**
```json
{
  "id": "event_123",
  "title": "Updated Consultation",
  "start": "2025-01-15T11:00:00.000Z",
  "end": "2025-01-15T11:30:00.000Z"
}
```

#### Delete Event

```http
DELETE /api/events/:id
```

**Authorization:** Provider only

**Notes:**
- Cannot delete events that are already booked

**Response:**
```json
{
  "success": true
}
```

---

### Bookings

#### Create Booking

```http
POST /api/bookings
```

**Authorization:** Member (any authenticated user)

**Request Body:**
```json
{
  "eventId": "event_123"
}
```

**Behavior:**
1. Creates a booking record
2. Marks the event as booked
3. Sends a confirmation email to the member via Resend

**Response:**
```json
{
  "id": "booking_123",
  "eventId": "event_123",
  "memberId": "user_456",
  "event": {
    "id": "event_123",
    "title": "Consultation",
    "start": "2025-01-15T10:00:00.000Z",
    "end": "2025-01-15T10:30:00.000Z",
    "provider": {
      "user": {
        "name": "Dr. Smith"
      },
      "department": {
        "name": "Cardiology",
        "organization": {
          "name": "CityCare Hospital"
        }
      }
    }
  },
  "member": {
    "id": "user_456",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

**Email Sent:**
```
Subject: Appointment Confirmation with Dr. Smith

Dear John Doe,

Your appointment has been successfully booked.

Appointment Details:
- Provider: Dr. Smith
- Title: Consultation
- Date: January 15, 2025
- Time: 10:00 AM - 10:30 AM
- Organization: CityCare Hospital
- Department: Cardiology

If you need to cancel or reschedule, please contact us.

Best regards,
CityCare Hospital
```

#### List Bookings

```http
GET /api/bookings?providerId=prov_123
```

**Authorization:** Authenticated users

**Query Parameters:**
- `providerId` (optional): Show bookings for a specific provider (must be the provider)
- `organizationId` (optional): Show all bookings for an organization (must be owner)
- No parameters: Shows the user's own bookings

**Response:**
```json
[
  {
    "id": "booking_123",
    "eventId": "event_123",
    "memberId": "user_456",
    "event": {
      "title": "Consultation",
      "start": "2025-01-15T10:00:00.000Z",
      "provider": {
        "user": {
          "name": "Dr. Smith"
        },
        "department": {
          "name": "Cardiology",
          "organization": {
            "name": "CityCare Hospital"
          }
        }
      }
    },
    "member": {
      "name": "John Doe",
      "email": "john@example.com"
    },
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
]
```

#### Get Booking by ID

```http
GET /api/bookings/:id
```

**Authorization:** Member or Provider associated with the booking

**Response:**
```json
{
  "id": "booking_123",
  "eventId": "event_123",
  "memberId": "user_456",
  "event": {
    "title": "Consultation",
    "start": "2025-01-15T10:00:00.000Z",
    "provider": {
      "user": {
        "name": "Dr. Smith"
      }
    }
  },
  "member": {
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

#### Cancel Booking

```http
DELETE /api/bookings/:id
```

**Authorization:** Member who made the booking

**Behavior:**
1. Deletes the booking record
2. Marks the event as available again

**Response:**
```json
{
  "success": true
}
```

---

### Admin Routes

All admin routes require the `ADMIN` system role.

#### Get Overview

```http
GET /api/admin/overview
```

**Authorization:** Admin only

**Response:**
```json
{
  "organizations": [
    {
      "id": "org_123",
      "name": "CityCare Hospital",
      "slug": "citycare-hospital",
      "members": [...],
      "departments": [
        {
          "id": "dept_123",
          "name": "Cardiology",
          "providers": [
            {
              "id": "prov_123",
              "user": {...},
              "events": [...]
            }
          ]
        }
      ]
    }
  ],
  "stats": {
    "totalOrganizations": 5,
    "totalDepartments": 15,
    "totalProviders": 42,
    "totalMembers": 250,
    "totalEvents": 1200,
    "totalBookings": 890
  }
}
```

#### List All Organizations

```http
GET /api/admin/organizations
```

**Authorization:** Admin only

**Response:**
```json
[
  {
    "id": "org_123",
    "name": "CityCare Hospital",
    "slug": "citycare-hospital",
    "members": [...],
    "departments": [...]
  }
]
```

#### Delete Organization

```http
DELETE /api/admin/organizations/:id
```

**Authorization:** Admin only

**Response:**
```json
{
  "success": true
}
```

---

### Webhooks

#### Polar Subscription Webhook

```http
POST /api/webhooks/polar
```

**Description:** Automatically creates an organization when a user subscribes via Polar.

**Expected Payload:**
```json
{
  "type": "subscription.created",
  "data": {
    "customer": {
      "id": "cust_123",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "metadata": {
      "organizationName": "John's Clinic"
    }
  }
}
```

**Behavior:**
1. Creates a new organization
2. Creates or finds the user by email
3. Assigns the user as the organization owner

**Response:**
```json
{
  "received": true
}
```

---

## Error Responses

All endpoints return standard HTTP status codes:

- `200` - Success
- `201` - Created
- `400` - Bad Request (missing or invalid parameters)
- `401` - Unauthorized (not authenticated)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

**Error Format:**
```json
{
  "error": "Error message describing what went wrong"
}
```

---

## Environment Variables

Required environment variables:

```env
# Server
PORT=3000

# Database
DATABASE_URL="file:C:/sqlite/db/express.db"

# Auth
AUTH_SECRET="your-secret-key"

# CORS
CORS_ORIGIN="http://localhost:5173"

# Email (Resend)
RESEND_API_KEY="re_your_key_here"
RESEND_FROM_EMAIL="onboarding@yourdomain.com"

# Webhooks (Optional)
POLAR_WEBHOOK_SECRET="your-webhook-secret"
```

---

## Testing the API

### Using cURL

#### Create a Department:
```bash
curl -X POST http://localhost:3000/api/departments \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{"name": "Cardiology", "organizationId": "org_123"}'
```

#### Book an Appointment:
```bash
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{"eventId": "event_123"}'
```

### Using Postman

1. Import the cURL commands or create requests manually
2. Set up session cookies after authentication
3. Test each endpoint with appropriate roles

---

## User Flows

### Hospital Owner Flow

1. Subscribe via Polar → Organization auto-created
2. Login → Assigned as owner
3. `POST /api/departments` → Create departments
4. `POST /api/providers` → Assign providers
5. Manage hospital operations

### Provider (Doctor) Flow

1. Get invited by owner → Assigned provider role
2. Login → Access provider dashboard
3. `POST /api/events` → Create time slots
4. `GET /api/bookings?providerId=xxx` → View appointments

### Member (Patient) Flow

1. Join organization → Assigned member role
2. Login → Browse providers
3. `GET /api/events?available=true` → View available slots
4. `POST /api/bookings` → Book appointment
5. Receive email confirmation

### Admin Flow

1. Login with ADMIN role
2. `GET /api/admin/overview` → View platform statistics
3. Monitor all organizations and activities
4. Manage platform-wide operations

---

## Next Steps

- [ ] Add calendar UI integration (React Big Calendar)
- [ ] Implement notification preferences
- [ ] Add SMS notifications (Twilio)
- [ ] Add payment per booking
- [ ] Implement reporting and analytics
- [ ] Add role customization per organization
- [ ] Integrate with 3rd-party EHR systems

