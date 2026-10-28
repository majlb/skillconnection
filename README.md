# SkillConnect

A marketplace connecting students, parents and customers with instructors and service providers —
search (list + Google Maps), book, pay, chat and review. Light/dark, fully responsive.

| | |
|---|---|
| Frontend | React 18 · TypeScript · Vite · Tailwind · TanStack Query · Google Maps · STOMP |
| Backend | Spring Boot 3.3 · Java 21 · Spring Security (JWT + OAuth2) · JPA · Flyway · WebSocket |
| Database | PostgreSQL 16 |
| Deploy | Docker · Kubernetes (AKS) · Azure (ACR, PostgreSQL Flexible Server, Key Vault, Files, Front Door) |

## Quick start

**Everything in Docker**

```bash
cp .env.example .env     # set JWT_SECRET (openssl rand -base64 48) and ADMIN_PASSWORD
docker compose up --build
```
Web http://localhost:3000 · Swagger http://localhost:8080/swagger-ui.html · Mailpit http://localhost:8025

**Dev mode**

```bash
# 1. Database
docker compose up -d postgres mailpit
# 2. API (port 8080)
cd backend && ADMIN_EMAIL=admin@local.test ADMIN_PASSWORD='ChangeMe123' mvn spring-boot:run
# 3. Web (port 5173, proxies /api and /ws)
cd frontend && cp .env.example .env.local && npm install && npm run dev
```

Requirements: Java 21, Maven 3.9+, Node 18+ (20 recommended), Docker.
Set `VITE_GOOGLE_MAPS_API_KEY` for maps and the `GOOGLE_*` / `FACEBOOK_*` OAuth variables for social login
(redirect URI: `{api-origin}/login/oauth2/code/{google|facebook}`).

New instructors start as **PENDING** and appear in search after an admin approves them (`/admin` → Instructor approvals).

## Documentation

| # | Deliverable | Location |
|---|---|---|
| 1 | System architecture | [docs/architecture.md](docs/architecture.md) |
| 2 | Database ERD | [docs/database.md](docs/database.md) |
| 3 | PostgreSQL schema | [V1__init_schema.sql](backend/src/main/resources/db/migration/V1__init_schema.sql), [V2 seed](backend/src/main/resources/db/migration/V2__seed_reference_data.sql) |
| 4 | Spring Boot backend structure | [backend/](backend) · [architecture §2, §5](docs/architecture.md) |
| 5 | React frontend structure | [frontend/](frontend) · [architecture §3, §5](docs/architecture.md) |
| 6 | REST API endpoints | [docs/api.md](docs/api.md) |
| 7 | JWT security implementation | [architecture §4](docs/architecture.md) · [security/](backend/src/main/java/com/skillconnect/security) |
| 8 | Responsive UI wireframes | [docs/ui-wireframes.md](docs/ui-wireframes.md) |
| 9 | Booking workflow diagram | [docs/booking-workflow.md](docs/booking-workflow.md) |
| 10 | Deployment (Docker + K8s + Azure) | [docs/deployment.md](docs/deployment.md) · [deploy/k8s/](deploy/k8s) |
| 11 | Project folder structure | [architecture §5](docs/architecture.md) |
| 12 | Roadmap & MVP | [docs/roadmap.md](docs/roadmap.md) |
