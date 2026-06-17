# SalesSimAI

AI-powered sales training simulator. Practice discovery calls, objection handling, and negotiations with realistic AI buyer personas tailored to your product and industry.

---

## Overview

SalesSimAI helps sales teams and individual reps sharpen their skills through immersive, AI-driven role-play scenarios. Users can either practice with pre-built platform scenarios or create their own custom simulations built around their actual company, product, and target buyers.

---

## Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org) (App Router)
- **UI**: [Tailwind CSS](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) components
- **Animations**: [Framer Motion](https://www.framer.com/motion)
- **Backend / Auth**: [Supabase](https://supabase.com) (PostgreSQL + Auth)
- **Icons**: [Lucide React](https://lucide.dev)

---

## Features

### Landing Page

- Responsive landing page with fixed navbar
- Sections: Hero, Features, Showcase, Pricing, FAQ, Footer
- Conditional navbar: shows Profile / Logout for authenticated users, Sign In / Get Started for guests
- Smooth scroll anchor links to each section

### Authentication

- **Sign Up**: email, password, full name, position
- **Email Confirmation Flow**: after sign-up, a toast prompts users to confirm their email; after confirmation, redirected to login
- **Sign In**: email + password with eye icon for password visibility toggle
- **Password Visibility Toggle**: Eye/EyeOff icons on all password fields
- Protected routes via Supabase Auth

### Role-Based Access Control (RBAC)

- Two roles: `admin` and `user`
- `app_role` enum in Supabase with values `admin`, `user`
- `useRole()` hook for client-side role checking
- Admin-only UI elements (e.g. sidebar link, platform scenario delete)
- RLS policies restrict data access by role

### Profile Page

- Editable fields: **Full Name**, **Company**, **Position** (e.g. CFO, Head of Sales)
- Fetches from Supabase `profiles` table
- Save updates both the database and auth user metadata
- Loading and success/error states

### Scenario Library

Two independent sections:

1. **My Custom Scenarios** — scenarios created by the logged-in user
2. **Platform Scenarios** — pre-built case studies seeded by the admin

Each scenario card shows:
- Name, difficulty badge, seller company
- Description, duration, buyer persona job title
- Tags (scenario type + seller company)
- **Start Simulation** button
- **Delete** button (with confirmation modal)
- Click the card body to open a **detail dialog** with full scenario brief

#### Search & Filters
- Full-text search across name and product description
- Difficulty pills: All / Beginner / Intermediate / Advanced / Expert

### Custom Scenario Creation Wizard

4-step persistent form (auto-saves to `localStorage`, survives refresh):

1. **Your Company**
   - Company name
   - Product one-liner
   - Full company & product brief (textarea with examples)

2. **Buyer Persona**
   - Toggle: pick from **Preset Personas** or **Build Your Own**
   - Presets: CFO, VP Procurement, CRO, CTO, Head of Sales
   - Custom: name, title, company, industry, personality, pain points

3. **Scenario Setup**
   - Call type grid: First Discovery, Objection Handling, Negotiation, Product Demo, Pitch, Win-Back, Renewal, Executive Presentation
   - Difficulty selector
   - Duration selector (10–40 min)
   - Optional context/backstory textarea

4. **Review**
   - Summary card showing the full scenario brief
   - Save & Start or Save for Later

### Platform Scenarios (Case Studies)

Pre-built discovery-call case studies stored in the database:

| Scenario | Buyer | Company | Industry |
|---|---|---|---|
| BloomCommerce First Discovery | Daniel Lim — Financial Controller | BloomCommerce | E-commerce |
| FastShip Logistics First Discovery | Sarah Wong — Finance Manager | FastShip Logistics | Logistics |
| NovaTech Solutions First Discovery | Kevin Tan — Financial Controller | NovaTech Solutions | B2B SaaS |
| StyleStreet Commerce First Discovery | Andrew Lee — Financial Controller | StyleStreet Commerce | Fashion E-commerce |

Each includes:
- Full seller description (Aspire brief)
- Complete buyer persona JSONB (pain points, goals, personality, company background, buyer background, booth intel)
- Context note with scenario setup and ground rules

### Detail Dialog (Card Click)

Clicking any scenario card opens a modal with:
- **What you're selling** — product one-liner + full company description
- **Buyer persona** — full profile, personality, pain points list
- **Call context** — scenario type badges + backstory

### Delete Confirmation

- Delete icon on every scenario card
- Confirmation modal: "Delete scenario? This will permanently remove [Name]. This action cannot be undone."
- **Cancel** or **Delete** (destructive button)
- Platform scenarios: delete button visible **only to admins**; non-admins see no trash icon
- Custom scenarios: always deletable by the owner

### Dashboard

- Responsive layout with Sidebar (desktop) and Top Navbar (mobile)
- Navigation: Scenarios, Simulation, Analytics, History, Profile, Admin (admin-only)
- Theme toggle (light/dark)

---

## Database Schema (Supabase)

### `profiles`
- `id` uuid PK → `auth.users`
- `full_name` text
- `email` text
- `role` enum (`admin` | `user`) default `user`
- `company` text
- `position` text
- `created_at` timestamptz

### `custom_scenarios`
- `id` uuid PK
- `user_id` uuid FK → `auth.users` (NOT NULL)
- `seller_company` text
- `seller_product` text
- `seller_description` text
- `preset_persona_id` text
- `custom_persona` jsonb
- `scenario_type` text
- `difficulty` text
- `duration` int
- `context_note` text
- `name` text
- `created_at` timestamptz
- RLS: users can only CRUD their own rows

### `platform_scenarios`
- `id` uuid PK
- `seller_company` text
- `seller_product` text
- `seller_description` text
- `preset_persona_id` text
- `custom_persona` jsonb
- `scenario_type` text
- `difficulty` text
- `duration` int
- `context_note` text
- `name` text
- `created_at` timestamptz
- RLS: anyone can view; only admins can delete

---

## SQL Migration Files

| File | Purpose |
|---|---|
| `supabase/profiles.sql` | Create `profiles` table, `app_role` enum, RLS policies, trigger |
| `supabase/custom_scenarios.sql` | Create `custom_scenarios` table + RLS |
| `supabase/platform_scenarios.sql` | Create `platform_scenarios` table + RLS |
| `supabase/seed_platform_scenarios.sql` | Seed INSERTs for 4 platform case studies |
| `supabase/update_role.sql` | Idempotent migration for role enum |
| `supabase/update_profile.sql` | Idempotent migration for `company` + `position` columns |

---

## Getting Started

### Prerequisites
- Node.js 18+
- A Supabase project

### Environment Variables

Create a `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Run Migrations

In your Supabase SQL Editor, run in this order:

1. `supabase/profiles.sql`
2. `supabase/custom_scenarios.sql`
3. `supabase/platform_scenarios.sql`
4. `supabase/seed_platform_scenarios.sql`

### Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
src/
  app/
    (dashboard)/           # Authenticated routes (layout with sidebar/navbar)
      scenarios/           # Scenario Library + Create Custom wizard
      profile/             # Editable profile page
      admin/               # Admin-only page
    page.tsx               # Landing page
  components/
    cards/
      CustomScenarioCard.tsx   # Scenario card with detail dialog + delete
    landing/               # Landing page sections
    layout/                # Sidebar, TopNavbar
    ui/                    # shadcn/ui components
  hooks/
    useRole.ts             # Client-side role check
  lib/
    data/mockData.ts       # Mock personas & legacy scenarios
    supabase/client.ts     # Supabase browser client
  types/index.ts           # TypeScript interfaces
supabase/
  *.sql                    # Migration & seed files
```

---

## Admin Setup

To promote a user to admin, update their role in Supabase:

```sql
update public.profiles
set role = 'admin'
where email = 'admin@example.com';
```

Admins gain access to:
- Admin sidebar link
- Platform scenario delete functionality

---

## License

MIT

