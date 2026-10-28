# Development Roadmap

## MVP (this repository) — what's implemented

| Area | Delivered |
|---|---|
| Auth | Email/password registration & login, Google/Facebook OAuth2, JWT access + refresh, RBAC (customer / instructor / admin), admin bootstrap |
| Profiles | Customer profile (name, age, gender, phone, avatar, language); instructor profile, time zone, radius, document upload |
| Catalog | 12 categories, subjects, 5 age groups (seeded, admin-editable) |
| Offerings | Multiple services per instructor: hourly, package, group pricing; duration options; online / in-person / both; capacity |
| Search | Keyword, category, subject, age group, city, mode, price, rating, distance; sort; pagination |
| Map | Google Maps search with radius & "near me", instructor location management with geocoding |
| Availability | Recurring weekly, one-off, blocked periods/vacations, per-location, time-zone aware slot generation |
| Booking | 4-step wizard, live quote, deposit option, accept / reject / reschedule / cancel / attendance, refund policy, DB-level double-booking protection |
| Payments | Gateway abstraction (sandbox), deposit/full/balance/refund/payout ledger, payment history |
| Reviews | 1–5 stars + text after completed sessions, instructor responses, flagging, moderation |
| Realtime | Chat and push notifications over WebSocket; browser notifications; email (SMTP) and SMS seam; 24-h reminders |
| Calendar | In-app month calendar, `.ics` export (Google / Outlook) |
| Video | Meeting link generated on confirmation for online sessions (provider seam) |
| AI | Recommendations, price suggestions, availability insights, search assistant chatbot (heuristic, LLM-ready) |
| Admin | KPIs, reports (top instructors, revenue by category, customer growth, booking trends), approvals, catalog, reviews, disputes, payouts |
| UX | Responsive, light/dark mode, code-split routes |
| Ops | Dockerfiles, docker-compose, Kubernetes manifests (HPA, PDB, Key Vault CSI, ingress), GitHub Actions CI/CD |

## Phase 1 — Production readiness
- Real payment adapters: Stripe PaymentIntents (card, Apple Pay, Google Pay) with webhooks; PayPal Orders v2; Stripe Connect for payouts.
- Refresh-token rotation + Redis deny list; login rate limiting; email verification & password reset.
- ShedLock for jobs; STOMP broker relay / Azure Web PubSub.
- Integration tests with Testcontainers (PostgreSQL), Playwright E2E for the booking wizard.
- i18n (react-i18next) driven by `preferredLanguage`; accessibility audit (WCAG 2.1 AA).

## Phase 2 — Integrations
- Zoom / Microsoft Teams (Graph `onlineMeetings`) / Google Meet adapters selectable per instructor.
- Two-way Google Calendar & Outlook sync (OAuth, free/busy import into availability).
- Twilio / ACS SMS delivery, email templates (Thymeleaf), Web Push (VAPID) for background notifications.
- Blob Storage + CDN for media, antivirus scanning of uploads.

## Phase 3 — Intelligence & growth
- Azure OpenAI function-calling for the assistant (maps intents onto `SearchQuery`).
- Learning-to-rank recommendations from bookings, favorites, reviews and click-through.
- Dynamic pricing hints by demand/seasonality; availability optimisation from search demand heat-maps.
- Package/subscription management, gift cards, referral program, instructor storefront pages (SEO).

## Phase 4 — Scale
- PostGIS + Azure AI Search for geo/full-text; read replicas; Redis caching.
- Split hot paths (search, messaging) into separate services behind the same API gateway.
- Native mobile apps (React Native) reusing `api/` and types.
