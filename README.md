# Day1

AI-powered conversation simulator for individuals and companies. Practice real-life conversations — discovery calls, objection handling, negotiations, interviews, and more — with realistic AI personas tailored to your product, industry, and use case.

---

## Overview

Day1 helps individuals and teams sharpen their conversation skills through immersive, AI-driven role-play scenarios. Practice against realistic personas, get real-time coaching, and build a shared knowledge base of company context so every scenario is grounded in your actual product and playbook.

Users can practice with pre-built platform scenarios or create custom simulations built around their company, product, and target audience.

---

## Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org) (App Router)
- **UI**: [Tailwind CSS](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) components
- **Animations**: [Framer Motion](https://www.framer.com/motion)
- **Backend / Auth**: [Supabase](https://supabase.com) (PostgreSQL + Auth)
- **AI**: [OpenAI](https://openai.com) GPT-4o / GPT-4o-mini
- **Voice / Avatar**: LiveAvatar (conversational streaming avatars), ElevenLabs voice
- **Icons**: [Lucide React](https://lucide.dev)

---

## Features

### Landing Page

- Responsive, mobile-first landing page with animated sections
- Sections: Hero, Features, Showcase, Personas, Process, Pricing, FAQ, CTA, Footer
- Conditional navbar: shows Dashboard / Profile / Logout for authenticated users, Sign In / Get Started for guests
- Animated mobile navigation drawer

### Authentication

- **Sign Up**: email, password, full name, position
- **Email Confirmation Flow**: toast prompt to confirm email; redirect to login after confirmation
- **Sign In**: email + password with password visibility toggle
- Protected routes via Supabase Auth

### Role-Based Access Control (RBAC)

- App-level roles: `admin`, `user`
- Workspace-level roles via `organization_members`
- `useRole()` hook for client-side role checking
- Admin-only UI elements (platform scenario delete, workspace management)

### Workspaces

- Multi-organization support via `organizations` and `organization_members`
- Switch between workspaces from the workspace switcher
- Workspace detail page with members, settings, and admin controls
- Active workspace scoped across scenarios, simulations, knowledge base, and analytics

### Profile Page

- Editable fields: **Full Name**, **Company**, **Position**
- Fetches from Supabase `profiles` table
- Updates both the database and auth user metadata

### Scenario Library

Two independent sections:

1. **My Custom Scenarios** — scenarios created by users in the active workspace
2. **Platform Scenarios** — pre-built case studies seeded by admins

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

Persistent 4-step form (auto-saves to `localStorage`):

1. **Your Company** — company name, product one-liner, full company & product brief
2. **Buyer Persona** — choose a preset or build a custom buyer
3. **Scenario Setup** — call type, difficulty, duration, optional backstory
4. **Review** — summary card, Save & Start or Save for Later

### Knowledge Base (Company Knowledge)

- Upload documents (PDF, DOCX, PPTX, TXT, MD, JSON, CSV)
- AI auto-classification of document type in bulk upload mode
- Website URL extraction for AI company profile
- Documents are chunked, embedded, and stored per workspace
- Deduplication at file, content, and chunk levels

### Simulation Modes

When a scenario is started, choose how to practice:

- **Video Call** — realistic streaming avatar buyer with video and audio
- **Voice Call** — audio-only AI buyer with live transcription
- **Text Chat** — WhatsApp-style chat practice

Simulation includes:
- Prep screen with buyer profile, background, and communication style tabs
- Real-time transcription
- Live coaching nudges and suggested next questions
- Session timer and checkpoint scoring

### AI Coaching & Analytics

- Real-time coaching overlay during simulations
- Checkpoint-based scoring aligned to your methodology or practice goals
- Post-call analysis page with completed sessions, scores, and feedback
- Per-workspace analytics and session history

### Responsive Design

- Mobile-first responsive layout
- Dashboard sidebar on desktop, sheet-based navigation on mobile
- Touch-friendly controls and tap targets throughout

---

## Database Schema (Supabase)

### Core tables

#### `profiles`
- `id` uuid PK → `auth.users`
- `full_name`, `email`, `company`, `position`
- `role` enum (`admin` | `user`) default `user`
- `organization_id` uuid FK → `organizations` (active workspace)
- `created_at` timestamptz

#### `organizations`
- `id` uuid PK
- `name`, `slug`, `plan`
- `logo_url`, `theme_color`, `theme_colors`, `email_domain`, `source_urls`
- `created_by` uuid FK → `auth.users`
- `created_at` timestamptz

#### `organization_members`
- `id` uuid PK
- `organization_id` uuid FK → `organizations`
- `user_id` uuid FK → `auth.users`
- `role` text (`admin` | `member`)
- `position` text

#### `custom_scenarios`
- `id` uuid PK
- `user_id` uuid FK → `auth.users`
- `organization_id` uuid FK → `organizations`
- `seller_company`, `seller_product`, `seller_description`
- `preset_persona_id`, `custom_persona` jsonb
- `scenario_type`, `difficulty`, `duration`, `context_note`, `name`
- `created_at` timestamptz
- RLS scoped by workspace membership

#### `platform_scenarios`
- Same shape as `custom_scenarios`
- `organization_id` nullable; visible to all workspace members
- Only admins can delete

#### `company_documents`
- `id` uuid PK
- `organization_id` uuid FK → `organizations`
- `name`, `content`, `doc_type`, `document_type`, `file_path`
- `file_hash`, `content_hash`
- `created_by` uuid FK → `auth.users`
- `created_at` timestamptz

#### `company_document_chunks`
- `id` uuid PK
- `document_id` uuid FK → `company_documents`
- `content`, `embedding` vector, `chunk_index`, `chunk_hash`

#### `simulation_sessions`
- `id` uuid PK
- `scenario_id`, `scenario_table` (`custom_scenarios` | `platform_scenarios`)
- `user_id` uuid FK → `auth.users`
- `organization_id` uuid FK → `organizations`
- `status`, `mode`, `started_at`, `ended_at`, `duration_seconds`
- `metadata` jsonb

---

## SQL Migration Files

| File | Purpose |
|---|---|
| `supabase/profiles.sql` | Create `profiles` table, roles, RLS, trigger |
| `supabase/organizations.sql` | Create `organizations` and `organization_members` |
| `supabase/custom_scenarios.sql` | Create `custom_scenarios` table + RLS |
| `supabase/platform_scenarios.sql` | Create `platform_scenarios` table + RLS |
| `supabase/company_documents.sql` | Create `company_documents` and `company_document_chunks` |
| `supabase/simulation_sessions.sql` | Create `simulation_sessions` table |
| `supabase/seed_platform_scenarios.sql` | Seed platform case studies |

---

## Getting Started

### Prerequisites
- Node.js 18+
- A Supabase project
- OpenAI API key
- (Optional) LiveAvatar and ElevenLabs credentials for video/voice simulation

### Environment Variables

Create a `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI
OPENAI_API_KEY=your_openai_key

# Live Avatar (video/voice calls)
NEXT_PUBLIC_APP_URL=https://your-production-url.com
LIVEAVATAR_API_KEY=your_liveavatar_key
LIVEAVATAR_AVATAR_ID=your_avatar_id

# ElevenLabs (voice synthesis)
ELEVENLABS_API_KEY=your_elevenlabs_key
ELEVENLABS_VOICE_ID=your_voice_id
```

### Run Migrations

In your Supabase SQL Editor, run in this order:

1. `supabase/profiles.sql`
2. `supabase/organizations.sql`
3. `supabase/custom_scenarios.sql`
4. `supabase/platform_scenarios.sql`
5. `supabase/company_documents.sql`
6. `supabase/simulation_sessions.sql`
7. `supabase/seed_platform_scenarios.sql`

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
      company-knowledge/   # Knowledge base document uploads & URL extraction
      workspace/           # Workspace list and workspace detail
      simulation/          # Simulation prep + video/voice/text call UI
      analysis/            # Session history and analytics
      profile/             # Editable profile page
      admin/               # Admin-only page
    page.tsx               # Landing page
  app/api/                 # Next.js API routes (auth, simulation, documents, etc.)
  components/
    cards/                 # Scenario cards, transcript messages
    landing/               # Landing page sections
    layout/                # Sidebar, TopNavbar, PageHeaderLogo
    ui/                    # shadcn/ui components
    workspace/             # Workspace management components
  hooks/
    useRole.ts             # Client-side role check
    useCoaching.ts         # Real-time coaching state
  lib/
    supabase/client.ts     # Supabase browser client
    vector-store.ts        # Embedding helpers
    extract-text.ts        # Document text extraction
  types/index.ts           # TypeScript interfaces
supabase/
  *.sql                    # Migration & seed files
```

---

## Important Notes

### LiveAvatar / Voice Calls
- LiveAvatar requires a public `NEXT_PUBLIC_APP_URL` because its servers call the LLM proxy endpoint.
- On localhost, the avatar can hear and transcribe user speech, but cannot receive agent responses.
- For full video/voice simulation, deploy to a publicly accessible URL.

### Knowledge Base
- Uploaded files are stored in a Supabase Storage bucket named `knowledge-base`.
- Each workspace gets its own folder inside the bucket.
- Documents are chunked and embedded automatically on upload.

### Workspace Scoping
- Scenarios, simulations, documents, and analytics are scoped to the user's active workspace (`organization_id`).
- A user can belong to multiple workspaces and switch between them from the workspace list.

---

## Admin Setup

To promote a user to app admin, update their role in Supabase:

```sql
update public.profiles
set role = 'admin'
where email = 'admin@example.com';
```

Admins gain access to:
- Admin sidebar link
- Platform scenario delete functionality
- Workspace creation and management

---

## License

MIT

