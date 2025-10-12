Here’s a **concise, professional Product Requirements Document (PRD)** for your multi-tenant healthcare scheduling platform built 
with **React + Express + Better Auth + Prisma + Polar**.

---

# 🧾 Product Requirements Document (PRD)

## 1. Product Overview

### Product Name

**Medisched** (working name)

### Summary

Medisched is a **multi-tenant healthcare scheduling platform** that allows hospitals (organizations) to manage departments, service providers (doctors), and appointments.
Patients (members) can browse available time slots and book appointments directly with providers.
The system supports **role-based access**, **multi-organization isolation**, **automated onboarding after subscription (via Polar)**, and **email notifications** for bookings.
A **superuser** (admin) can oversee all organizations globally.

---

## 2. Goals & Objectives

### Goals

* Enable hospitals to self-onboard via subscription (Polar).
* Allow hospitals to create and manage departments and service providers.
* Enable patients to book time slots (events) with providers.
* Send automated email confirmations upon booking.
* Provide a global admin dashboard for oversight.

### Success Metrics

* < 1 minute average time from subscription to active organization setup.
* > 95% booking confirmation email delivery rate.
* 100% organization data isolation (no cross-tenant data leakage).
* < 500 ms average API response time for core routes.

---

## 3. Core Functionalities

### 3.1 Authentication and Authorization

* Implemented via **Better Auth**.
* Supports both:

  * **Organization plugin** for tenant-based roles (`owner`, `provider`, `member`).
  * **Admin plugin** for global superuser role (`ADMIN`).
* Secure session handling for all users.

**User Roles:**

| Role       | Scope        | Description                                                             |
| ---------- | ------------ | ----------------------------------------------------------------------- |
| `OWNER`    | Organization | Hospital administrator. Can manage departments, providers, and members. |
| `PROVIDER` | Organization | Doctor or service provider. Can manage their calendar and appointments. |
| `MEMBER`   | Organization | Patient or client. Can browse and book appointments.                    |
| `ADMIN`    | Global       | Platform-level superuser for oversight and moderation.                  |

---

### 3.2 Organization Lifecycle

#### Onboarding (via Polar)

* Upon successful subscription webhook event:

  * Automatically create a new **Organization** (hospital).
  * Assign the subscribing user as the **OWNER**.
* Organization has its own isolated data context:

  * Departments
  * Providers
  * Members
  * Events

---

### 3.3 Department Management

* Accessible by: **OWNER**
* Functions:

  * Create, list, and delete departments under the organization.
  * Each department can have multiple providers.

**API Example:**
`POST /departments` → `{ name, organizationId }`

---

### 3.4 Provider Management

* Accessible by: **OWNER**
* Functions:

  * Assign an existing user as a **PROVIDER**.
  * Providers belong to one department.
  * Providers can create their own time slots (events).

**API Example:**
`POST /providers` → `{ organizationId, departmentId, userId }`

---

### 3.5 Event (Calendar) Management

* Accessible by: **PROVIDER**
* Functions:

  * Create, list, and cancel events.
  * Events represent available time slots.
  * Each event can only be booked once.

**API Example:**
`POST /events` → `{ providerId, start, end, title }`

---

### 3.6 Booking System

* Accessible by: **MEMBER**
* Functions:

  * View available events.
  * Book an event (only if not booked).
  * Receive automatic email confirmation upon booking.

**API Example:**
`POST /bookings` → `{ eventId }`

**Email:**

* Sent via **Nodemailer** (or Resend, SendGrid, etc.)
* Subject: `"Your appointment with {providerName}"`
* Body: includes event title, date, and time.

---

### 3.7 Superuser Dashboard

* Accessible by: **ADMIN**
* Global visibility across all organizations.
* Functions:

  * List all organizations.
  * View their departments, providers, and bookings.
  * Read-only (for now).

**API Example:**
`GET /admin/overview`

---

## 4. Data Model Overview

| Entity                 | Description                                       | Relationships                                             |
| ---------------------- | ------------------------------------------------- | --------------------------------------------------------- |
| **User**               | A system user.                                    | Has global roles; linked to org memberships and bookings. |
| **Organization**       | A tenant (e.g., a hospital).                      | Has members, departments.                                 |
| **OrganizationMember** | Joins users and organizations with role metadata. | Links `User` ↔ `Organization`.                            |
| **Department**         | Subdivision of an organization.                   | Belongs to one organization, has providers.               |
| **Provider**           | A user with `provider` role.                      | Linked to `User`, belongs to a `Department`, has events.  |
| **Event**              | A provider’s time slot.                           | Belongs to a provider; may have one booking.              |
| **Booking**            | A confirmed appointment.                          | Belongs to a `User` (member) and an `Event`.              |

---

## 5. Technical Architecture

### Stack

* **Frontend:** React (Next.js optional in future phase)
* **Backend:** Node.js + Express
* **Database:** Prisma + PostgreSQL (SQLite for local dev)
* **Auth:** Better Auth (Organization + Admin plugins)
* **Payments:** Polar (subscription events)
* **Email:** Nodemailer (SMTP)
* **Deployment:** Vercel / Render / Railway

### Service Integrations

| Integration     | Purpose                                  |
| --------------- | ---------------------------------------- |
| **Better Auth** | Auth, roles, organization management     |
| **Polar**       | Subscriptions, webhook-driven onboarding |
| **Nodemailer**  | Email notifications                      |
| **Prisma**      | ORM for relational data                  |
| **Express**     | API layer for core logic                 |

---

## 6. User Journeys

### 6.1 Owner (Hospital)

1. Subscribes via Polar.
2. Organization auto-created → becomes OWNER.
3. Creates departments.
4. Invites providers.
5. Manages hospital schedule.

### 6.2 Provider (Doctor)

1. Invited by OWNER.
2. Logs in → sees department dashboard.
3. Creates available time slots.
4. Views booked appointments.

### 6.3 Member (Patient)

1. Joins organization as MEMBER.
2. Browses available events.
3. Books appointment.
4. Receives confirmation email.

### 6.4 Superuser (Admin)

1. Logs in with ADMIN account.
2. Views all organizations and data.
3. Monitors activity for compliance or debugging.

---

## 7. Non-Functional Requirements

| Category            | Requirement                                            |
| ------------------- | ------------------------------------------------------ |
| **Security**        | Role-based access; JWT/session managed by Better Auth  |
| **Scalability**     | Multi-tenant data isolation per organization           |
| **Reliability**     | Retry mechanism for failed email sends                 |
| **Performance**     | < 500 ms API response for most endpoints               |
| **Maintainability** | Modular architecture with service-level separation     |
| **Extensibility**   | Future: add payments per booking, reporting, analytics |

---

## 8. Future Enhancements (Next Phase)

* Admin UI dashboard with metrics
* Calendar UI integration using BigCalendar (React)
* Notifications via Telegram or SMS
* Role customization per organization
* Webhooks for 3rd-party EHR integrations

---

## 9. Acceptance Criteria

✅ Owner can create departments and providers.
✅ Provider can create events.
✅ Member can book events and receive confirmation emails.
✅ Admin can view global overview.
✅ Organizations and roles are isolated and secure.
✅ Polar subscription automatically triggers org creation.


----------------------------------------------------------------------------------

Perfect — this is a **realistic and very solid SaaS foundation**:
a multi-tenant system with organizations (hospitals), departments (sub-entities), service providers (doctors), and members (patients) who book appointments.

Let’s build the *core domain model and architecture* piece by piece so it’s fully type-safe, minimal, and scalable — without any UI “extras”.

---

## 🧩 **Core Domain Overview**

| Concept                       | Description                                       | Example                                 |
| ----------------------------- | ------------------------------------------------- | --------------------------------------- |
| **Organization**              | A tenant (e.g., a hospital)                       | *CityCare Hospital*                     |
| **Department**                | A subdivision of an organization                  | *Radiology*                             |
| **Service Provider (Doctor)** | A user with role `"PROVIDER"` within an org       | *Dr. Miller*                            |
| **Member (Patient)**          | A user with role `"MEMBER"` who can book services | *John Doe*                              |
| **Event**                     | A time slot created by a provider                 | *Dr. Miller’s appointment, 10:00–10:30* |
| **Booking**                   | A reservation by a member for an event            | *John booked Dr. Miller’s 10:00 slot*   |

---

## 🏗️ **Step 1: Better Auth Setup**

We extend the previous setup with a new role:

```ts
import { betterAuth } from "better-auth";
import { OrganizationPlugin } from "@better-auth/plugin-organization";
import { AdminPlugin } from "@better-auth/plugin-admin";

export const auth = betterAuth({
  secret: process.env.AUTH_SECRET!,
  plugins: [
    OrganizationPlugin({
      roles: ["owner", "provider", "member"], // 👈 new role: provider
    }),
    AdminPlugin({
      roles: ["ADMIN"], // global superuser
    }),
  ],
});
```

---

## 🗃️ **Step 2: Database (Prisma Schema)**

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  roles     String[] // global roles (e.g. ADMIN)
  orgMembers OrganizationMember[]
  bookings  Booking[]
}

model Organization {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  members   OrganizationMember[]
  departments Department[]
}

model OrganizationMember {
  id             String   @id @default(cuid())
  userId         String
  organizationId String
  role           String   // owner, provider, member

  user           User           @relation(fields: [userId], references: [id])
  organization   Organization   @relation(fields: [organizationId], references: [id])
}

model Department {
  id             String   @id @default(cuid())
  name           String
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  providers      Provider[]
}

model Provider {
  id           String   @id @default(cuid())
  userId       String
  departmentId String
  user         User       @relation(fields: [userId], references: [id])
  department   Department @relation(fields: [departmentId], references: [id])
  events       Event[]
}

model Event {
  id           String   @id @default(cuid())
  providerId   String
  start        DateTime
  end          DateTime
  title        String
  isBooked     Boolean  @default(false)
  provider     Provider @relation(fields: [providerId], references: [id])
  booking      Booking?
}

model Booking {
  id        String   @id @default(cuid())
  eventId   String   @unique
  memberId  String
  event     Event    @relation(fields: [eventId], references: [id])
  member    User     @relation(fields: [memberId], references: [id])
}
```

---

## ⚙️ **Step 3: Express Core Routes**

### ➤ 1. Create Department (only owner)

```ts
app.post("/departments", auth.middleware, async (req, res) => {
  const session = req.auth!;
  const { name, organizationId } = req.body;

  const member = await auth.organizations.getMember({
    userId: session.user.id,
    organizationId,
  });

  if (member?.role !== "owner") {
    return res.status(403).send("Only owners can create departments");
  }

  const department = await prisma.department.create({
    data: { name, organizationId },
  });

  res.json(department);
});
```

---

### ➤ 2. Assign Provider Role (owner only)

```ts
app.post("/providers", auth.middleware, async (req, res) => {
  const session = req.auth!;
  const { organizationId, departmentId, userId } = req.body;

  const member = await auth.organizations.getMember({
    userId: session.user.id,
    organizationId,
  });

  if (member?.role !== "owner") {
    return res.status(403).send("Only owners can assign providers");
  }

  await auth.organizations.updateMember({
    organizationId,
    userId,
    role: "provider",
  });

  const provider = await prisma.provider.create({
    data: { userId, departmentId },
  });

  res.json(provider);
});
```

---

### ➤ 3. Provider creates an Event

```ts
app.post("/events", auth.middleware, async (req, res) => {
  const session = req.auth!;
  const { providerId, start, end, title } = req.body;

  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    include: { user: true },
  });

  if (!provider || provider.userId !== session.user.id) {
    return res.status(403).send("Only the provider can create their events");
  }

  const event = await prisma.event.create({
    data: { providerId, start, end, title },
  });

  res.json(event);
});
```

---

### ➤ 4. Member books an Event (sends email)

```ts
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail", // or use Resend, Sendgrid, etc.
  auth: {
    user: process.env.EMAIL_USER!,
    pass: process.env.EMAIL_PASS!,
  },
});

app.post("/bookings", auth.middleware, async (req, res) => {
  const session = req.auth!;
  const { eventId } = req.body;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { provider: { include: { user: true } } },
  });

  if (!event || event.isBooked) {
    return res.status(400).send("Event not available");
  }

  const booking = await prisma.booking.create({
    data: {
      eventId,
      memberId: session.user.id,
    },
  });

  await prisma.event.update({
    where: { id: eventId },
    data: { isBooked: true },
  });

  // Send confirmation email
  await transporter.sendMail({
    from: process.env.EMAIL_USER!,
    to: session.user.email,
    subject: `Your appointment with ${event.provider.user.name}`,
    text: `You booked "${event.title}" on ${event.start.toLocaleString()}`,
  });

  res.json(booking);
});
```

---

## 👑 **Step 4: Superuser Dashboard (ADMIN)**

The global admin can list all orgs, departments, or bookings:

```ts
app.get("/admin/overview", auth.middleware, async (req, res) => {
  const session = req.auth!;
  if (!session.user.roles.includes("ADMIN")) {
    return res.status(403).send("Forbidden");
  }

  const data = await prisma.organization.findMany({
    include: { departments: { include: { providers: true } } },
  });

  res.json(data);
});
```

---

## 🧠 **Core Flow Summary**

1. User subscribes (Polar) → new **organization** (hospital) created → user becomes **owner**
2. Owner → creates **departments**
3. Owner → assigns **provider** role to users (doctors)
4. Provider → creates **events** (calendar slots)
5. Member → books events → confirmation email sent automatically
6. Superuser (ADMIN) → monitors all activity from **dashboard**

end of PRD
